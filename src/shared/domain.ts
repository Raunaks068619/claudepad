/**
 * ClaudePad — shared domain model (the "ubiquitous language").
 *
 * Mental model: a gamepad broadcasts its FULL STATE ~60x/second (a level, like
 * a status light). A keyboard/app expects EVENTS (edges: "just pressed").
 * The mapping engine's whole job is to turn levels into edges and edges into
 * Intents, which the OS actuator then executes. These types are the contract
 * shared by the renderer (input), the engine (mapping), and the main process
 * (execution). No behavior lives here — types only.
 */

/** Every digital button we recognise on a standard controller. */
export type ButtonId =
  | 'Cross'
  | 'Circle'
  | 'Square'
  | 'Triangle'
  | 'L1'
  | 'R1'
  | 'L2'
  | 'R2'
  | 'Share'
  | 'Options'
  | 'L3'
  | 'R3'
  | 'DpadUp'
  | 'DpadDown'
  | 'DpadLeft'
  | 'DpadRight'
  | 'PS'
  | 'Touchpad'

export const ALL_BUTTONS: ButtonId[] = [
  'Cross', 'Circle', 'Square', 'Triangle',
  'L1', 'R1', 'L2', 'R2',
  'Share', 'Options', 'L3', 'R3',
  'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight',
  'PS', 'Touchpad'
]

/** Analog axes. Sticks are -1..1; triggers are 0..1. */
export type AxisId = 'LeftX' | 'LeftY' | 'RightX' | 'RightY' | 'L2' | 'R2'

export const ALL_AXES: AxisId[] = ['LeftX', 'LeftY', 'RightX', 'RightY', 'L2', 'R2']

/**
 * DS4/DualSense touchpad finger state. Only the HID input backend populates
 * this with real data (the SDL backend leaves `touching` false) — the touchpad
 * finger position isn't exposed by the browser Gamepad API or @kmamal/sdl; it
 * lives in the controller's raw HID report.
 */
export interface TouchpadState {
  /** True while a finger is on the touchpad. */
  touching: boolean
  /** Normalized finger position across the pad, 0..1 (x) and 0..1 (y). */
  x: number
  y: number
}

/** A single immutable snapshot of the controller at one instant. */
export interface ControllerState {
  connected: boolean
  id: string
  /** Raw button pressed-state, keyed by our stable ButtonId. */
  buttons: Record<ButtonId, boolean>
  /** Analog values. Sticks -1..1, triggers 0..1. */
  axes: Record<AxisId, number>
  /** Primary touchpad finger (HID backend only; default not-touching). */
  touchpad: TouchpadState
  /** performance.now() timestamp of this snapshot. */
  timestamp: number
}

/** When a binding should fire relative to the button's edge. */
export type Trigger = 'press' | 'release' | 'hold'

/**
 * An Intent is a resolved, platform-agnostic instruction for the actuator.
 * Discriminated union so the executor can exhaustively switch on `type`.
 */
export type Intent =
  | { type: 'keystroke'; keys: string[]; description?: string }
  | { type: 'keyDown'; keys: string[]; description?: string }
  | { type: 'keyUp'; keys: string[]; description?: string }
  | { type: 'text'; value: string; description?: string }
  | { type: 'shell'; command: string; args?: string[]; description?: string }
  | { type: 'mouseMove'; dx: number; dy: number }
  | { type: 'mouseButton'; button: 'left' | 'right' | 'middle'; action: 'press' | 'release' | 'click' }
  | { type: 'scroll'; dx: number; dy: number }
  | { type: 'noop' }

/** A stable identifier for a high-level action from the action catalog. */
export type ActionId = string

/**
 * A binding connects one input to one catalog action, at a chosen trigger.
 * `input` is either a button or an axis-as-button (e.g. push stick past a
 * threshold). Axis→cursor movement is handled separately via `axisMap`.
 */
export interface Binding {
  id: string
  input: ButtonId
  trigger: Trigger
  actionId: ActionId
  /** Optional label override for the UI. */
  label?: string
}

/** Maps a stick or the touchpad to continuous cursor or scroll movement. */
export interface AxisMap {
  id: string
  /**
   * What drives it. 'left'/'right' are the analog sticks (velocity from
   * deflection). 'touchpad' is the DS4 touchpad used as a trackpad (cursor moves
   * by finger delta while touching) — only active under the HID input backend.
   */
  source: 'left' | 'right' | 'touchpad'
  /** What the source does. */
  target: 'cursor' | 'scroll'
  /** Speed/gain. Sticks: pixels per frame at full deflection. Touchpad: gain. */
  speed: number
}

export interface Sensitivity {
  /** Ignore stick input below this magnitude (0..1). Kills drift. */
  deadzone: number
  /** Response curve exponent. 1 = linear, >1 = finer control near center. */
  curve: number
  /** Trigger (L2/R2) press threshold to count as a digital press (0..1). */
  triggerThreshold: number
}

/**
 * A user-defined command, bindable exactly like a catalog action. Kept to
 * text-typing and key chords ONLY (no arbitrary shell) so a persisted/imported
 * config can never become a code-execution vector — the same stance the
 * executor takes for shell intents.
 */
export type CustomActionKind = 'text' | 'keys'
export interface CustomAction {
  id: string
  label: string
  kind: CustomActionKind
  /** kind 'text': the literal text to type. */
  text?: string
  /** kind 'text': press Enter after typing (e.g. to submit a slash command). */
  submit?: boolean
  /** kind 'keys': chord tokens the executor understands, e.g. ['Mod','Shift','4']. */
  keys?: string[]
}

export interface Profile {
  id: string
  name: string
  /** True if this profile is the built-in default (not user-deletable). */
  builtin?: boolean
  bindings: Binding[]
  axisMaps: AxisMap[]
  /** User-defined commands, resolved by binding.actionId alongside the catalog. */
  customActions?: CustomAction[]
  sensitivity: Sensitivity
}

export const DEFAULT_SENSITIVITY: Sensitivity = {
  deadzone: 0.12,
  curve: 1.5,
  triggerThreshold: 0.5
}

/** Persisted app configuration. */
export interface AppConfig {
  onboardingComplete: boolean
  activeProfileId: string
  profiles: Profile[]
  /** User-supplied paths so we can launch Claude apps cross-platform. */
  paths: {
    claudeDesktop?: string
    terminal?: string
  }
  /** Master switch — when false the engine emits nothing. */
  enabled: boolean
  /**
   * Which OS-level reader supplies controller input.
   *  - 'sdl' (default): @kmamal/sdl — proven, buttons/sticks only.
   *  - 'hid': node-hid raw DS4 reader — also unlocks the touchpad as a trackpad.
   */
  inputBackend: 'sdl' | 'hid'
}
