/**
 * Main-process entry point.
 *
 * Responsibilities: create the window, start the focus-independent controller
 * service (SDL), and register IPC. The GamepadService is the reason the app
 * actually works while another app (Claude) is focused — it reads the pad and
 * actuates from the main process, not the renderer.
 */

import { app, BrowserWindow } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ControllerState } from '../shared/domain'
import type { RuntimeStatus } from '../shared/bridge'
import { IPC } from '../shared/bridge'
import { registerIpc } from './ipc'
import * as store from './store'
import { GamepadService } from './gamepad'

// The package is ESM ("type":"module"), so __dirname/__filename don't exist.
const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null
let service: GamepadService | null = null

/** Push a payload to the renderer if a live window exists. */
function sendToRenderer(channel: string, payload: unknown): void {
  const wc = mainWindow?.webContents
  if (wc && !wc.isDestroyed()) wc.send(channel, payload)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  createWindow()

  // The controller service: reads SDL, runs the pure engine, actuates. It pushes
  // live state + status to whichever window is open.
  service = new GamepadService({
    getConfig: () => store.getConfig(),
    sendControllerState: (state: ControllerState) => sendToRenderer(IPC.controllerState, state),
    sendRuntimeStatus: (status: RuntimeStatus) => sendToRenderer(IPC.runtimeStatus, status)
  })

  registerIpc(service)
  await service.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  service?.stop()
})
