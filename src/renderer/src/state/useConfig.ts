import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppConfig, Profile } from '@shared/domain'
import { makeDefaultConfig, DEFAULT_PROFILE_ID } from '@shared/default-profile'

/**
 * Single source of truth for the persisted AppConfig in the renderer.
 *
 * - Loads once from window.claudepad.getConfig().
 * - Any mutation updates React state immediately (optimistic) and persists via
 *   window.claudepad.saveConfig(). We debounce saves so dragging a slider
 *   doesn't hammer disk 60x/sec.
 * - Exposes the derived `activeProfile` plus focused mutators the pages use.
 */

export interface UseConfigResult {
  config: AppConfig | null
  loading: boolean
  activeProfile: Profile | null
  /** Replace the active profile with the result of `mut(profile)`. */
  updateProfile: (mut: (p: Profile) => Profile) => void
  /** Replace an arbitrary profile by id. */
  updateProfileById: (id: string, mut: (p: Profile) => Profile) => void
  setEnabled: (enabled: boolean) => void
  setPaths: (paths: Partial<AppConfig['paths']>) => void
  completeOnboarding: () => void
  setActiveProfileId: (id: string) => void
  /** Patch arbitrary top-level config fields. */
  patchConfig: (patch: Partial<AppConfig>) => void
  /** Force an immediate flush to disk (bypasses debounce). */
  save: () => Promise<void>
}

const SAVE_DEBOUNCE_MS = 250

export function useConfig(): UseConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Latest config kept in a ref so debounced/immediate saves always flush the
  // freshest value regardless of React batching.
  const latest = useRef<AppConfig | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const loaded = await window.claudepad.getConfig()
        if (!alive) return
        setConfig(loaded)
        latest.current = loaded
      } catch {
        // If the bridge fails for any reason, fall back to defaults so the UI
        // still renders (dev / first run).
        const fallback = makeDefaultConfig()
        if (!alive) return
        setConfig(fallback)
        latest.current = fallback
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    if (latest.current) {
      try {
        await window.claudepad.saveConfig(latest.current)
      } catch {
        /* best-effort persistence */
      }
    }
  }, [])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flush()
    }, SAVE_DEBOUNCE_MS)
  }, [flush])

  // Central mutation helper: updates state + ref + schedules persistence.
  const apply = useCallback(
    (mut: (c: AppConfig) => AppConfig) => {
      setConfig((prev) => {
        if (!prev) return prev
        const next = mut(prev)
        latest.current = next
        scheduleSave()
        return next
      })
    },
    [scheduleSave]
  )

  const updateProfileById = useCallback(
    (id: string, mut: (p: Profile) => Profile) => {
      apply((c) => ({
        ...c,
        profiles: c.profiles.map((p) => (p.id === id ? mut(p) : p))
      }))
    },
    [apply]
  )

  const updateProfile = useCallback(
    (mut: (p: Profile) => Profile) => {
      const id = latest.current?.activeProfileId ?? DEFAULT_PROFILE_ID
      updateProfileById(id, mut)
    },
    [updateProfileById]
  )

  const setEnabled = useCallback(
    (enabled: boolean) => {
      apply((c) => ({ ...c, enabled }))
      // The main process also tracks enabled for a global kill-switch.
      window.claudepad.setEnabled(enabled).catch(() => {})
    },
    [apply]
  )

  const setPaths = useCallback(
    (paths: Partial<AppConfig['paths']>) => {
      apply((c) => ({ ...c, paths: { ...c.paths, ...paths } }))
    },
    [apply]
  )

  const completeOnboarding = useCallback(() => {
    apply((c) => ({ ...c, onboardingComplete: true }))
    // Onboarding completion is important — flush immediately.
    setTimeout(() => void flush(), 0)
  }, [apply, flush])

  const setActiveProfileId = useCallback(
    (id: string) => apply((c) => ({ ...c, activeProfileId: id })),
    [apply]
  )

  const patchConfig = useCallback(
    (patch: Partial<AppConfig>) => apply((c) => ({ ...c, ...patch })),
    [apply]
  )

  const activeProfile = useMemo(() => {
    if (!config) return null
    return (
      config.profiles.find((p) => p.id === config.activeProfileId) ??
      config.profiles[0] ??
      null
    )
  }, [config])

  // Flush on unmount so in-flight edits aren't lost.
  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  return {
    config,
    loading,
    activeProfile,
    updateProfile,
    updateProfileById,
    setEnabled,
    setPaths,
    completeOnboarding,
    setActiveProfileId,
    patchConfig,
    save: flush
  }
}
