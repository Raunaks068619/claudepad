import { describe, it, expect } from 'vitest'
import { parseDs4Report } from '../ds4-hid'

/**
 * Build a synthetic DS4 report. `base` is the common-block offset (USB=1, BT=3),
 * so the report id and any BT header are filled in accordingly. Fields default
 * to a neutral resting pad (sticks centred, dpad released, nothing pressed).
 */
function makeReport(opts: {
  id: number
  len: number
  base: number
  lx?: number
  ly?: number
  rx?: number
  ry?: number
  face?: number // raw byte: hat(0-3) + face(4-7)
  aux?: number
  misc?: number
  l2?: number
  r2?: number
  finger0?: [number, number, number, number]
}): Buffer {
  const buf = Buffer.alloc(opts.len)
  buf[0] = opts.id
  const b = opts.base
  buf[b + 0] = opts.lx ?? 128
  buf[b + 1] = opts.ly ?? 128
  buf[b + 2] = opts.rx ?? 128
  buf[b + 3] = opts.ry ?? 128
  buf[b + 4] = opts.face ?? 0x08 // hat=8 (released), no face buttons
  buf[b + 5] = opts.aux ?? 0x00
  buf[b + 6] = opts.misc ?? 0x00
  buf[b + 7] = opts.l2 ?? 0
  buf[b + 8] = opts.r2 ?? 0
  if (opts.finger0) {
    const o = b + 34
    buf[o] = opts.finger0[0]
    buf[o + 1] = opts.finger0[1]
    buf[o + 2] = opts.finger0[2]
    buf[o + 3] = opts.finger0[3]
  }
  return buf
}

describe('parseDs4Report', () => {
  it('rejects junk / too-short reports', () => {
    expect(parseDs4Report(Buffer.alloc(4))).toBeNull()
    expect(parseDs4Report(Buffer.from([0x99, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toBeNull()
  })

  it('parses a USB full report (0x01, 64 bytes): sticks + face + dpad + touchpad', () => {
    // finger0: contact byte 0x00 => touching; x=1049, y=722 (from the live probe).
    // rawX 1049 = ((f2&0x0f)<<8)|f1 -> f1=25 (0x19), f2 low nibble=4
    // rawY 722  = (f3<<4)|((f2&0xf0)>>4) -> f3=45 (0x2d), f2 high nibble=2 => f2=0x24=36
    const buf = makeReport({
      id: 0x01,
      len: 64,
      base: 1,
      lx: 255, // full right
      face: 0x20 | 0x02, // Cross pressed (0x20) + hat=2 (East → Right)
      aux: 0x01, // L1
      finger0: [0x00, 25, 36, 45]
    })
    const r = parseDs4Report(buf)
    expect(r).not.toBeNull()
    expect(r!.axes.LeftX).toBeCloseTo((255 - 128) / 128, 5)
    expect(r!.buttons.Cross).toBe(true)
    expect(r!.buttons.Circle).toBe(false)
    expect(r!.buttons.L1).toBe(true)
    expect(r!.buttons.DpadRight).toBe(true)
    expect(r!.buttons.DpadUp).toBe(false)
    expect(r!.touchpad.touching).toBe(true)
    expect(r!.touchpad.x).toBeCloseTo(1049 / 1920, 4)
    expect(r!.touchpad.y).toBeCloseTo(722 / 943, 4)
  })

  it('parses a Bluetooth extended report (0x11, 78 bytes) with the +2 offset', () => {
    const buf = makeReport({
      id: 0x11,
      len: 78,
      base: 3,
      face: 0x80, // Triangle
      misc: 0x01, // PS button
      finger0: [0x00, 25, 36, 45]
    })
    const r = parseDs4Report(buf)
    expect(r).not.toBeNull()
    expect(r!.buttons.Triangle).toBe(true)
    expect(r!.buttons.PS).toBe(true)
    expect(r!.touchpad.touching).toBe(true)
    expect(r!.touchpad.x).toBeCloseTo(1049 / 1920, 4)
  })

  it('detects finger-up via the inverted contact bit (0x80 set = not touching)', () => {
    const buf = makeReport({ id: 0x01, len: 64, base: 1, finger0: [0x80, 25, 36, 45] })
    const r = parseDs4Report(buf)
    expect(r!.touchpad.touching).toBe(false)
  })

  it('parses a Bluetooth BASIC report (0x01, len 10) without touchpad data', () => {
    const buf = makeReport({ id: 0x01, len: 10, base: 1, lx: 0, aux: 0x02 /* R1 */ })
    const r = parseDs4Report(buf)
    expect(r).not.toBeNull()
    expect(r!.buttons.R1).toBe(true)
    expect(r!.axes.LeftX).toBeCloseTo((0 - 128) / 128, 5)
    // No touchpad bytes present in the short report → never touching.
    expect(r!.touchpad.touching).toBe(false)
  })
})
