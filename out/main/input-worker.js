import { A as ALL_BUTTONS, a as ALL_AXES } from "./chunks/domain-B2CPkCNr.js";
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
const REST_RELEASE = 2e-3;
const TRIGGER_DEADBAND = 0.04;
function makeTriggerCalibrator() {
  const rest = { L2: Infinity, R2: Infinity };
  return {
    apply(id, raw) {
      const r = rest[id];
      if (raw < r) {
        rest[id] = raw;
      } else if (r !== Infinity) {
        rest[id] = r + (raw - r) * REST_RELEASE;
      } else {
        rest[id] = raw;
      }
      const floor = rest[id];
      const span = 1 - floor;
      const norm = span > 0.05 ? (raw - floor) / span : raw;
      return norm < TRIGGER_DEADBAND ? 0 : norm > 1 ? 1 : norm;
    }
  };
}
function toControllerState(c, name, cal) {
  const b = c.buttons;
  const a = c.axes;
  const buttons = Object.fromEntries(ALL_BUTTONS.map((x) => [x, false]));
  buttons.Cross = !!b.a;
  buttons.Circle = !!b.b;
  buttons.Square = !!b.x;
  buttons.Triangle = !!b.y;
  buttons.L1 = !!b.leftShoulder;
  buttons.R1 = !!b.rightShoulder;
  buttons.Share = !!b.back;
  buttons.Options = !!b.start;
  buttons.L3 = !!b.leftStick;
  buttons.R3 = !!b.rightStick;
  buttons.DpadUp = !!b.dpadUp;
  buttons.DpadDown = !!b.dpadDown;
  buttons.DpadLeft = !!b.dpadLeft;
  buttons.DpadRight = !!b.dpadRight;
  buttons.PS = !!b.guide;
  const axes = Object.fromEntries(ALL_AXES.map((x) => [x, 0]));
  axes.LeftX = a.leftStickX ?? 0;
  axes.LeftY = a.leftStickY ?? 0;
  axes.RightX = a.rightStickX ?? 0;
  axes.RightY = a.rightStickY ?? 0;
  const l2 = clamp01(a.leftTrigger ?? 0);
  const r2 = clamp01(a.rightTrigger ?? 0);
  axes.L2 = cal ? cal.apply("L2", l2) : l2;
  axes.R2 = cal ? cal.apply("R2", r2) : r2;
  return {
    connected: true,
    id: name,
    buttons,
    axes,
    touchpad: { touching: false, x: 0, y: 0 },
    timestamp: performance.now()
  };
}
const TICK_MS = 16;
function post(msg) {
  process.send?.(msg);
}
let sdl = null;
try {
  const mod = await import("@kmamal/sdl");
  sdl = mod.default ?? mod;
} catch (err) {
  post({ t: "error", message: `SDL failed to load: ${err instanceof Error ? err.message : String(err)}` });
  sdl = null;
}
let controller = null;
let controllerName = null;
let calibrator = makeTriggerCalibrator();
function ensureController() {
  if (!sdl) return;
  if (controller && !controller.closed) return;
  if (controller && controller.closed) {
    controller = null;
    controllerName = null;
    post({ t: "status", connected: false, name: null });
  }
  const device = sdl.controller.devices[0];
  if (!device) return;
  try {
    controller = sdl.controller.openDevice(device);
    controllerName = device.name ?? "Controller";
    calibrator = makeTriggerCalibrator();
    post({ t: "status", connected: true, name: controllerName });
  } catch (err) {
    post({ t: "error", message: `open failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}
setInterval(() => {
  try {
    ensureController();
    if (!controller || controller.closed) return;
    post({ t: "state", s: toControllerState(controller, controllerName ?? "Controller", calibrator) });
  } catch (err) {
    post({ t: "error", message: err instanceof Error ? err.message : String(err) });
  }
}, TICK_MS);
