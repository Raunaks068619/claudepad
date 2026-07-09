/**
 * The IPC contract between renderer and main.
 *
 * Bounded-context boundary:
 *   RENDERER owns: reading the gamepad + running the mapping engine (pure).
 *   MAIN owns:     actuating Intents on the OS + persisting config + perms.
 *
 * The renderer never touches nut.js or the filesystem; the main process never
 * knows about the Gamepad API. They only exchange the types below.
 */

import type { AppConfig, ControllerState, Intent } from './domain'

export interface PermissionStatus {
  /** macOS Accessibility (required to synthesize input). Always true off-mac. */
  accessibility: boolean
  platform: NodeJS.Platform
}

export interface ExecuteResult {
  ok: boolean
  error?: string
}

/** Live runtime status of the main-process controller service. */
export interface RuntimeStatus {
  /** Master switch persisted in config. */
  enabled: boolean
  /** Safety gate the user toggles; actuation requires enabled && armed. */
  armed: boolean
  /** Is a controller currently connected (as seen by the OS/SDL). */
  connected: boolean
  /** Human-readable controller name, or null. */
  controllerName: string | null
}

/** Exposed on `window.claudepad` by the preload script. */
export interface ClaudePadBridge {
  platform: NodeJS.Platform
  getConfig(): Promise<AppConfig>
  saveConfig(config: AppConfig): Promise<void>
  setEnabled(enabled: boolean): Promise<void>
  /**
   * Escape hatch: actuate a batch of intents directly. Retained for tests /
   * manual triggers. In normal operation the MAIN process reads the controller
   * and actuates on its own (focus-independent) — the renderer does NOT run the
   * engine anymore.
   */
  execute(intents: Intent[]): Promise<ExecuteResult>
  /** Toggle the safety gate. Main actuates only while enabled && armed. */
  setArmed(armed: boolean): Promise<void>
  /** Current runtime status (armed/enabled/connected/controller name). */
  getRuntime(): Promise<RuntimeStatus>
  /**
   * Subscribe to the live controller-state feed pushed by the main process.
   * This is the single source of truth for the Tester UI (works regardless of
   * which app is focused). Returns an unsubscribe function.
   */
  onControllerState(cb: (state: ControllerState) => void): () => void
  /** Subscribe to runtime-status changes (connect/disconnect, armed). */
  onRuntimeStatus(cb: (status: RuntimeStatus) => void): () => void
  /** Check OS-level permissions (used early in onboarding). */
  checkPermissions(): Promise<PermissionStatus>
  /** Open the OS Accessibility settings pane (macOS). No-op elsewhere. */
  openAccessibilitySettings(): Promise<void>
  /** Native file picker to choose an app/executable path. */
  pickPath(kind: 'claudeDesktop' | 'terminal'): Promise<string | undefined>
}

/** IPC channel names — single source of truth for main + preload. */
export const IPC = {
  getConfig: 'cp:getConfig',
  saveConfig: 'cp:saveConfig',
  setEnabled: 'cp:setEnabled',
  execute: 'cp:execute',
  setArmed: 'cp:setArmed',
  getRuntime: 'cp:getRuntime',
  checkPermissions: 'cp:checkPermissions',
  openAccessibilitySettings: 'cp:openAccessibilitySettings',
  pickPath: 'cp:pickPath',
  // main -> renderer push channels (events, not invoke)
  controllerState: 'cp:controllerState',
  runtimeStatus: 'cp:runtimeStatus'
} as const
