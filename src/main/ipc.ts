/**
 * IPC wiring — the single place the renderer's ClaudePadBridge is fulfilled.
 *
 * WHY centralise: every channel name lives in shared/bridge (`IPC`) so main and
 * preload can't drift. This module is the ONLY main-side code that knows about
 * ipcMain; store + executor stay pure and testable. Each handler is a thin
 * adapter that delegates to those modules and shapes the response the bridge
 * type promises.
 */

import { ipcMain, dialog, shell, systemPreferences } from 'electron'
import type { AppConfig, Intent } from '../shared/domain'
import type { ExecuteResult, PermissionStatus, RuntimeStatus } from '../shared/bridge'
import { IPC } from '../shared/bridge'
import * as store from './store'
import { executeIntents } from './executor'
import type { GamepadService } from './gamepad'

/**
 * Register every IPC handler. Call ONCE, before the first window is created, so
 * the renderer never invokes a channel that isn't listening yet.
 *
 * `service` is the main-process controller loop — config mutations are pushed
 * into it so the running engine always uses the latest profile/enabled state.
 */
export function registerIpc(service: GamepadService): void {
  // --- Config -------------------------------------------------------------
  ipcMain.handle(IPC.getConfig, (): AppConfig => store.getConfig())

  ipcMain.handle(IPC.saveConfig, (_evt, cfg: AppConfig): void => {
    store.saveConfig(cfg)
    service.updateConfig(store.getConfig())
  })

  ipcMain.handle(IPC.setEnabled, (_evt, enabled: boolean): void => {
    store.setEnabled(enabled)
    service.updateConfig(store.getConfig())
  })

  // --- Runtime (controller loop) -----------------------------------------
  ipcMain.handle(IPC.setArmed, (_evt, armed: boolean): void => {
    service.setArmed(armed)
  })

  ipcMain.handle(IPC.getRuntime, (): RuntimeStatus => service.status())

  // --- Actuation ----------------------------------------------------------
  // We always read the LIVE config here (not a renderer-supplied copy) so path
  // lookups for launches reflect the latest saved settings. Errors are returned
  // as data (ExecuteResult) rather than thrown, so a single bad intent batch
  // never rejects the renderer's invoke in a way it can't recover from.
  ipcMain.handle(IPC.execute, async (_evt, intents: Intent[]): Promise<ExecuteResult> => {
    try {
      await executeIntents(intents, store.getConfig())
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // --- Permissions --------------------------------------------------------
  // macOS gates synthetic input behind Accessibility trust. Elsewhere there is
  // no equivalent gate, so we report accessibility:true to keep onboarding flow
  // uniform.
  ipcMain.handle(IPC.checkPermissions, (): PermissionStatus => {
    if (process.platform === 'darwin') {
      // `false` = do NOT prompt; we only want to READ current status here and
      // let the UI decide when to nudge the user to settings.
      const accessibility = systemPreferences.isTrustedAccessibilityClient(false)
      return { accessibility, platform: process.platform }
    }
    return { accessibility: true, platform: process.platform }
  })

  ipcMain.handle(IPC.openAccessibilitySettings, async (): Promise<void> => {
    if (process.platform === 'darwin') {
      // Deep-link straight to the Accessibility pane so the user isn't hunting
      // through System Settings.
      await shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
      )
    }
    // No-op on other platforms — the renderer knows not to surface the button.
  })

  // --- File picker --------------------------------------------------------
  ipcMain.handle(
    IPC.pickPath,
    async (_evt, _kind: 'claudeDesktop' | 'terminal'): Promise<string | undefined> => {
      // On macOS apps are .app bundles (dir-like); 'openFile' + treatPackageAsDirectory:false
      // lets the user select the bundle itself. Other platforms pick an executable.
      const result = await dialog.showOpenDialog({
        title: 'Choose application',
        properties: ['openFile'],
        // Let users pick a .app bundle on macOS as a single selectable file.
        ...(process.platform === 'darwin' ? { message: 'Select an app' } : {})
      })
      if (result.canceled || result.filePaths.length === 0) return undefined
      return result.filePaths[0]
    }
  )
}
