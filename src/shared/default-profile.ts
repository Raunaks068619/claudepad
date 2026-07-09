/**
 * The built-in default profile: a ready-to-use controller -> Claude mapping.
 * This is what the user asked for first — "map different parts of the key to
 * specific Claude options." Everything here is editable in the Mapper UI.
 *
 * Layout rationale:
 *   Face buttons  -> the four most-used Claude actions
 *   Bumpers (L1/R1) -> send / stop (fast, reachable under index fingers)
 *   Triggers (L2/R2) -> app + model switching
 *   D-pad         -> CLI slash commands
 *   Left stick    -> cursor,  Right stick -> scroll
 *   Options/Share -> launch apps
 */

import type { AppConfig, Profile } from './domain'
import { DEFAULT_SENSITIVITY } from './domain'

export const DEFAULT_PROFILE_ID = 'builtin-default'

export function makeDefaultProfile(): Profile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Default — Claude',
    builtin: true,
    sensitivity: { ...DEFAULT_SENSITIVITY },
    bindings: [
      // Face buttons
      { id: 'b-cross-send', input: 'Cross', trigger: 'press', actionId: 'claude.desktop.send' },
      { id: 'b-circle-stop', input: 'Circle', trigger: 'press', actionId: 'claude.desktop.stop' },
      { id: 'b-square-new', input: 'Square', trigger: 'press', actionId: 'claude.desktop.newChat' },
      { id: 'b-triangle-search', input: 'Triangle', trigger: 'press', actionId: 'claude.desktop.search' },

      // Bumpers
      { id: 'b-l1-send', input: 'L1', trigger: 'press', actionId: 'claude.cli.submit' },
      { id: 'b-r1-interrupt', input: 'R1', trigger: 'press', actionId: 'claude.cli.interrupt' },

      // Triggers
      { id: 'b-l2-appswitch', input: 'L2', trigger: 'press', actionId: 'sys.appSwitch' },
      { id: 'b-r2-model', input: 'R2', trigger: 'press', actionId: 'claude.cli.model' },

      // D-pad -> CLI
      { id: 'b-up-model', input: 'DpadUp', trigger: 'press', actionId: 'claude.cli.model' },
      { id: 'b-down-clear', input: 'DpadDown', trigger: 'press', actionId: 'claude.cli.clear' },
      { id: 'b-left-help', input: 'DpadLeft', trigger: 'press', actionId: 'claude.cli.help' },
      { id: 'b-right-newline', input: 'DpadRight', trigger: 'press', actionId: 'claude.desktop.newline' },

      // Stick clicks
      { id: 'b-l3-click', input: 'L3', trigger: 'press', actionId: 'sys.leftClick' },

      // Touchpad press = left click (HID backend only; the SDL backend can't
      // see it). Cursor movement is frozen while it's held so a click never drags.
      { id: 'b-touchpad-click', input: 'Touchpad', trigger: 'press', actionId: 'sys.leftClick' },

      // Launch
      { id: 'b-options-desktop', input: 'Options', trigger: 'press', actionId: 'launch.claudeDesktop' },
      { id: 'b-share-terminal', input: 'Share', trigger: 'press', actionId: 'launch.terminal' }
    ],
    axisMaps: [
      { id: 'ax-left-cursor', source: 'left', target: 'cursor', speed: 14 },
      { id: 'ax-right-scroll', source: 'right', target: 'scroll', speed: 8 },
      // Touchpad as a trackpad — only does anything under the HID input backend
      // (the SDL backend can't see the touchpad). Harmless otherwise.
      { id: 'ax-touchpad-cursor', source: 'touchpad', target: 'cursor', speed: 18 }
    ],
    // User-defined commands (added in the Mapper). Empty by default.
    customActions: []
  }
}

export function makeDefaultConfig(): AppConfig {
  return {
    onboardingComplete: false,
    activeProfileId: DEFAULT_PROFILE_ID,
    profiles: [makeDefaultProfile()],
    paths: {},
    enabled: true,
    // Default to the proven SDL reader; the user opts into HID (touchpad) in
    // Settings so a first run can't be blocked by node-hid / Input Monitoring.
    inputBackend: 'sdl'
  }
}
