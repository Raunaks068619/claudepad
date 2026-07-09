import { describe, it, expect } from 'vitest'
import { createRuntime, isPressed, shapeAxis, step, HOLD_REPEAT_MS } from '../mapping-engine'
import { customActionIntents } from '../claude-actions'
import { emptyControllerState } from '../gamepad-mapping'
import { DEFAULT_SENSITIVITY, type ControllerState, type Profile } from '../domain'

function stateWith(mut: (s: ControllerState) => void, t = 0): ControllerState {
  const s = emptyControllerState()
  s.connected = true
  s.timestamp = t
  mut(s)
  return s
}

const testProfile: Profile = {
  id: 'test',
  name: 'test',
  sensitivity: { ...DEFAULT_SENSITIVITY },
  bindings: [
    { id: 'send', input: 'Cross', trigger: 'press', actionId: 'claude.desktop.send' },
    { id: 'rel', input: 'Circle', trigger: 'release', actionId: 'sys.copy' },
    { id: 'hold', input: 'Square', trigger: 'hold', actionId: 'sys.paste' }
  ],
  axisMaps: [{ id: 'cur', source: 'left', target: 'cursor', speed: 10 }]
}

describe('edge detection', () => {
  it('fires a press only on the rising edge, not while held', () => {
    const rt = createRuntime()
    const down = stateWith((s) => (s.buttons.Cross = true), 0)

    // First frame: false -> true = fire once
    expect(step(rt, down, testProfile).intents).toHaveLength(1)
    // Second frame: still held = no fire (this is the whole point)
    const stillDown = stateWith((s) => (s.buttons.Cross = true), 16)
    expect(step(rt, stillDown, testProfile).intents).toHaveLength(0)
  })

  it('fires a release only on the falling edge', () => {
    const rt = createRuntime()
    step(rt, stateWith((s) => (s.buttons.Circle = true), 0), testProfile)
    const up = stateWith(() => {}, 16)
    const out = step(rt, up, testProfile)
    expect(out.intents).toHaveLength(1)
    expect(out.intents[0]).toMatchObject({ type: 'keystroke', keys: ['Mod', 'C'] })
  })

  it('auto-repeats a hold binding on the throttle interval', () => {
    const rt = createRuntime()
    // t=0 pressed -> fires
    expect(step(rt, stateWith((s) => (s.buttons.Square = true), 0), testProfile).intents).toHaveLength(1)
    // t just after -> throttled, no fire
    expect(step(rt, stateWith((s) => (s.buttons.Square = true), 10), testProfile).intents).toHaveLength(0)
    // t past interval -> fires again
    const later = HOLD_REPEAT_MS + 5
    expect(step(rt, stateWith((s) => (s.buttons.Square = true), later), testProfile).intents).toHaveLength(1)
  })
})

describe('custom commands', () => {
  it('expands a text command into a type intent (+ Enter when submit)', () => {
    expect(customActionIntents({ id: 'c1', label: 'Prompt', kind: 'text', text: 'hello' })).toEqual([
      { type: 'text', value: 'hello', description: 'Prompt' }
    ])
    const withSubmit = customActionIntents({
      id: 'c2',
      label: 'Slash',
      kind: 'text',
      text: '/model',
      submit: true
    })
    expect(withSubmit).toEqual([
      { type: 'text', value: '/model', description: 'Slash' },
      { type: 'keystroke', keys: ['Enter'] }
    ])
  })

  it('expands a keys command into a single chord keystroke', () => {
    expect(
      customActionIntents({ id: 'c3', label: 'Screenshot', kind: 'keys', keys: ['Mod', 'Shift', '4'] })
    ).toEqual([{ type: 'keystroke', keys: ['Mod', 'Shift', '4'], description: 'Screenshot' }])
  })

  it('fires a custom command when its binding is pressed (resolved via profile)', () => {
    const rt = createRuntime()
    const profile: Profile = {
      id: 'p',
      name: 'p',
      sensitivity: { ...DEFAULT_SENSITIVITY },
      bindings: [{ id: 'b', input: 'Triangle', trigger: 'press', actionId: 'my-custom' }],
      axisMaps: [],
      customActions: [{ id: 'my-custom', label: 'Grab', kind: 'keys', keys: ['Mod', 'Shift', '4'] }]
    }
    const out = step(rt, stateWith((s) => (s.buttons.Triangle = true), 0), profile)
    expect(out.intents).toEqual([{ type: 'keystroke', keys: ['Mod', 'Shift', '4'], description: 'Grab' }])
  })
})

