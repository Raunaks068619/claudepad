import { A as ALL_BUTTONS, a as ALL_AXES } from "./chunks/domain-B2CPkCNr.js";
const VENDOR_SONY = 1356;
const DS4_PIDS = [1476, 2508];
const TOUCHPAD_WIDTH = 1920;
const TOUCHPAD_HEIGHT = 943;
function emptyButtons() {
  return Object.fromEntries(ALL_BUTTONS.map((b) => [b, false]));
}
function emptyAxes() {
  return Object.fromEntries(ALL_AXES.map((a) => [a, 0]));
}
function stick(v) {
  return (v - 128) / 128;
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function parseDs4Report(buf) {
  if (!buf || buf.length < 10) return null;
  const id = buf[0];
  let base;
  let hasTouch;
  if (id === 17 && buf.length >= 78) {
    base = 3;
    hasTouch = true;
  } else if (id === 1 && buf.length >= 64) {
    base = 1;
    hasTouch = true;
  } else if (id === 1) {
    base = 1;
    hasTouch = false;
  } else {
    return null;
  }
  const buttons = emptyButtons();
  const axes = emptyAxes();
  axes.LeftX = stick(buf[base + 0]);
  axes.LeftY = stick(buf[base + 1]);
  axes.RightX = stick(buf[base + 2]);
  axes.RightY = stick(buf[base + 3]);
  const bFace = buf[base + 4];
  const bAux = buf[base + 5];
  const bMisc = buf[base + 6];
  buttons.Square = (bFace & 16) !== 0;
  buttons.Cross = (bFace & 32) !== 0;
  buttons.Circle = (bFace & 64) !== 0;
  buttons.Triangle = (bFace & 128) !== 0;
  const hat = bFace & 15;
  buttons.DpadUp = hat === 7 || hat === 0 || hat === 1;
  buttons.DpadRight = hat === 1 || hat === 2 || hat === 3;
  buttons.DpadDown = hat === 3 || hat === 4 || hat === 5;
  buttons.DpadLeft = hat === 5 || hat === 6 || hat === 7;
  buttons.L1 = (bAux & 1) !== 0;
  buttons.R1 = (bAux & 2) !== 0;
  buttons.L2 = (bAux & 4) !== 0;
  buttons.R2 = (bAux & 8) !== 0;
  buttons.Share = (bAux & 16) !== 0;
  buttons.Options = (bAux & 32) !== 0;
  buttons.L3 = (bAux & 64) !== 0;
  buttons.R3 = (bAux & 128) !== 0;
  buttons.PS = (bMisc & 1) !== 0;
  buttons.Touchpad = (bMisc & 2) !== 0;
  axes.L2 = clamp01(buf[base + 7] / 255);
  axes.R2 = clamp01(buf[base + 8] / 255);
  let touching = false;
  let x = 0;
  let y = 0;
  if (hasTouch && buf.length >= base + 38) {
    const o = base + 34;
    const f0 = buf[o];
    const f1 = buf[o + 1];
    const f2 = buf[o + 2];
    const f3 = buf[o + 3];
    touching = (f0 & 128) === 0;
    const rawX = (f2 & 15) << 8 | f1;
    const rawY = f3 << 4 | (f2 & 240) >> 4;
    x = clamp01(rawX / TOUCHPAD_WIDTH);
    y = clamp01(rawY / TOUCHPAD_HEIGHT);
  }
  return { buttons, axes, touchpad: { touching, x, y } };
}
function post(msg) {
  process.send?.(msg);
}
let HID = null;
try {
  const mod = await import("node-hid");
  HID = mod.default ?? mod;
} catch (err) {
  post({
    t: "error",
    message: `node-hid failed to load: ${err instanceof Error ? err.message : String(err)}`
  });
  HID = null;
}
let device = null;
let deviceName = null;
let opening = false;
function findDs4() {
  if (!HID) return null;
  try {
    const devs = HID.devices();
    return devs.find((d) => d.vendorId === VENDOR_SONY && DS4_PIDS.includes(d.productId ?? -1)) ?? null;
  } catch {
    return null;
  }
}
function closeDevice() {
  if (device) {
    try {
      device.close();
    } catch {
    }
    device = null;
  }
  deviceName = null;
  post({ t: "status", connected: false, name: null });
}
function onReport(buf) {
  const parsed = parseDs4Report(buf);
  if (!parsed) return;
  const state = {
    connected: true,
    id: deviceName ?? "DualShock 4",
    buttons: parsed.buttons,
    axes: parsed.axes,
    touchpad: parsed.touchpad,
    timestamp: performance.now()
  };
  post({ t: "state", s: state });
}
function open() {
  if (!HID || device || opening) return;
  const info = findDs4();
  if (!info || !info.path) return;
  opening = true;
  try {
    const dev = new HID.HID(info.path);
    try {
      dev.getFeatureReport(2, 37);
    } catch {
    }
    dev.on("data", (b) => onReport(b));
    dev.on("error", (e) => {
      post({ t: "error", message: `HID read error: ${e.message}` });
      closeDevice();
    });
    device = dev;
    deviceName = info.product ?? "DualShock 4";
    post({ t: "status", connected: true, name: deviceName });
  } catch (err) {
    post({
      t: "error",
      message: `HID open failed (grant Input Monitoring in System Settings?): ${err instanceof Error ? err.message : String(err)}`
    });
    device = null;
  } finally {
    opening = false;
  }
}
setInterval(open, 1e3);
open();
