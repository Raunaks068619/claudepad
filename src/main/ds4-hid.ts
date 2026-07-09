/**
 * DualShock 4 raw HID report parser (pure, unit-tested).
 *
 * WHY this exists: @kmamal/sdl (the SDL backend) exposes buttons + sticks but
 * NOT the touchpad finger position — that data lives only in the controller's
 * raw HID input report. This module decodes that report so the HID backend can
 * offer the touchpad as a trackpad.
 *
 * Report layouts (verified against Linux drivers/hid/hid-playstation.c + ds4drv):
 *   - USB, report id 0x01, >= 64 bytes: report_id@0, "common" block @1,
 *     touchpad finger0 @ byte 35.
 *   - Bluetooth EXTENDED, report id 0x11, >= 78 bytes: 2 extra header bytes, so
 *     everything shifts +2 — common @3, touchpad finger0 @ byte 37, CRC32 tail.
 *   - Bluetooth BASIC, report id 0x01, len 10: sticks + buttons only, NO
 *     touchpad (this is what a BT pad sends until switched to extended mode).
 *
 * We index off `base` = the offset of the common block (USB=1, BT=3); the
 * touchpad finger0 packet then sits at `base + 34` (→ absolute 35 / 37).
 */

import type { AxisId, ButtonId } from '../shared/domain'
import { ALL_AXES, ALL_BUTTONS } from '../shared/domain'

/** Sony vendor id and the two DS4 product ids (v1 CUH-ZCT1, v2 CUH-ZCT2). */
export const VENDOR_SONY = 0x054c
export const DS4_PIDS = [0x05c4, 0x09cc]

// Touchpad physical resolution (Linux hid-playstation.c: WIDTH 1920, HEIGHT 942).
const TOUCHPAD_WIDTH = 1920
const TOUCHPAD_HEIGHT = 943

export interface Ds4Parsed {
  buttons: Record<ButtonId, boolean>
  axes: Record<AxisId, number>
  touchpad: { touching: boolean; x: number; y: number }
}

function emptyButtons(): Record<ButtonId, boolean> {
  return Object.fromEntries(ALL_BUTTONS.map((b) => [b, false])) as Record<ButtonId, boolean>
}
function emptyAxes(): Record<AxisId, number> {
  return Object.fromEntries(ALL_AXES.map((a) => [a, 0])) as Record<AxisId, number>
}

/** Raw stick byte (0..255, centre 128) → normalized -1..1. */
function stick(v: number): number {
  return (v - 128) / 128
}
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * Parse a DS4 HID input report. Returns null for an unrecognised/short report
 * (so callers can simply ignore junk frames).
 */
export function parseDs4Report(buf: Buffer | Uint8Array): Ds4Parsed | null {
  if (!buf || buf.length < 10) return null
  const id = buf[0]

  // Determine the common-block base offset and whether touchpad bytes exist.
  let base: number
  let hasTouch: boolean
  if (id === 0x11 && buf.length >= 78) {
    base = 3 // Bluetooth extended report
    hasTouch = true
  } else if (id === 0x01 && buf.length >= 64) {
    base = 1 // USB full report
    hasTouch = true
  } else if (id === 0x01) {
    base = 1 // Bluetooth basic report (len ~10): sticks + buttons only
    hasTouch = false
  } else {
    return null
  }

  const buttons = emptyButtons()
  const axes = emptyAxes()

  // Sticks.
  axes.LeftX = stick(buf[base + 0])
  axes.LeftY = stick(buf[base + 1])
  axes.RightX = stick(buf[base + 2])
  axes.RightY = stick(buf[base + 3])

  const bFace = buf[base + 4] // dpad hat (bits0-3) + face buttons (bits4-7)
  const bAux = buf[base + 5] // shoulders / triggers-as-buttons / share / options / sticks
  const bMisc = buf[base + 6] // PS (bit0) + touchpad click (bit1) + counter

  // Face buttons.
  buttons.Square = (bFace & 0x10) !== 0
  buttons.Cross = (bFace & 0x20) !== 0
  buttons.Circle = (bFace & 0x40) !== 0
  buttons.Triangle = (bFace & 0x80) !== 0

  // D-pad is a hat switch in the low nibble: 0=N,1=NE,2=E,…,7=NW,8=released.
  const hat = bFace & 0x0f
  buttons.DpadUp = hat === 7 || hat === 0 || hat === 1
  buttons.DpadRight = hat === 1 || hat === 2 || hat === 3
  buttons.DpadDown = hat === 3 || hat === 4 || hat === 5
  buttons.DpadLeft = hat === 5 || hat === 6 || hat === 7

  buttons.L1 = (bAux & 0x01) !== 0
  buttons.R1 = (bAux & 0x02) !== 0
  buttons.L2 = (bAux & 0x04) !== 0
  buttons.R2 = (bAux & 0x08) !== 0
  buttons.Share = (bAux & 0x10) !== 0
  buttons.Options = (bAux & 0x20) !== 0
  buttons.L3 = (bAux & 0x40) !== 0
  buttons.R3 = (bAux & 0x80) !== 0

  buttons.PS = (bMisc & 0x01) !== 0
  buttons.Touchpad = (bMisc & 0x02) !== 0

  // Analog triggers (0..255 → 0..1).
  axes.L2 = clamp01(buf[base + 7] / 255)
  axes.R2 = clamp01(buf[base + 8] / 255)

  // Touchpad finger 0 (4 bytes at base+34 → absolute 35 USB / 37 BT).
  let touching = false
  let x = 0
  let y = 0
  if (hasTouch && buf.length >= base + 38) {
    const o = base + 34
    const f0 = buf[o]
    const f1 = buf[o + 1]
    const f2 = buf[o + 2]
    const f3 = buf[o + 3]
    // bit7 is an INVERTED contact flag: 0 = finger down, 1 = finger up.
    touching = (f0 & 0x80) === 0
    const rawX = ((f2 & 0x0f) << 8) | f1
    const rawY = (f3 << 4) | ((f2 & 0xf0) >> 4)
    x = clamp01(rawX / TOUCHPAD_WIDTH)
    y = clamp01(rawY / TOUCHPAD_HEIGHT)
  }

  return { buttons, axes, touchpad: { touching, x, y } }
}
