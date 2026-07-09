import { describe, it, expect } from 'vitest'
import { makeTriggerCalibrator } from '../sdl-read'

/**
 * The calibrator's job: make a trigger that rests anywhere read as 0 at rest and
 * ~1 at full pull, so the Tester bar is empty at rest and the 0.5 press-threshold
 * is only crossed on a real pull (fixes the "L2 stuck at 50% / app-switch never
 * fires" class of bug on pads whose triggers rest near the axis midpoint).
 */
describe('trigger calibrator', () => {
  it('passes through a well-behaved trigger (rest already 0)', () => {
    const cal = makeTriggerCalibrator()
    expect(cal.apply('L2', 0)).toBe(0)
    expect(cal.apply('L2', 1)).toBeCloseTo(1, 5)
    expect(cal.apply('L2', 0)).toBe(0)
  })

  it('auto-zeros a trigger that rests at ~0.5', () => {
    const cal = makeTriggerCalibrator()
    // Pad rests at 0.5 from the first sample -> should read as 0 (deadbanded).
    expect(cal.apply('R2', 0.5)).toBe(0)
    // Full pull to 1.0 rescales across the [0.5, 1] span -> ~1.
    expect(cal.apply('R2', 1)).toBeCloseTo(1, 5)
    // Back to rest -> 0 again.
    expect(cal.apply('R2', 0.5)).toBe(0)
  })

  it('calibrates L2 and R2 independently', () => {
    const cal = makeTriggerCalibrator()
    cal.apply('L2', 0.5) // L2 rests at 0.5
    cal.apply('R2', 0) // R2 rests at 0
    expect(cal.apply('L2', 0.5)).toBe(0)
    expect(cal.apply('R2', 0.5)).toBeGreaterThan(0.4) // R2 midway is a real half-pull
  })

  it('recovers a stale-high floor via slow release drift', () => {
    const cal = makeTriggerCalibrator()
    // A single early sample seeds the floor low (as a starved/stale read might).
    cal.apply('L2', 0)
    // True rest is actually 0.5; feed it repeatedly and the floor should drift up
    // so rest eventually reads ~0 again instead of a stuck half-press.
    let out = 1
    for (let i = 0; i < 5000; i++) out = cal.apply('L2', 0.5)
    expect(out).toBeLessThan(0.1)
  })
})
