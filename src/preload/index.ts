/**
 * Preload — the ONLY bridge between the isolated renderer and the main process.
 *
 * WHY contextBridge: with contextIsolation on, the renderer can't touch Node or
 * ipcRenderer directly. We expose a single, typed `window.claudepad` object
 * whose methods are thin ipcRenderer.invoke wrappers. This keeps the attack
 * surface to exactly the ClaudePadBridge contract — nothing more leaks in.
 *
 * The implementation mirrors shared/bridge's ClaudePadBridge one-to-one, using
 * the shared IPC channel constants so names can never drift from the main side.
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig, ControllerState, Intent } from '../shared/domain'
import type {
  ClaudePadBridge,
  ExecuteResult,
  PermissionStatus,
  RuntimeStatus
} from '../shared/bridge'
import { IPC } from '../shared/bridge'

const bridge: ClaudePadBridge = {
  // Exposed synchronously so the renderer can branch on OS without a round-trip.
  platform: process.platform,

  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke(IPC.getConfig),

  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke(IPC.saveConfig, config),

  setEnabled: (enabled: boolean): Promise<void> => ipcRenderer.invoke(IPC.setEnabled, enabled),

  execute: (intents: Intent[]): Promise<ExecuteResult> => ipcRenderer.invoke(IPC.execute, intents),

  setArmed: (armed: boolean): Promise<void> => ipcRenderer.invoke(IPC.setArmed, armed),

  getRuntime: (): Promise<RuntimeStatus> => ipcRenderer.invoke(IPC.getRuntime),

  onControllerState: (cb: (state: ControllerState) => void): (() => void) => {
    const listener = (_e: unknown, state: ControllerState): void => cb(state)
    ipcRenderer.on(IPC.controllerState, listener)
    return () => ipcRenderer.removeListener(IPC.controllerState, listener)
  },

  onRuntimeStatus: (cb: (status: RuntimeStatus) => void): (() => void) => {
    const listener = (_e: unknown, status: RuntimeStatus): void => cb(status)
    ipcRenderer.on(IPC.runtimeStatus, listener)
    return () => ipcRenderer.removeListener(IPC.runtimeStatus, listener)
  },

  checkPermissions: (): Promise<PermissionStatus> => ipcRenderer.invoke(IPC.checkPermissions),

  openAccessibilitySettings: (): Promise<void> =>
    ipcRenderer.invoke(IPC.openAccessibilitySettings),

  pickPath: (kind: 'claudeDesktop' | 'terminal'): Promise<string | undefined> =>
    ipcRenderer.invoke(IPC.pickPath, kind)
}

// Expose under the well-known global the renderer's type augmentation declares.
contextBridge.exposeInMainWorld('claudepad', bridge)
