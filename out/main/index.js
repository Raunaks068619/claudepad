import { ipcMain, systemPreferences, shell, dialog, app, BrowserWindow } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Store from "electron-store";
import { D as DEFAULT_SENSITIVITY, a as ALL_AXES, A as ALL_BUTTONS } from "./chunks/domain-B2CPkCNr.js";
import { spawn, exec, fork, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
const IPC = {
  getConfig: "cp:getConfig",
  saveConfig: "cp:saveConfig",
  setEnabled: "cp:setEnabled",
  execute: "cp:execute",
  setArmed: "cp:setArmed",
  getRuntime: "cp:getRuntime",
  checkPermissions: "cp:checkPermissions",
  openAccessibilitySettings: "cp:openAccessibilitySettings",
  pickPath: "cp:pickPath",
  // main -> renderer push channels (events, not invoke)
  controllerState: "cp:controllerState",
  runtimeStatus: "cp:runtimeStatus"
};
const DEFAULT_PROFILE_ID = "builtin-default";
function makeDefaultProfile() {
  return {
    id: DEFAULT_PROFILE_ID,
    name: "Default — Claude",
    builtin: true,
    sensitivity: { ...DEFAULT_SENSITIVITY },
    bindings: [
      // Face buttons
      { id: "b-cross-send", input: "Cross", trigger: "press", actionId: "claude.desktop.send" },
      { id: "b-circle-stop", input: "Circle", trigger: "press", actionId: "claude.desktop.stop" },
      { id: "b-square-new", input: "Square", trigger: "press", actionId: "claude.desktop.newChat" },
      { id: "b-triangle-search", input: "Triangle", trigger: "press", actionId: "claude.desktop.search" },
      // Bumpers
      { id: "b-l1-send", input: "L1", trigger: "press", actionId: "claude.cli.submit" },
      { id: "b-r1-interrupt", input: "R1", trigger: "press", actionId: "claude.cli.interrupt" },
      // Triggers
      { id: "b-l2-appswitch", input: "L2", trigger: "press", actionId: "sys.appSwitch" },
      { id: "b-r2-model", input: "R2", trigger: "press", actionId: "claude.cli.model" },
      // D-pad -> CLI
      { id: "b-up-model", input: "DpadUp", trigger: "press", actionId: "claude.cli.model" },
      { id: "b-down-clear", input: "DpadDown", trigger: "press", actionId: "claude.cli.clear" },
      { id: "b-left-help", input: "DpadLeft", trigger: "press", actionId: "claude.cli.help" },
      { id: "b-right-newline", input: "DpadRight", trigger: "press", actionId: "claude.desktop.newline" },
      // Stick clicks
      { id: "b-l3-click", input: "L3", trigger: "press", actionId: "sys.leftClick" },
      // Touchpad press = left click (HID backend only; the SDL backend can't
      // see it). Cursor movement is frozen while it's held so a click never drags.
      { id: "b-touchpad-click", input: "Touchpad", trigger: "press", actionId: "sys.leftClick" },
      // Launch
      { id: "b-options-desktop", input: "Options", trigger: "press", actionId: "launch.claudeDesktop" },
      { id: "b-share-terminal", input: "Share", trigger: "press", actionId: "launch.terminal" }
    ],
    axisMaps: [
      { id: "ax-left-cursor", source: "left", target: "cursor", speed: 14 },
      { id: "ax-right-scroll", source: "right", target: "scroll", speed: 8 },
      // Touchpad as a trackpad — only does anything under the HID input backend
      // (the SDL backend can't see the touchpad). Harmless otherwise.
      { id: "ax-touchpad-cursor", source: "touchpad", target: "cursor", speed: 18 }
    ],
    // User-defined commands (added in the Mapper). Empty by default.
    customActions: []
  };
}
function makeDefaultConfig() {
  return {
    onboardingComplete: false,
    activeProfileId: DEFAULT_PROFILE_ID,
    profiles: [makeDefaultProfile()],
    paths: {},
    enabled: true,
    // Default to the proven SDL reader; the user opts into HID (touchpad) in
    // Settings so a first run can't be blocked by node-hid / Input Monitoring.
    inputBackend: "sdl"
  };
}
const store = new Store({
  name: "claudepad-config",
  defaults: makeDefaultConfig()
});
function withDefaults(stored) {
  const defaults = makeDefaultConfig();
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    // Nested objects must be merged, not replaced, so new sub-keys survive.
    paths: { ...defaults.paths, ...stored.paths ?? {} },
    // Profiles are user-owned; only fall back to the built-in set if absent/empty.
    // Each surviving profile is migrated so features added in later versions
    // (e.g. the touchpad axis map) appear on configs saved before they existed.
    profiles: Array.isArray(stored.profiles) && stored.profiles.length > 0 ? stored.profiles.map(migrateProfile) : defaults.profiles
  };
}
function migrateProfile(p) {
  let axisMaps = Array.isArray(p.axisMaps) ? p.axisMaps : [];
  let bindings = Array.isArray(p.bindings) ? p.bindings : [];
  let changed = false;
  if (!axisMaps.some((m) => m.source === "touchpad")) {
    axisMaps = [
      ...axisMaps,
      { id: "ax-touchpad-cursor", source: "touchpad", target: "cursor", speed: 18 }
    ];
    changed = true;
  }
  if (!bindings.some((b) => b.input === "Touchpad")) {
    bindings = [
      ...bindings,
      { id: "b-touchpad-click", input: "Touchpad", trigger: "press", actionId: "sys.leftClick" }
    ];
    changed = true;
  }
  if (!Array.isArray(p.customActions)) {
    return { ...p, axisMaps, bindings, customActions: [] };
  }
  return changed ? { ...p, axisMaps, bindings } : p;
}
function getConfig() {
  return withDefaults(store.store);
}
function saveConfig(cfg) {
  store.store = withDefaults(cfg);
}
function setEnabled(enabled) {
  store.set("enabled", enabled);
}
let nut = null;
let nutLoadAttempted = false;
async function loadNut() {
  if (nutLoadAttempted) return nut;
  nutLoadAttempted = true;
  try {
    nut = await import("@nut-tree-fork/nut-js");
    nut.keyboard.config.autoDelayMs = 4;
  } catch (err) {
    console.warn(
      "[executor] nut.js failed to load — key/mouse intents will be no-ops. App-launch intents still work.",
      err
    );
    nut = null;
  }
  return nut;
}
function tokenToKey(token, Key) {
  switch (token) {
    case "Mod":
      return process.platform === "darwin" ? Key.LeftSuper : Key.LeftControl;
    case "Super":
      return Key.LeftSuper;
    case "Ctrl":
      return Key.LeftControl;
    case "Shift":
      return Key.LeftShift;
    case "Alt":
      return Key.LeftAlt;
    case "Enter":
      return Key.Enter;
    case "Escape":
      return Key.Escape;
    case "Tab":
      return Key.Tab;
    case "Space":
      return Key.Space;
    case "Up":
      return Key.Up;
    case "Down":
      return Key.Down;
    case "Left":
      return Key.Left;
    case "Right":
      return Key.Right;
    case "/":
      return Key.Slash;
  }
  if (/^[Ff]([1-9]|1[0-9])$/.test(token)) {
    const name = token.toUpperCase();
    const k = Key[name];
    return typeof k === "number" ? k : null;
  }
  if (token === "RightAlt") return Key.RightAlt;
  if (token === "RightCtrl") return Key.RightControl;
  if (/^[A-Za-z]$/.test(token)) {
    const name = token.toUpperCase();
    const k = Key[name];
    return typeof k === "number" ? k : null;
  }
  if (/^[0-9]$/.test(token)) {
    const name = `Num${token}`;
    const k = Key[name];
    return typeof k === "number" ? k : null;
  }
  console.warn(`[executor] unknown key token "${token}" — skipping`);
  return null;
}
function toButton(button, Button) {
  if (button === "right") return Button.RIGHT;
  if (button === "middle") return Button.MIDDLE;
  return Button.LEFT;
}
function launchApp(target, cfg) {
  const userPath = cfg.paths?.[target];
  try {
    if (process.platform === "darwin") {
      if (userPath) {
        spawn("open", ["-a", userPath], { detached: true, stdio: "ignore" }).unref();
      } else {
        const appName = target === "claudeDesktop" ? "Claude" : "Terminal";
        spawn("open", ["-a", appName], { detached: true, stdio: "ignore" }).unref();
      }
      return;
    }
    if (process.platform === "win32") {
      if (userPath) {
        exec(`start "" "${userPath}"`, (err) => {
          if (err) console.warn("[executor] launch failed:", err);
        });
      } else {
        exec('start "" wt', (err) => {
          if (err) exec('start "" cmd', (e2) => e2 && console.warn("[executor] launch failed:", e2));
        });
      }
      return;
    }
    if (userPath) {
      const child = spawn(userPath, [], { detached: true, stdio: "ignore" });
      child.on("error", () => {
        spawn("xdg-open", [userPath], { detached: true, stdio: "ignore" }).unref();
      });
      child.unref();
    } else {
      const term = target === "terminal" ? "x-terminal-emulator" : "xdg-open";
      spawn(term, [], { detached: true, stdio: "ignore" }).unref();
    }
  } catch (err) {
    console.warn(`[executor] failed to launch ${target}:`, err);
  }
}
function executeShell(intent, cfg) {
  const { command } = intent;
  if (command.startsWith("launch:")) {
    const key = command.slice("launch:".length);
    if (key === "claudeDesktop" || key === "terminal") {
      launchApp(key, cfg);
    } else {
      console.warn(`[executor] unknown launch target "${key}"`);
    }
    return;
  }
  console.warn(`[executor] ignoring non-launch shell command: ${command}`);
}
async function executeIntents(intents, cfg) {
  const n = await loadNut();
  for (const intent of intents) {
    switch (intent.type) {
      case "noop":
        break;
      case "shell":
        executeShell(intent, cfg);
        break;
      case "keystroke": {
        if (!n) break;
        const { keyboard, Key } = n;
        const keys = intent.keys.map((t) => tokenToKey(t, Key)).filter((k) => k !== null);
        if (keys.length === 0) break;
        await keyboard.pressKey(...keys);
        await keyboard.releaseKey(...keys);
        break;
      }
      case "keyDown": {
        if (!n) break;
        const { keyboard, Key } = n;
        const keys = intent.keys.map((t) => tokenToKey(t, Key)).filter((k) => k !== null);
        if (keys.length === 0) break;
        await keyboard.pressKey(...keys);
        break;
      }
      case "keyUp": {
        if (!n) break;
        const { keyboard, Key } = n;
        const keys = intent.keys.map((t) => tokenToKey(t, Key)).filter((k) => k !== null);
        if (keys.length === 0) break;
        await keyboard.releaseKey(...keys);
        break;
      }
      case "text": {
        if (!n) break;
        await n.keyboard.type(intent.value);
        break;
      }
      case "mouseMove": {
        if (!n) break;
        const { mouse, Point } = n;
        const p = await mouse.getPosition();
        await mouse.setPosition(new Point(p.x + intent.dx, p.y + intent.dy));
        break;
      }
      case "scroll": {
        if (!n) break;
        const { mouse } = n;
        if (intent.dy > 0) await mouse.scrollDown(Math.round(intent.dy));
        else if (intent.dy < 0) await mouse.scrollUp(Math.round(-intent.dy));
        if (intent.dx > 0) await mouse.scrollRight(Math.round(intent.dx));
        else if (intent.dx < 0) await mouse.scrollLeft(Math.round(-intent.dx));
        break;
      }
      case "mouseButton": {
        if (!n) break;
        const { mouse, Button } = n;
        const btn = toButton(intent.button, Button);
        if (intent.action === "click") await mouse.click(btn);
        else if (intent.action === "press") await mouse.pressButton(btn);
        else await mouse.releaseButton(btn);
        break;
      }
    }
  }
}
function registerIpc(service2) {
  ipcMain.handle(IPC.getConfig, () => getConfig());
  ipcMain.handle(IPC.saveConfig, (_evt, cfg) => {
    saveConfig(cfg);
    service2.updateConfig(getConfig());
  });
  ipcMain.handle(IPC.setEnabled, (_evt, enabled) => {
    setEnabled(enabled);
    service2.updateConfig(getConfig());
  });
  ipcMain.handle(IPC.setArmed, (_evt, armed) => {
    service2.setArmed(armed);
  });
  ipcMain.handle(IPC.getRuntime, () => service2.status());
  ipcMain.handle(IPC.execute, async (_evt, intents) => {
    try {
      await executeIntents(intents, getConfig());
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  ipcMain.handle(IPC.checkPermissions, () => {
    if (process.platform === "darwin") {
      const accessibility = systemPreferences.isTrustedAccessibilityClient(false);
      return { accessibility, platform: process.platform };
    }
    return { accessibility: true, platform: process.platform };
  });
  ipcMain.handle(IPC.openAccessibilitySettings, async () => {
    if (process.platform === "darwin") {
      await shell.openExternal(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
      );
    }
  });
  ipcMain.handle(
    IPC.pickPath,
    async (_evt, _kind) => {
      const result = await dialog.showOpenDialog({
        title: "Choose application",
        properties: ["openFile"],
        // Let users pick a .app bundle on macOS as a single selectable file.
        ...process.platform === "darwin" ? { message: "Select an app" } : {}
      });
      if (result.canceled || result.filePaths.length === 0) return void 0;
      return result.filePaths[0];
    }
  );
}
const ACTION_CATALOG = [
  // ---- Claude Desktop (app must be focused) ---------------------------------
  {
    id: "claude.desktop.newChat",
    label: "New chat",
    description: "Start a fresh conversation in Claude Desktop.",
    category: "Claude Desktop",
    intents: [{ type: "keystroke", keys: ["Mod", "N"], description: "New chat" }]
  },
  {
    id: "claude.desktop.send",
    label: "Send message",
    description: "Submit the current prompt.",
    category: "Claude Desktop",
    intents: [{ type: "keystroke", keys: ["Enter"] }]
  },
  {
    id: "claude.desktop.newline",
    label: "New line (no send)",
    description: "Insert a newline without submitting.",
    category: "Claude Desktop",
    intents: [{ type: "keystroke", keys: ["Shift", "Enter"] }]
  },
  {
    id: "claude.desktop.search",
    label: "Search / command bar",
    description: "Open the search / command palette.",
    category: "Claude Desktop",
    intents: [{ type: "keystroke", keys: ["Mod", "K"] }]
  },
  {
    id: "claude.desktop.stop",
    label: "Stop generating",
    description: "Interrupt the current response.",
    category: "Claude Desktop",
    intents: [{ type: "keystroke", keys: ["Escape"] }]
  },
  // ---- Claude Code / CLI (types into the focused terminal) ------------------
  {
    id: "claude.cli.model",
    label: "Switch model (/model)",
    description: "Types the /model slash command and submits it.",
    category: "Claude Code (CLI)",
    intents: [
      { type: "text", value: "/model", description: "Switch model" },
      { type: "keystroke", keys: ["Enter"] }
    ]
  },
  {
    id: "claude.cli.clear",
    label: "Clear context (/clear)",
    description: "Types the /clear slash command and submits it.",
    category: "Claude Code (CLI)",
    intents: [
      { type: "text", value: "/clear" },
      { type: "keystroke", keys: ["Enter"] }
    ]
  },
  {
    id: "claude.cli.help",
    label: "Help (/help)",
    description: "Types /help and submits.",
    category: "Claude Code (CLI)",
    intents: [
      { type: "text", value: "/help" },
      { type: "keystroke", keys: ["Enter"] }
    ]
  },
  {
    id: "claude.cli.submit",
    label: "Submit / accept",
    description: "Press Enter (accept prompt or confirm).",
    category: "Claude Code (CLI)",
    intents: [{ type: "keystroke", keys: ["Enter"] }]
  },
  {
    id: "claude.cli.interrupt",
    label: "Interrupt (Esc)",
    description: "Interrupt the current run.",
    category: "Claude Code (CLI)",
    intents: [{ type: "keystroke", keys: ["Escape"] }]
  },
  // ---- System / navigation --------------------------------------------------
  {
    id: "sys.appSwitch",
    label: "Switch app (quick)",
    description: "One Cmd+Tab — flips to the previous app.",
    category: "System",
    intents: [{ type: "keystroke", keys: ["Mod", "Tab"] }]
  },
  // App switcher HOLD scheme — replicates a full Cmd+Tab so you can hop to ANY
  // window: one button opens & holds the switcher, another advances, releasing
  // the hold button selects. Uses the same keyDown/keyUp hold mechanism as
  // push-to-talk. Suggested: L2 press = open&hold + L2 release = select,
  // R1 = next, L1 = previous.
  {
    id: "sys.appSwitchHold",
    label: "App switcher — open & hold",
    description: 'Holds Cmd and taps Tab to open the switcher and KEEP it open. Bind to "On press"; pair with "App switcher — select" on the SAME button at "On release", and put "App switcher — next"/"previous" on other buttons to move through it.',
    category: "System",
    intents: [
      { type: "keyDown", keys: ["Mod"], description: "Hold Cmd" },
      { type: "keystroke", keys: ["Tab"], description: "Open / next" }
    ]
  },
  {
    id: "sys.appSwitchNext",
    label: "App switcher — next",
    description: "Tap to move to the next app (while the switcher is held open).",
    category: "System",
    intents: [{ type: "keystroke", keys: ["Tab"] }]
  },
  {
    id: "sys.appSwitchPrev",
    label: "App switcher — previous",
    description: "Tap to move to the previous app (Shift+Tab) while the switcher is held open.",
    category: "System",
    intents: [{ type: "keystroke", keys: ["Shift", "Tab"] }]
  },
  {
    id: "sys.appSwitchSelect",
    label: "App switcher — select (release)",
    description: 'Releases Cmd to jump to the highlighted window. Pair with "App switcher — open & hold" on the same button at "On release".',
    category: "System",
    intents: [{ type: "keyUp", keys: ["Mod"], description: "Release Cmd (select)" }]
  },
  {
    id: "sys.copy",
    label: "Copy",
    description: "Copy selection.",
    category: "System",
    intents: [{ type: "keystroke", keys: ["Mod", "C"] }]
  },
  {
    id: "sys.paste",
    label: "Paste",
    description: "Paste clipboard.",
    category: "System",
    intents: [{ type: "keystroke", keys: ["Mod", "V"] }]
  },
  {
    id: "sys.leftClick",
    label: "Left click",
    description: "Click at the current cursor position.",
    category: "System",
    intents: [{ type: "mouseButton", button: "left", action: "click" }]
  },
  // ---- Dictation push-to-talk (Wispr Flow / Vordi etc.) --------------------
  // WHY NOT Fn: macOS ignores a *synthesized* Fn/Globe key (Apple bug
  // FB9093710, still open) — robotjs/libnut/nut.js all post CGEvents, the exact
  // path macOS drops the Fn flag on. So a controller can never fake real Fn.
  // Instead we hold a normal, reliably-synthesizable trigger and you point the
  // dictation app's push-to-talk shortcut at THAT key.
  //
  // To make a button work like "hold to talk": bind the SAME controller button
  // twice — the "start" action on trigger "On press", the "stop" action on
  // trigger "On release". Holding the button then holds the key.
  {
    id: "dictation.pttStart",
    label: "Push-to-talk — start (hold Ctrl+Alt)",
    description: `Presses and holds Ctrl+Alt. This is Wispr Flow's own default push-to-talk shortcut when no Apple Fn key is present, so it is guaranteed valid. Bind on "On press" and pair with "Push-to-talk — stop" on "On release".`,
    category: "Dictation",
    intents: [{ type: "keyDown", keys: ["Ctrl", "Alt"], description: "PTT down (Ctrl+Alt)" }]
  },
  {
    id: "dictation.pttStop",
    label: "Push-to-talk — stop (release Ctrl+Alt)",
    description: 'Releases Ctrl+Alt. Pair with "Push-to-talk — start" on the same button.',
    category: "Dictation",
    intents: [{ type: "keyUp", keys: ["Ctrl", "Alt"], description: "PTT up (Ctrl+Alt)" }]
  },
  {
    id: "dictation.f13Start",
    label: "Push-to-talk — start (hold F13)",
    description: `Presses and holds F13 — an unused, collision-free key on macOS. Use if your dictation app's shortcut picker accepts a single key. Pair with the F13 stop action on "On release".`,
    category: "Dictation",
    intents: [{ type: "keyDown", keys: ["F13"], description: "PTT down (F13)" }]
  },
  {
    id: "dictation.f13Stop",
    label: "Push-to-talk — stop (release F13)",
    description: 'Releases F13. Pair with "Push-to-talk — start (hold F13)" on the same button.',
    category: "Dictation",
    intents: [{ type: "keyUp", keys: ["F13"], description: "PTT up (F13)" }]
  },
  // ---- Launch (uses configured paths) --------------------------------------
  {
    id: "launch.claudeDesktop",
    label: "Launch Claude Desktop",
    description: "Open (or focus) the Claude Desktop app.",
    category: "Launch",
    intents: [{ type: "shell", command: "launch:claudeDesktop", description: "Launch Claude Desktop" }]
  },
  {
    id: "launch.terminal",
    label: "Launch terminal",
    description: "Open your configured terminal for Claude CLI.",
    category: "Launch",
    intents: [{ type: "shell", command: "launch:terminal", description: "Launch terminal" }]
  }
];
const CATALOG_INDEX = Object.fromEntries(
  ACTION_CATALOG.map((a) => [a.id, a])
);
function getAction(id) {
  return CATALOG_INDEX[id];
}
function customActionIntents(ca) {
  if (ca.kind === "text") {
    const out = [];
    if (ca.text) out.push({ type: "text", value: ca.text, description: ca.label });
    if (ca.submit) out.push({ type: "keystroke", keys: ["Enter"] });
    return out;
  }
  if (ca.keys && ca.keys.length > 0) {
    return [{ type: "keystroke", keys: ca.keys, description: ca.label }];
  }
  return [];
}
const emptyButtons = () => Object.fromEntries(ALL_BUTTONS.map((b) => [b, false]));
const emptyAxes = () => Object.fromEntries(ALL_AXES.map((a) => [a, 0]));
function emptyControllerState() {
  return {
    connected: false,
    id: "",
    buttons: emptyButtons(),
    axes: emptyAxes(),
    touchpad: { touching: false, x: 0, y: 0 },
    timestamp: 0
  };
}
const HOLD_REPEAT_MS = 90;
const TOUCHPAD_GAIN = 50;
function createRuntime() {
  return { prev: emptyControllerState(), lastHoldFire: {} };
}
function isPressed(state, id, sens) {
  if (id === "L2") return state.axes.L2 >= sens.triggerThreshold;
  if (id === "R2") return state.axes.R2 >= sens.triggerThreshold;
  return state.buttons[id];
}
function shapeAxis(v, sens) {
  const sign = Math.sign(v);
  const mag = Math.abs(v);
  if (mag < sens.deadzone) return 0;
  const norm = (mag - sens.deadzone) / (1 - sens.deadzone);
  return sign * Math.pow(norm, sens.curve);
}
function expandBinding(binding, customActions) {
  const custom = customActions.find((c) => c.id === binding.actionId);
  if (custom) return customActionIntents(custom);
  const action = getAction(binding.actionId);
  return action ? action.intents : [];
}
function step(rt, curr, profile) {
  const intents = [];
  const sens = profile.sensitivity;
  const prev = rt.prev;
  for (const binding of profile.bindings) {
    const nowPressed = isPressed(curr, binding.input, sens);
    const wasPressed = isPressed(prev, binding.input, sens);
    let fire = false;
    if (binding.trigger === "press") {
      fire = nowPressed && !wasPressed;
    } else if (binding.trigger === "release") {
      fire = !nowPressed && wasPressed;
    } else {
      if (nowPressed) {
        const rising = !wasPressed;
        const last = rt.lastHoldFire[binding.id] ?? -Infinity;
        if (rising || curr.timestamp - last >= HOLD_REPEAT_MS) {
          fire = true;
          rt.lastHoldFire[binding.id] = curr.timestamp;
        }
      } else {
        delete rt.lastHoldFire[binding.id];
      }
    }
    if (fire) intents.push(...expandBinding(binding, profile.customActions ?? []));
  }
  for (const map of profile.axisMaps) {
    if (map.source === "touchpad") {
      if (curr.buttons.Touchpad) continue;
      const t = curr.touchpad;
      const p = prev.touchpad;
      if (t.touching && p.touching) {
        const dx2 = (t.x - p.x) * map.speed * TOUCHPAD_GAIN;
        const dy2 = (t.y - p.y) * map.speed * TOUCHPAD_GAIN;
        if (dx2 !== 0 || dy2 !== 0) {
          if (map.target === "cursor") intents.push({ type: "mouseMove", dx: dx2, dy: dy2 });
          else intents.push({ type: "scroll", dx: dx2, dy: -dy2 });
        }
      }
      continue;
    }
    const xId = map.source === "left" ? "LeftX" : "RightX";
    const yId = map.source === "left" ? "LeftY" : "RightY";
    const dx = shapeAxis(curr.axes[xId], sens) * map.speed;
    const dy = shapeAxis(curr.axes[yId], sens) * map.speed;
    if (dx === 0 && dy === 0) continue;
    if (map.target === "cursor") {
      intents.push({ type: "mouseMove", dx, dy });
    } else {
      intents.push({ type: "scroll", dx, dy: -dy });
    }
  }
  rt.prev = curr;
  return { intents };
}
const __dirname$2 = dirname(fileURLToPath(import.meta.url));
const STATE_PUSH_EVERY = 2;
function resolveNodePath() {
  if (process.env.CLAUDEPAD_NODE && existsSync(process.env.CLAUDEPAD_NODE)) {
    return process.env.CLAUDEPAD_NODE;
  }
  const bundled = process.resourcesPath ? join(process.resourcesPath, "node") : null;
  if (bundled && existsSync(bundled)) return bundled;
  const candidates = ["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"];
  for (const c of candidates) if (existsSync(c)) return c;
  try {
    const found = execSync("command -v node", { encoding: "utf8" }).trim();
    if (found) return found;
  } catch {
  }
  return "node";
}
class GamepadService {
  constructor(deps) {
    this.deps = deps;
    this.config = deps.getConfig();
  }
  worker = null;
  controllerName = null;
  connected = false;
  rt = createRuntime();
  config;
  armed = false;
  // safety gate; default OFF on launch
  queue = [];
  // pending intents; drained serially, never dropped
  draining = false;
  frame = 0;
  async start() {
    this.config = this.deps.getConfig();
    this.spawnWorker();
    this.emitStatus();
  }
  stop() {
    if (this.worker) {
      try {
        this.worker.kill();
      } catch {
      }
      this.worker = null;
    }
  }
  setArmed(armed) {
    this.armed = armed;
    this.emitStatus();
  }
  updateConfig(config) {
    const prevBackend = this.config.inputBackend ?? "sdl";
    this.config = config;
    if ((config.inputBackend ?? "sdl") !== prevBackend) {
      this.restartWorker();
    }
    this.emitStatus();
  }
  /** Tear down the current worker and start the one for the active backend. */
  restartWorker() {
    const old = this.worker;
    this.worker = null;
    if (old) {
      try {
        old.kill();
      } catch {
      }
    }
    this.connected = false;
    this.controllerName = null;
    this.spawnWorker();
  }
  status() {
    return {
      enabled: this.config.enabled,
      armed: this.armed,
      connected: this.connected,
      controllerName: this.controllerName
    };
  }
  emitStatus() {
    this.deps.sendRuntimeStatus(this.status());
  }
  activeProfile() {
    return this.config.profiles.find((p) => p.id === this.config.activeProfileId) ?? this.config.profiles[0] ?? null;
  }
  spawnWorker() {
    const backend = this.config.inputBackend ?? "sdl";
    const workerFile = backend === "hid" ? "hid-worker.js" : "input-worker.js";
    const workerPath = join(__dirname$2, workerFile);
    const child = fork(workerPath, [], {
      execPath: resolveNodePath(),
      stdio: ["ignore", "inherit", "inherit", "ipc"]
    });
    this.worker = child;
    child.on("message", (msg) => this.onWorkerMessage(msg));
    child.on("exit", (code) => {
      console.warn("[gamepad] input worker exited", code);
      this.connected = false;
      this.controllerName = null;
      this.emitStatus();
      if (this.worker === child) {
        this.worker = null;
        setTimeout(() => {
          if (!this.worker) this.spawnWorker();
        }, 1500);
      }
    });
  }
  onWorkerMessage(msg) {
    if (msg.t === "error") {
      console.error("[gamepad] worker:", msg.message);
      return;
    }
    if (msg.t === "status") {
      this.connected = msg.connected;
      this.controllerName = msg.name;
      this.emitStatus();
      return;
    }
    this.handleState(msg.s);
  }
  handleState(state) {
    if (!this.connected) {
      this.connected = true;
      this.emitStatus();
    }
    this.frame = (this.frame + 1) % STATE_PUSH_EVERY;
    if (this.frame === 0) this.deps.sendControllerState(state);
    const profile = this.activeProfile();
    if (!profile) {
      this.rt.prev = state;
      return;
    }
    const { intents } = step(this.rt, state, profile);
    if (this.config.enabled && this.armed && intents.length > 0) {
      this.enqueue(intents);
      void this.drain();
    }
  }
  /**
   * Append a frame's intents to the pending queue WITHOUT dropping any.
   *
   * WHY not just fire-and-forget per frame: nut.js calls must not overlap
   * (out-of-order key/mouse events), so exactly one drain runs at a time.
   * The old design gated on an `inFlight` flag and simply DISCARDED any frame
   * produced while the executor was busy — which silently ate edge-triggered
   * presses (a click or app-switch is a single rising-edge frame; once step()
   * advances `prev`, that edge is gone). Because the left stick drives the
   * cursor, `mouseMove` intents keep the executor busy almost continuously, so
   * those single-frame presses were dropped nearly every time.
   *
   * Fix: queue everything. Continuous motion (mouseMove/scroll) is COALESCED
   * into the tail so a backlog can't build up while draining, but discrete
   * intents (keystrokes, clicks, launches) are always preserved in order.
   */
  enqueue(intents) {
    for (const it of intents) {
      const tail = this.queue[this.queue.length - 1];
      if (it.type === "mouseMove" && tail?.type === "mouseMove") {
        tail.dx += it.dx;
        tail.dy += it.dy;
      } else if (it.type === "scroll" && tail?.type === "scroll") {
        tail.dx += it.dx;
        tail.dy += it.dy;
      } else {
        this.queue.push(it);
      }
    }
  }
  /**
   * Drain the queue serially. Idempotent: if a drain is already running it
   * returns immediately, and the running loop picks up anything enqueued while
   * it was awaiting the executor.
   */
  async drain() {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const batch = this.queue;
        this.queue = [];
        await executeIntents(batch, this.config);
      }
    } catch (e) {
      console.error("[gamepad] execute error:", e);
    } finally {
      this.draining = false;
    }
  }
}
const __dirname$1 = dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
let service = null;
function sendToRenderer(channel, payload) {
  const wc = mainWindow?.webContents;
  if (wc && !wc.isDestroyed()) wc.send(channel, payload);
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: join(__dirname$1, "../preload/index.mjs"),
      sandbox: false,
      contextIsolation: true
    }
  });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname$1, "../renderer/index.html"));
  }
}
app.whenReady().then(async () => {
  createWindow();
  service = new GamepadService({
    getConfig: () => getConfig(),
    sendControllerState: (state) => sendToRenderer(IPC.controllerState, state),
    sendRuntimeStatus: (status) => sendToRenderer(IPC.runtimeStatus, status)
  });
  registerIpc(service);
  await service.start();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  service?.stop();
});