describe('analog trigger threshold', () => {
  it('treats L2/R2 as pressed only above triggerThreshold', () => {
    const sens = { ...DEFAULT_SENSITIVITY, triggerThreshold: 0.5 }
    expect(isPressed(stateWith((s) => (s.axes.L2 = 0.3)), 'L2', sens)).toBe(false)
    expect(isPressed(stateWith((s) => (s.axes.L2 = 0.8)), 'L2', sens)).toBe(true)
  })
})

describe('deadzone + curve', () => {
  it('zeroes input inside the deadzone', () => {
    expect(shapeAxis(0.05, { ...DEFAULT_SENSITIVITY, deadzone: 0.12, curve: 1 })).toBe(0)
  })
  it('rescales so just outside deadzone starts near zero and full deflection is 1', () => {
    const sens = { ...DEFAULT_SENSITIVITY, deadzone: 0.1, curve: 1 }
    expect(shapeAxis(1, sens)).toBeCloseTo(1, 5)
    expect(shapeAxis(0.1, sens)).toBeCloseTo(0, 5)
  })
})

describe('axis -> cursor', () => {
  it('emits a mouseMove intent when the stick is deflected past the deadzone', () => {
    const rt = createRuntime()
    const out = step(rt, stateWith((s) => (s.axes.LeftX = 1), 0), testProfile)
    const move = out.intents.find((i) => i.type === 'mouseMove')
    expect(move).toBeDefined()
    expect(move).toMatchObject({ type: 'mouseMove' })
  })
})

describe('touchpad -> cursor', () => {
  const tpProfile: Profile = {
    id: 'tp',
    name: 'tp',
    sensitivity: { ...DEFAULT_SENSITIVITY },
    bindings: [],
    axisMaps: [{ id: 'tp', source: 'touchpad', target: 'cursor', speed: 18 }]
  }

  it('moves the cursor by the finger delta while dragging (both frames touching)', () => {
    const rt = createRuntime()
    // Frame 1: finger down at x=0.4 — no move (prev not touching).
    step(rt, stateWith((s) => (s.touchpad = { touching: true, x: 0.4, y: 0.5 }), 0), tpProfile)
    // Frame 2: dragged to x=0.5 — should emit a mouseMove.
    const out = step(
      rt,
      stateWith((s) => (s.touchpad = { touching: true, x: 0.5, y: 0.5 }), 16),
      tpProfile
    )
    const move = out.intents.find((i) => i.type === 'mouseMove')
    expect(move).toBeDefined()
    expect(move).toMatchObject({ type: 'mouseMove' })
  })

  it('does NOT move the cursor while the touchpad is being clicked (press = click, not drag)', () => {
    const rt = createRuntime()
    step(rt, stateWith((s) => (s.touchpad = { touching: true, x: 0.4, y: 0.5 }), 0), tpProfile)
    // Same drag delta, but the Touchpad button is now pressed → frozen.
    const out = step(
      rt,
      stateWith((s) => {
        s.touchpad = { touching: true, x: 0.5, y: 0.5 }
        s.buttons.Touchpad = true
      }, 16),
      tpProfile
    )
    expect(out.intents.find((i) => i.type === 'mouseMove')).toBeUndefined()
  })
})
