/**
 * Config persistence for the main process.
 *
 * WHY a thin wrapper around electron-store: the rest of main (ipc, executor)
 * should never see the storage library directly — they ask for a fully-formed
 * AppConfig and trust it. Centralising here also lets us be defensive about
 * partial / older on-disk configs by always merging over fresh defaults, so a
 * missing key added in a later version never crashes the app.
 *
 * NOTE on imports: electron-store v8 is CommonJS and ships a default export, so
 * we use `import Store from 'electron-store'`. Shared types are imported by
 * RELATIVE path because the main build (electron-vite / tsconfig.node) does not
 * resolve the `@shared` alias.
 */

import Store from 'electron-store'
import type { AppConfig } from '../shared/domain'
import { makeDefaultConfig } from '../shared/default-profile'

// The store is typed to AppConfig so reads/writes are checked against our domain.
// Seeding `defaults` means the very first launch already has a valid config on
// disk without any bootstrap code.
const store = new Store<AppConfig>({
  name: 'claudepad-config',
  defaults: makeDefaultConfig()
})

/**
 * Deep-ish merge of a persisted config over fresh defaults.
 *
 * WHY: electron-store's `defaults` only fills in top-level keys that are wholly
 * absent — if a nested object (e.g. `paths`) exists but is missing a sub-key,
 * or if a brand-new top-level key ships in a later version, the stored value
 * wins as-is. We re-establish invariants here: every field defined by the
 * current AppConfig shape is guaranteed present, while user data is preserved.
 */
function withDefaults(stored: Partial<AppConfig> | undefined): AppConfig {
  const defaults = makeDefaultConfig()
  if (!stored) return defaults
  return {
    ...defaults,
    ...stored,
    // Nested objects must be merged, not replaced, so new sub-keys survive.
    paths: { ...defaults.paths, ...(stored.paths ?? {}) },
    // Profiles are user-owned; only fall back to the built-in set if absent/empty.
    // Each surviving profile is migrated so features added in later versions
    // (e.g. the touchpad axis map) appear on configs saved before they existed.
    profiles:
      Array.isArray(stored.profiles) && stored.profiles.length > 0
        ? stored.profiles.map(migrateProfile)
        : defaults.profiles
  }
}

/**
 * Idempotently backfill newer profile features onto an older stored profile so
 * configs saved before a feature existed still get it. Currently:
 *  - a touchpad->cursor axis map (trackpad support), and
 *  - a Touchpad-button -> left-click binding.
 */
function migrateProfile(p: AppConfig['profiles'][number]): AppConfig['profiles'][number] {
  let axisMaps = Array.isArray(p.axisMaps) ? p.axisMaps : []
  let bindings = Array.isArray(p.bindings) ? p.bindings : []
  let changed = false

  if (!axisMaps.some((m) => m.source === 'touchpad')) {
    axisMaps = [
      ...axisMaps,
      { id: 'ax-touchpad-cursor', source: 'touchpad', target: 'cursor', speed: 18 }
    ]
    changed = true
  }

  if (!bindings.some((b) => b.input === 'Touchpad')) {
    bindings = [
      ...bindings,
      { id: 'b-touchpad-click', input: 'Touchpad', trigger: 'press', actionId: 'sys.leftClick' }
    ]
    changed = true
  }

  // Ensure the customActions array exists so the UI can rely on it.
  if (!Array.isArray(p.customActions)) {
    return { ...p, axisMaps, bindings, customActions: [] }
  }

  return changed ? { ...p, axisMaps, bindings } : p
}

/** Read the current config, normalised so all invariants hold. */
export function getConfig(): AppConfig {
  return withDefaults(store.store)
}

/** Persist a full config. Callers own the whole object (renderer edits it live). */
export function saveConfig(cfg: AppConfig): void {
  // Re-normalise on the way in too, so a malformed renderer payload can't rot
  // the on-disk file.
  store.store = withDefaults(cfg)
}

/**
 * Toggle the master enable switch without the renderer having to round-trip the
 * entire config. This is the hot path for the "pause everything" button.
 */
export function setEnabled(enabled: boolean): void {
  store.set('enabled', enabled)
}

/** Convenience accessor for the executor's app-launch resolution. */
export function getPaths(): AppConfig['paths'] {
  return getConfig().paths
}
