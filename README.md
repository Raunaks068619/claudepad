# 🎮 ClaudePad

**Drive Claude Desktop, Claude Code (CLI), and your OS with a PS4 / DualShock controller.**
Cross-platform: **macOS · Windows · Linux**.

[![Download macOS .dmg](https://img.shields.io/badge/Download-macOS%20.dmg-black?logo=apple)](https://github.com/Raunaks068619/claudepad/releases/latest)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)

Map any button to a Claude action (send, stop, new chat, slash commands), steer the cursor with the sticks, and tune sensitivity live — all from the couch.

> 📹 **Demo:** _add your video link here_

---

## ▶️ Run it — one command, no install

If you have **Node 18+**, just run it. No clone, no build, no `.dmg`, **no code-signing** — it works on **macOS · Windows · Linux**:

```bash
npx github:Raunaks068619/claudepad
```

That fetches and launches ClaudePad. On **macOS**, grant **Accessibility** to your terminal when asked (System Settings → Privacy & Security → Accessibility) so it can send input. Then pair your DualShock over Bluetooth/USB, hit **Arm**, and drive Claude.

<sub>Needs Node 18+, a network connection, and a controller. Most machines use prebuilt native binaries; unusual Node/OS combos may compile `node-hid` (needs Xcode Command Line Tools / build-essential).</sub>

---

## ⬇️ Prefer a native app? (optional macOS `.dmg`)

No Node? Grab the **[macOS `.dmg`](https://github.com/Raunaks068619/claudepad/releases/latest)** (Apple Silicon) — drag **ClaudePad** to **Applications** and open. Everything is bundled; no Node required.

> It's **unsigned** (open source, no Apple Developer ID), so the first open needs **right-click → Open → Open** — or once in Terminal:
> ```bash
> xattr -dr com.apple.quarantine /Applications/ClaudePad.app
> ```
> Then grant **Accessibility** when prompted.

---

## Why this exists

Claude runs on a keyboard-and-mouse desktop app. A game controller is a comfortable, tactile, accessible input device that's just sitting there. ClaudePad bridges the two — so you can send prompts, stop generation, scroll, and move the cursor **without reaching for the keyboard**.

The interesting part is that it **keeps working while Claude is the focused app** — the controller is read at the OS level, not inside the app's own window (see the architecture below for why that took three tries).

---

## Default mapping (fully editable in the app)

| Input | Action |
|---|---|
| ✕ Cross | Send message (Claude Desktop) |
| ○ Circle | Stop generating |
| □ Square | New chat |
| △ Triangle | Search / command bar |
| L1 | Submit (CLI) |
| R1 | Interrupt (CLI) |
| L2 | Switch app (OS) |
| R2 | Switch model — `/model` (CLI) |
| D-pad ↑ | `/model` |
| D-pad ↓ | `/clear` |
| D-pad ← | `/help` |
| D-pad → | New line (no send) |
| L3 (stick click) | Left click |
| Options | Launch Claude Desktop |
| Share | Launch terminal |
| **Left stick** | Move cursor |
| **Right stick** | Scroll |

> ⚠️ Claude Desktop / Claude Code don't publish a guaranteed hotkey contract, so the Claude-app bindings above are **sensible presets**. The real value of ClaudePad is the *mapping framework* — every binding, trigger (press / release / hold), and sensitivity value is editable in the **Mapper** and **Tester** screens, and saved to disk.

---

## Architecture — three processes

The controller is read **outside** the Electron renderer on purpose. Chromium's Gamepad API only updates while its own window is focused — useless for an app whose entire job is to drive *other* apps. So input is read natively (SDL) in an isolated worker, and the pure mapping engine + OS actuation live in the Electron main process.

```
┌────────────────────┐   child_process.fork (system Node)   ┌────────────────────────┐
│  input-worker      │ ───────────────────────────────────▶ │  Electron MAIN          │
│  (system Node)     │   process.send({ t:'state', s })     │   • pure engine.step()  │
│  @kmamal/sdl reads │ ◀─────────────────────────────────── │   • executor (nut.js)   │
│  the controller    │                                       │   • forwards state      │
└────────────────────┘                                       └───────────┬────────────┘
                                              IPC (contextBridge) │  webContents.send
                                                                  ▼
                                                    ┌────────────────────────┐
                                                    │  RENDERER (React)       │
                                                    │  Tester / Mapper /      │
                                                    │  Settings / Onboarding  │
                                                    │  (UI + config only)     │
                                                    └────────────────────────┘
```

- **input-worker** (`src/main/input-worker.ts`) — the **only** place SDL runs. Reads the pad ~60 Hz and posts a normalized `ControllerState`. Forked with the **system Node** binary because `@kmamal/sdl`'s native addon segfaults under Electron's Node ABI. A native crash can only kill the worker (auto-respawned), never the app.
- **Electron main** (`src/main/`) — spawns/monitors the worker, runs the **pure mapping engine** (`src/shared/mapping-engine.ts`), actuates via **nut.js** (`src/main/executor.ts`) when `enabled && armed`, persists config (`electron-store`), and pushes state to the renderer.
- **Renderer** (`src/renderer/`) — React + Mantine. Pure UI: live tester, binding editor, onboarding, settings. It **does not** read the controller or run the engine.

**The core insight:** a gamepad reports its *entire state ~60×/second* (a level). A keyboard expects *events* (edges). The mapping engine's one job is to convert **levels → edges** (just-pressed / just-released) and stick deflection → cursor/scroll — with deadzone + response curve applied. See `src/shared/mapping-engine.ts`.

The renderer↔main IPC contract lives in `src/shared/bridge.ts` (single source of truth for both sides).

---

## Getting started

```bash
npm install        # nut.js (native, compiled) + @kmamal/sdl (native, prebuilt)
npm run dev        # electron-vite dev; opens the app
```

Or double-click `run.command` (handles install + clean-retry + launch on macOS).

Then follow the **onboarding**, which asks for permissions up front:

1. **Welcome**
2. **Permissions (macOS)** — grant **Accessibility** so synthetic input works. Note: because the SDL worker runs under **system Node**, the process that needs Accessibility trust is your **terminal / Node**, not Electron. If keystrokes don't fire when armed, grant Accessibility to the terminal running the app. Windows/Linux need no special grant.
3. **Connect controller** — SDL detects it automatically (no button press needed).
4. **Apps (optional)** — point ClaudePad at your Claude Desktop app and preferred terminal so the Launch buttons work.
5. **Done.**

Then **Arm controller output** at the top of the app and use the pad while Claude is focused.

### Screens
- **Tester** — live controller visualization, every button/axis readout, and sensitivity sliders (deadzone / curve / trigger threshold) with a **raw vs shaped** stick preview. Output is **disarmed** here so you can test safely.
- **Mapper** — edit bindings (input → trigger → action, grouped by category), add/remove bindings, and configure stick → cursor/scroll speed. Output is **armed**.
- **Settings** — master enable switch, app paths, re-check permissions.

---

## Packaging (per-OS installers)

```bash
npm run package:mac      # .dmg
npm run package:win      # .exe (NSIS)
npm run package:linux    # .AppImage
```

> **Packaging note:** dev relies on a system Node being on `PATH` to run the SDL worker. A distributable must either bundle a Node binary for the worker or rebuild `@kmamal/sdl` for Electron's ABI (`@electron/rebuild`) and switch back to `utilityProcess`. `resolveNodePath()` currently probes `PATH`, common locations, and a `CLAUDEPAD_NODE` env override. See the roadmap.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Run the app with hot reload |
| `npm run typecheck` | Type-check main + renderer |
| `npm test` | Run the mapping-engine unit tests (Vitest) |
| `npm run build` | Bundle main/preload/renderer |
| `npm run package:{mac,win,linux}` | Build a distributable |

---

## Project layout

```
src/
  shared/                 # pure, platform-agnostic, unit-tested — the "brain"
    domain.ts               # types: ControllerState, Intent, Binding, Profile…
    claude-actions.ts       # the Claude action catalog (what a button can do)
    mapping-engine.ts       # step(): levels → edges → Intent[]  ← the heart
    default-profile.ts      # built-in controller → Claude mapping
    bridge.ts               # renderer↔main IPC contract (channels + types)
  main/                   # Electron main (actuation, persistence, orchestration)
    index.ts                # window + starts the gamepad service + IPC
    gamepad.ts              # spawns worker (system Node), runs engine, actuates, forwards state
    input-worker.ts         # ISOLATED SDL reader (runs under system Node)
    sdl-read.ts             # SDL state → ControllerState mapping + worker message types
    executor.ts             # Intent → OS (nut.js keys/mouse, app launches)
    ipc.ts                  # ipcMain handlers
    store.ts                # electron-store (typed to AppConfig)
  preload/                # contextBridge → window.claudepad
  renderer/               # React + Mantine UI (Tester / Mapper / Settings / Onboarding)
```

---

## Roadmap / known limitations

- **Packaging a self-contained app** — bundle Node for the worker, or rebuild `@kmamal/sdl` for Electron's ABI. (Dev works today.)
- **Claude hotkeys are presets** — Claude Desktop / CLI don't publish a hotkey contract; the defaults are sensible guesses and fully editable in the Mapper.
- **Windows / Linux** — the stack (SDL + nut.js + Electron) is cross-platform, but only macOS (Apple Silicon) has been run end-to-end so far. Verify the `resolveNodePath` fallbacks and launch commands per OS.
- **DS4 touchpad → cursor** — would need raw `SDL_CONTROLLERTOUCHPADMOTION`; cursor is on the left stick by design for now.
- **Trigger / stick rest calibration** — expose a calibration offset if L2/R2 or sticks read non-zero at rest.

Contributions on any of these are very welcome. 🙌

---

## Contributing

Issues and PRs welcome. The mapping engine and action catalog are **data-driven** — adding a new Claude action or binding is usually a small, well-isolated change in `src/shared/`. Please run `npm run typecheck` and `npm test` before opening a PR.

## License

[MIT](LICENSE) © Raunak Singh — do whatever you like with it.

---

Built with electron-vite · React 18 · Mantine v7 · nut.js · @kmamal/sdl · TypeScript (strict) · Vitest.
