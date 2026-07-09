/**
 * Input worker — runs in an Electron utilityProcess (plain Node, NOT the main
 * process). Its ONLY job: read the controller via SDL and post normalized
 * ControllerState snapshots to the parent. It never touches nut.js, config, or
 * the renderer — that all stays in the parent (GamepadService).
 *
 * Isolation buys us two things:
 *   1. SDL can't collide with Electron's macOS run loop (that crash is why the
 *      previous in-main-process approach failed).
 *   2. If SDL ever hard-crashes, only this worker dies; the app UI survives and
 *      GamepadService can respawn it.
 */

import {
  toControllerState,
  makeTriggerCalibrator,
  type SdlModule,
  type SdlControllerInstance,
  type WorkerMessage
} from './sdl-read'

const TICK_MS = 16 // ~60Hz

// This worker is launched with child_process.fork under the SYSTEM Node (not
// Electron's Node — @kmamal/sdl's native addon segfaults under Electron's ABI).
// fork gives us a standard IPC channel via process.send / 'message'.
function post(msg: WorkerMessage): void {
  process.send?.(msg)
}

// Top-level await is fine in this ESM worker. Keep @kmamal/sdl external so the
// native addon is loaded at runtime, not bundled.
let sdl: SdlModule | null = null
try {
  const mod = (await import('@kmamal/sdl')) as unknown as { default?: SdlModule } & SdlModule
  sdl = mod.default ?? mod
} catch (err) {
  post({ t: 'error', message: `SDL failed to load: ${err instanceof Error ? err.message : String(err)}` })
  sdl = null
}

let controller: SdlControllerInstance | null = null
let controllerName: string | null = null
// Auto-zero calibration for the analog triggers; reset whenever we (re)open a
// device so a freshly connected pad relearns its own rest point.
let calibrator = makeTriggerCalibrator()

function ensureController(): void {
  if (!sdl) return
  if (controller && !controller.closed) return
  if (controller && controller.closed) {
    controller = null
    controllerName = null
    post({ t: 'status', connected: false, name: null })
  }
  const device = sdl.controller.devices[0]
  if (!device) return
  try {
    controller = sdl.controller.openDevice(device)
    controllerName = device.name ?? 'Controller'
    calibrator = makeTriggerCalibrator() // relearn rest for the new device
    post({ t: 'status', connected: true, name: controllerName })
  } catch (err) {
    post({ t: 'error', message: `open failed: ${err instanceof Error ? err.message : String(err)}` })
  }
}

setInterval(() => {
  try {
    ensureController()
    if (!controller || controller.closed) return
    post({ t: 'state', s: toControllerState(controller, controllerName ?? 'Controller', calibrator) })
  } catch (err) {
    post({ t: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}, TICK_MS)
