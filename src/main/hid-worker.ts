/**
 * HID input worker — the node-hid alternative to the SDL worker.
 *
 * Runs in a child process under SYSTEM Node (node-hid's prebuilt native addon
 * matches that ABI, same reason the SDL worker does). Its only job: open the
 * DualShock 4 over raw HID, parse each input report (buttons + sticks + the
 * TOUCHPAD, which SDL can't see), and post normalized ControllerState to the
 * parent — using the exact same WorkerMessage protocol as the SDL worker, so
 * GamepadService is agnostic to which backend produced the state.
 *
 * Bluetooth note: a BT-connected DS4 sends a minimal 10-byte report (no
 * touchpad) until asked for the extended report. Reading feature report 0x02
 * flips it into the 78-byte 0x11 mode that carries the touchpad. Harmless over
 * USB.
 */

import { parseDs4Report, VENDOR_SONY, DS4_PIDS } from './ds4-hid'
import type { ControllerState } from '../shared/domain'
import type { WorkerMessage } from './sdl-read'

function post(msg: WorkerMessage): void {
  process.send?.(msg)
}

// Minimal structural typing for the node-hid surface we use (kept local so this
// file needs no @types dependency and the addon loads lazily at runtime).
interface HidDeviceInfo {
  vendorId?: number
  productId?: number
  path?: string
  product?: string
}
interface HidDevice {
  on(event: 'data', cb: (data: Buffer) => void): void
  on(event: 'error', cb: (err: Error) => void): void
  getFeatureReport(reportId: number, length: number): number[]
  close(): void
}
interface HidModule {
  devices(): HidDeviceInfo[]
  HID: new (path: string) => HidDevice
}

let HID: HidModule | null = null
try {
  const mod = (await import('node-hid')) as unknown as { default?: HidModule } & HidModule
  HID = mod.default ?? mod
} catch (err) {
  post({
    t: 'error',
    message: `node-hid failed to load: ${err instanceof Error ? err.message : String(err)}`
  })
  HID = null
}

let device: HidDevice | null = null
let deviceName: string | null = null
let opening = false

function findDs4(): HidDeviceInfo | null {
  if (!HID) return null
  try {
    const devs = HID.devices()
    return (
      devs.find((d) => d.vendorId === VENDOR_SONY && DS4_PIDS.includes(d.productId ?? -1)) ?? null
    )
  } catch {
    return null
  }
}

function closeDevice(): void {
  if (device) {
    try {
      device.close()
    } catch {
      /* ignore */
    }
    device = null
  }
  deviceName = null
  post({ t: 'status', connected: false, name: null })
}

function onReport(buf: Buffer): void {
  const parsed = parseDs4Report(buf)
  if (!parsed) return
  const state: ControllerState = {
    connected: true,
    id: deviceName ?? 'DualShock 4',
    buttons: parsed.buttons,
    axes: parsed.axes,
    touchpad: parsed.touchpad,
    timestamp: performance.now()
  }
  post({ t: 'state', s: state })
}

function open(): void {
  if (!HID || device || opening) return
  const info = findDs4()
  if (!info || !info.path) return
  opening = true
  try {
    const dev = new HID.HID(info.path)
    // Flip a Bluetooth pad into extended-report mode so the touchpad appears.
    // No-op / harmless over USB (and swallow failures — some stacks reject it).
    try {
      dev.getFeatureReport(0x02, 37)
    } catch {
      /* extended-mode trigger not supported on this connection — USB is fine */
    }
    dev.on('data', (b) => onReport(b))
    dev.on('error', (e) => {
      post({ t: 'error', message: `HID read error: ${e.message}` })
      closeDevice()
    })
    device = dev
    deviceName = info.product ?? 'DualShock 4'
    post({ t: 'status', connected: true, name: deviceName })
  } catch (err) {
    // The most common failure on macOS is a missing Input Monitoring grant.
    post({
      t: 'error',
      message: `HID open failed (grant Input Monitoring in System Settings?): ${
        err instanceof Error ? err.message : String(err)
      }`
    })
    device = null
  } finally {
    opening = false
  }
}

// Poll for (re)connection once a second; node-hid pushes reports via 'data' at
// the device's own rate once open, so there's no read loop to run here.
setInterval(open, 1000)
open()
