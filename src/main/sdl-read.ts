/**
 * SDL reading helpers, shared by the input worker.
 *
 * Kept separate from gamepad.ts because SDL now runs in an ISOLATED child
 * process (see input-worker.ts). On macOS, SDL wants to own the application run
 * loop, which collides with the one Chromium/Electron already owns in the main
 * process — initialising SDL there crashes the app. Running it in a plain Node
 * utility process sidesteps the conflict entirely, and as a bonus a native SDL
 * crash can never take down the Electron UI.
 */

import type { ControllerState } from '../shared/domain'
import { ALL_AXES, ALL_BUTTONS } from '../shared/domain'

/** Minimal structural typing for the @kmamal/sdl surface we use. */
export interface SdlControllerInstance {
  closed: boolean
  buttons: Record<string, boolean>
  axes: Record<string, number>
  close(): void
}
export interface SdlModule {
  controller: {
    devices: Array<{ name?: string }>
    openDevice(device: unknown): SdlControllerInstance
  }
}

/** Messages the worker posts to the parent (Electron main). */
export type WorkerMessage =
  | { t: 'state'; s: ControllerState }
  | { t: 'status'; connected: boolean; name: string | null }
  | { t: 'error'; message: string }

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * Per-trigger auto-zero calibration.
 *
 * WHY: not every controller/SDL mapping rests its triggers at 0. Some DS4 pads
 * (the ones that emit SDL's "Unexpected controller element crc" warning fall
 * back to a generic mapping) rest L2/R2 near the axis MIDPOINT (~0.5). That
 * breaks two things: the Tester shows a half-full trigger at rest, and — worse —
 * the mapping engine treats the trigger as permanently past its 0.5 press
 * threshold, so its rising edge (e.g. app-switch) never fires.
 *
 * A trigger only ever moves UP from its rest position, so the lowest value we've
 * seen IS the rest point. We track it with a fast attack (snap down to any new
 * low) and a very slow release (drift up), which self-corrects a stale reading
 * captured before SDL had populated real data, without a hand calibration step.
 * Rescale so rest->0, full->1; a tiny deadband swallows residual jitter. A pad
 * that already rests at 0 is unaffected (floor stays 0, span stays 1).
 */
export interface TriggerCalibrator {
  apply(id: 'L2' | 'R2', raw: number): number
}

/** How fast the learned rest point drifts back UP toward a sustained level. */
const REST_RELEASE = 0.002
/** Normalized values below this are snapped to 0 (kills residual jitter). */
const TRIGGER_DEADBAND = 0.04

export function makeTriggerCalibrator(): TriggerCalibrator {
  const rest: Record<'L2' | 'R2', number> = { L2: Infinity, R2: Infinity }
  return {
    apply(id, raw) {
      const r = rest[id]
      if (raw < r) {
        rest[id] = raw // fast attack: a new low is the true floor
      } else if (r !== Infinity) {
        rest[id] = r + (raw - r) * REST_RELEASE // slow release: recover a stale/high floor
      } else {
        rest[id] = raw // first sample seeds the floor
      }
      const floor = rest[id]
      const span = 1 - floor
      const norm = span > 0.05 ? (raw - floor) / span : raw
      return norm < TRIGGER_DEADBAND ? 0 : norm > 1 ? 1 : norm
    }
  }
}

/**
 * Translate @kmamal/sdl controller state -> our normalized ControllerState.
 * Pass a `cal` to auto-zero the analog triggers (recommended for live input);
 * omit it for raw values (tests).
 */
export function toControllerState(
  c: SdlControllerInstance,
  name: string,
  cal?: TriggerCalibrator
): ControllerState {
  const b = c.buttons
  const a = c.axes
  const buttons = Object.fromEntries(ALL_BUTTONS.map((x) => [x, false])) as ControllerState['buttons']
  buttons.Cross = !!b.a
  buttons.Circle = !!b.b
  buttons.Square = !!b.x
  buttons.Triangle = !!b.y
  buttons.L1 = !!b.leftShoulder
  buttons.R1 = !!b.rightShoulder
  buttons.Share = !!b.back
  buttons.Options = !!b.start
  buttons.L3 = !!b.leftStick
  buttons.R3 = !!b.rightStick
  buttons.DpadUp = !!b.dpadUp
  buttons.DpadDown = !!b.dpadDown
  buttons.DpadLeft = !!b.dpadLeft
  buttons.DpadRight = !!b.dpadRight
  buttons.PS = !!b.guide
  // L2/R2 digital + Touchpad click are derived/absent; L2/R2 handled via axes.

  const axes = Object.fromEntries(ALL_AXES.map((x) => [x, 0])) as ControllerState['axes']
  axes.LeftX = a.leftStickX ?? 0
  axes.LeftY = a.leftStickY ?? 0
  axes.RightX = a.rightStickX ?? 0
  axes.RightY = a.rightStickY ?? 0
  const l2 = clamp01(a.leftTrigger ?? 0)
  const r2 = clamp01(a.rightTrigger ?? 0)
  axes.L2 = cal ? cal.apply('L2', l2) : l2
  axes.R2 = cal ? cal.apply('R2', r2) : r2

  // SDL's controller abstraction doesn't surface the DS4 touchpad finger; the
  // HID backend does. Under SDL it's always "not touching".
  return {
    connected: true,
    id: name,
    buttons,
    axes,
    touchpad: { touching: false, x: 0, y: 0 },
    timestamp: performance.now()
  }
}
