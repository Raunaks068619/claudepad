/**
 * The mapping engine — the heart of ClaudePad.
 *
 * Responsibility (single, pure): given the PREVIOUS and CURRENT controller
 * snapshots plus a Profile, decide which Intents to emit this frame.
 *
 * It converts LEVELS (button held / stick deflected) into EDGES (just pressed /
 * just released) and continuous stick motion into cursor/scroll Intents. It has
 * no I/O and no platform knowledge, which is exactly why it's trivially unit
 * testable and reusable in both the renderer and (potentially) a headless mode.
 */

import type {
  AxisId,
  Binding,
  ButtonId,
  ControllerState,
  Intent,
  Profile,
  Sensitivity
} from './domain'
import type { CustomAction } from './domain'
import { getAction, customActionIntents } from './claude-actions'
import { emptyControllerState } from './gamepad-mapping'

/** How often a 'hold' binding auto-repeats, in milliseconds. */
export const HOLD_REPEAT_MS = 90

/**
 * Converts a normalized touchpad finger delta (0..1 across the pad) into pixels.
 * Chosen so a mid-range axis `speed` (~18) makes a full-width swipe move the
 * cursor ~900px — roughly a laptop-trackpad feel. Tune via the axis map speed.
 */
export const TOUCHPAD_GAIN = 50

export interface EngineRuntime {
  prev: ControllerState
  /** bindingId -> last time a 'hold' binding fired (ms). */
  lastHoldFire: Record<string, number>
}

export interface EngineOutput {
  intents: Intent[]
}

export function createRuntime(): EngineRuntime {
  return { prev: emptyControllerState(), lastHoldFire: {} }
}

/**
 * Resolve whether a button is "pressed", honouring the analog trigger
 * threshold for L2/R2 (so sensitivity actually controls trigger feel).
 */
export function isPressed(state: ControllerState, id: ButtonId, sens: Sensitivity): boolean {
  if (id === 'L2') return state.axes.L2 >= sens.triggerThreshold
  if (id === 'R2') return state.axes.R2 >= sens.triggerThreshold
  return state.buttons[id]
}

/**
 * Apply deadzone + response curve to a single axis value.
 * - deadzone kills stick drift near center
 * - curve > 1 gives finer control near center, full speed at the edge
 */
export function shapeAxis(v: number, sens: Sensitivity): number {
  const sign = Math.sign(v)
  const mag = Math.abs(v)
  if (mag < sens.deadzone) return 0
  const norm = (mag - sens.deadzone) / (1 - sens.deadzone)
  return sign * Math.pow(norm, sens.curve)
}

function expandBinding(binding: Binding, customActions: CustomAction[]): Intent[] {
  // A binding's actionId may point at a user-defined command or a catalog action.
  // Custom commands win so a user can shadow a built-in if they want.
  const custom = customActions.find((c) => c.id === binding.actionId)
  if (custom) return customActionIntents(custom)
  const action = getAction(binding.actionId)
  return action ? action.intents : []
}

/**
 * Advance the engine by one frame. Mutates `rt` (updates prev + hold timers)
 * and returns the Intents to execute. Deterministic given inputs + rt.
 */
export function step(rt: EngineRuntime, curr: ControllerState, profile: Profile): EngineOutput {
  const intents: Intent[] = []
  const sens = profile.sensitivity
  const prev = rt.prev

  // 1) Discrete bindings (buttons -> Claude actions) via edge detection.
  for (const binding of profile.bindings) {
    const nowPressed = isPressed(curr, binding.input, sens)
    const wasPressed = isPressed(prev, binding.input, sens)

    let fire = false
    if (binding.trigger === 'press') {
      fire = nowPressed && !wasPressed
    } else if (binding.trigger === 'release') {
      fire = !nowPressed && wasPressed
    } else {
      // hold: fire immediately on the rising edge, then auto-repeat throttled
      if (nowPressed) {
        const rising = !wasPressed
        const last = rt.lastHoldFire[binding.id] ?? -Infinity
        if (rising || curr.timestamp - last >= HOLD_REPEAT_MS) {
          fire = true
          rt.lastHoldFire[binding.id] = curr.timestamp
        }
      } else {
        delete rt.lastHoldFire[binding.id]
      }
    }

    if (fire) intents.push(...expandBinding(binding, profile.customActions ?? []))
  }

  // 2) Continuous axis maps (sticks -> cursor / scroll, or touchpad -> trackpad).
  for (const map of profile.axisMaps) {
    // Touchpad acts as a relative trackpad: move by the finger DELTA while a
    // finger is down. No movement on the finger-down or finger-up frame, which
    // is what stops the cursor jumping when a touch begins or ends.
    if (map.source === 'touchpad') {
      // Freeze the cursor while the pad is being physically pressed (clicked):
      // pushing the touchpad down inevitably nudges the finger, and a click must
      // click — not drag. Any binding on the 'Touchpad' button still fires.
      if (curr.buttons.Touchpad) continue
      const t = curr.touchpad
      const p = prev.touchpad
      if (t.touching && p.touching) {
        const dx = (t.x - p.x) * map.speed * TOUCHPAD_GAIN
        const dy = (t.y - p.y) * map.speed * TOUCHPAD_GAIN
        if (dx !== 0 || dy !== 0) {
          if (map.target === 'cursor') intents.push({ type: 'mouseMove', dx, dy })
          else intents.push({ type: 'scroll', dx, dy: -dy })
        }
      }
      continue
    }

    const xId: AxisId = map.source === 'left' ? 'LeftX' : 'RightX'
    const yId: AxisId = map.source === 'left' ? 'LeftY' : 'RightY'
    const dx = shapeAxis(curr.axes[xId], sens) * map.speed
    const dy = shapeAxis(curr.axes[yId], sens) * map.speed
    if (dx === 0 && dy === 0) continue

    if (map.target === 'cursor') {
      intents.push({ type: 'mouseMove', dx, dy })
    } else {
      // Scroll: invert Y so pushing the stick up scrolls content up.
      intents.push({ type: 'scroll', dx, dy: -dy })
    }
  }

  rt.prev = curr
  return { intents }
}
