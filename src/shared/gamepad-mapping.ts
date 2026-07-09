/**
 * Translation layer: browser Gamepad API "standard" mapping -> our ButtonId/AxisId.
 *
 * Why the Gamepad API? It's built into Chromium (Electron's renderer), needs
 * ZERO native modules, and already normalises DualShock 4 / DualSense / Xbox
 * pads into a "standard" layout on Windows, macOS and Linux. That is the
 * single biggest win for cross-platform support — we let the browser do the
 * HID parsing instead of shipping platform-specific native code.
 *
 * Standard mapping reference:
 * https://w3c.github.io/gamepad/#remapping
 */

import type { AxisId, ButtonId, ControllerState } from './domain'
import { ALL_AXES, ALL_BUTTONS } from './domain'

/** Standard-mapping button index -> ButtonId. */
export const BUTTON_INDEX: Record<number, ButtonId> = {
  0: 'Cross',      // A
  1: 'Circle',     // B
  2: 'Square',     // X
  3: 'Triangle',   // Y
  4: 'L1',         // Left bumper
  5: 'R1',         // Right bumper
  6: 'L2',         // Left trigger (analog via .value)
  7: 'R2',         // Right trigger (analog via .value)
  8: 'Share',      // Back / Select
  9: 'Options',    // Start
  10: 'L3',        // Left stick click
  11: 'R3',        // Right stick click
  12: 'DpadUp',
  13: 'DpadDown',
  14: 'DpadLeft',
  15: 'DpadRight',
  16: 'PS',        // Guide
  17: 'Touchpad'   // DS4/DualSense touchpad click (when exposed)
}

const emptyButtons = (): Record<ButtonId, boolean> =>
  Object.fromEntries(ALL_BUTTONS.map((b) => [b, false])) as Record<ButtonId, boolean>

const emptyAxes = (): Record<AxisId, number> =>
  Object.fromEntries(ALL_AXES.map((a) => [a, 0])) as Record<AxisId, number>

export function emptyControllerState(): ControllerState {
  return {
    connected: false,
    id: '',
    buttons: emptyButtons(),
    axes: emptyAxes(),
    touchpad: { touching: false, x: 0, y: 0 },
    timestamp: 0
  }
}

/**
 * Convert a raw browser Gamepad snapshot into our normalized ControllerState.
 * Pure function — safe to call every animation frame.
 */
export function readGamepad(gp: Gamepad | null): ControllerState {
  if (!gp) return emptyControllerState()

  const buttons = emptyButtons()
  gp.buttons.forEach((btn, index) => {
    const id = BUTTON_INDEX[index]
    if (id) buttons[id] = btn.pressed
  })

  const axes = emptyAxes()
  axes.LeftX = gp.axes[0] ?? 0
  axes.LeftY = gp.axes[1] ?? 0
  axes.RightX = gp.axes[2] ?? 0
  axes.RightY = gp.axes[3] ?? 0
  // Triggers are 0..1 via button .value in standard mapping.
  axes.L2 = gp.buttons[6]?.value ?? 0
  axes.R2 = gp.buttons[7]?.value ?? 0

  return {
    connected: gp.connected,
    id: gp.id,
    buttons,
    axes,
    // The browser Gamepad API doesn't expose the touchpad finger position.
    touchpad: { touching: false, x: 0, y: 0 },
    timestamp: performance.now()
  }
}
