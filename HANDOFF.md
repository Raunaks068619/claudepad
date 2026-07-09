# ClaudePad — Handoff

Status as of this session: **working end-to-end on macOS (Apple Silicon, Node 25).** A PS4 DualShock controller drives Claude Desktop / Claude CLI / the OS, and input is read at the OS level so it **keeps working while another app is focused** (the original blocker). Typecheck clean (main + renderer), engine unit tests 7/7.

Location on disk: `~/Documents/claudepad`. Canonical source also in the session outputs folder.

---

## 1. What it is

An Electron app that maps a game controller to actions:
- **Claude Desktop** hotkeys (new chat, send, stop, search)
- **Claude CLI** slash commands (`/model`, `/clear`, `/help`, submit, interrupt)
- **System** (cursor via left stick, scroll via right stick, app switch, copy/paste, click)
- **Launch** Claude Desktop / a terminal

Bindings, triggers (press/release/hold), and sensitivity are all user-editable and persisted.

---

## 2. Architecture — THREE processes (read this first)

```
┌────────────────────┐   child_process.fork (SYSTEM node)   ┌───────────────────────┐
│  input-worker.js   │  ───────────────────────────────────▶│  Electron MAIN         │
│  (system Node)     │   process.send({t:'state', s})       │  GamepadService        │
│  @kmamal/sdl reads │◀──────────────────────────────────── │   • pure engine.step() │
│  the controller    │                                       │   • executor (nut.js)  │
└────────────────────┘                                       │   • forwards state     │
                                                             └──────────┬────────────┘
                                                        IPC (contextBridge)  │ webContents.send
                                                                            ▼
                                                             ┌───────────────────────┐
                                                             │  RENDERER (React)      │
                                                             │  Tester / Mapper /     │
                                                             │  Settings / Onboarding │
                                                             │  (UI + config only)    │
                                                             └───────────────────────┘
```

- **input-worker** (`src/main/input-worker.ts`): the ONLY place SDL runs. Reads the pad ~60Hz, posts normalized `ControllerState`. Nothing else.
- **Electron main** (`src/main/`): spawns/monitors the worker, runs the **pure mapping engine** (`src/shared/mapping-engine.ts`), actuates via **nut.js** (`src/main/executor.ts`) when `enabled && armed`, persists config (`electron-store`), and pushes state/status to the renderer.
- **Renderer** (`src/renderer/`): React + Mantine. Pure UI — live tester, binding editor, onboarding, settings. It does **not** read the controller or run the engine anymore; it consumes the main-process feed via `window.claudepad.onControllerState`.

The IPC contract lives in `src/shared/bridge.ts` (single source of truth for both sides).

---

## 3. The decision trail (so nobody re-walks the dead ends)

This took three architectures. Understanding why matters more than the code.

1. **v1 — input in the renderer via the browser Gamepad API.** Zero native deps, instant cross-platform. **Fatal flaw:** Chromium only updates gamepad state while its window is focused, and `requestAnimationFrame` throttles when hidden. Since the app exists to drive *other* apps, it was never focused when needed → output "stopped" on app-switch/minimize. Also, the Gamepad API doesn't expose the DS4 **touchpad** position (only sticks/buttons/triggers).

2. **v2 — input + SDL in the Electron MAIN process.** Focus-independent. **Fatal flaw:** on macOS, SDL wants to own the app run loop that Chromium already owns; initializing `@kmamal/sdl` in the main process crashed the app (showed Electron's default "no app" screen, then exited).

3. **v3 (current) — SDL in an isolated worker process.** First tried Electron `utilityProcess.fork` → the worker crashed with exit 11 because `@kmamal/sdl`'s native addon **segfaults under Electron's Node ABI** (a bare `require` produced zero output). Fix: fork the worker with the **system Node binary** (`child_process.fork` + `execPath: resolveNodePath()`), where the SDL prebuilt matches. Worker now stable; a native SDL crash can only kill the worker (auto-respawned), never the app.

**Takeaways for future work:**
- Never read the controller in the renderer.
- Never load `@kmamal/sdl` in the Electron main or under Electron's Node.
- The worker must run under a Node whose ABI matches the installed SDL prebuild.

---

## 4. Run it

```bash
cd ~/Documents/claudepad
npm install        # installs nut.js (native, compiled) + @kmamal/sdl (native, prebuilt)
npm run dev        # electron-vite dev; opens the app
```

Or double-click `run.command` (handles install + clean-retry + launch).

First-run setup (onboarding asks up front):
1. **Accessibility** (macOS) — required for nut.js to synthesize input. Note: because the SDL worker runs under **system Node**, the process that needs Accessibility trust is your **Node/Terminal**, not Electron. If keystrokes don't fire when armed, grant Accessibility to the terminal/Node running the app.
2. Controller — SDL detects it automatically (no button press needed).
3. App paths — optional, for the Launch buttons.

Then: **Arm controller output** (top of the app) → use the pad while Claude is focused.

---

## 5. Verification done this session

- `npm run typecheck` — clean (main + renderer), exit 0.
- `npm test` — 7/7 engine unit tests pass (edge detection, deadzone/curve, trigger threshold, axis→cursor). A real bug was caught + fixed: `hold` bindings now fire on the initial press.
- Live on the Mac: app renders, `PS4 Controller` connected, Tester shows live RAW→SHAPED axis values, worker stable under system Node.

---

## 6. Known issues / next steps

- **Packaging (important).** Dev works because a system Node is on PATH. A distributable `.app`/`.exe`/`.AppImage` must either (a) bundle a Node binary to run the worker, or (b) rebuild `@kmamal/sdl` for Electron's ABI via `@electron/rebuild` and go back to `utilityProcess`. `resolveNodePath()` currently probes PATH + common locations + `CLAUDEPAD_NODE` env override.
- **Touchpad → cursor.** SDL's controller abstraction surfaces the touchpad *click* inconsistently and not finger position; cursor is on the left stick by design. Touchpad motion would need `SDL_CONTROLLERTOUCHPADMOTION` (raw) — a follow-up.
- **Claude hotkeys are presets.** Claude Desktop/CLI don't publish a hotkey contract; the default bindings are sensible guesses and fully editable in the Mapper.
- **Trigger/stick rest calibration.** If L2/R2 or sticks read non-zero at rest, expose a calibration offset (deadzone already mitigates sticks).
- **Windows/Linux.** Architecture is cross-platform (SDL + nut.js + Electron all are), but only macOS has been run this session. Verify the `resolveNodePath` fallbacks and launch commands per-OS.

---

## 7. File map

```
src/
  shared/                 # pure, platform-agnostic, unit-tested — the "brain"
    domain.ts               # types: ControllerState, Intent, Binding, Profile…
    gamepad-mapping.ts      # (browser) Gamepad API standard layout → IDs (used only for types/empty state now)
    claude-actions.ts       # the Claude action catalog (what a button can do)
    mapping-engine.ts       # step(): levels → edges → Intent[]  ← the heart
    default-profile.ts      # built-in controller → Claude mapping
    bridge.ts               # renderer↔main IPC contract (channels + types)
  main/                   # Electron main (actuation, persistence, orchestration)
    index.ts                # window + starts GamepadService + IPC
    gamepad.ts              # spawns worker (system node), runs engine, actuates, forwards state
    input-worker.ts         # ISOLATED SDL reader (runs under system Node)
    sdl-read.ts             # SDL state → ControllerState mapping + worker message types
    executor.ts             # Intent → OS (nut.js keys/mouse, app launches)
    ipc.ts                  # ipcMain handlers
    store.ts                # electron-store (typed to AppConfig)
  preload/
    index.ts                # contextBridge → window.claudepad
    index.d.ts              # global Window augmentation
  renderer/                 # React + Mantine UI (no Tailwind)
    src/hooks/useControllerFeed.ts   # subscribes to main's controller feed
    src/hooks/useRuntime.ts          # arm state + runtime status
    src/state/useConfig.ts           # config load/save
    src/pages/{Tester,Mapper,Settings,Onboarding}Page.tsx
    src/components/{ControllerVisual,BindingRow}.tsx
electron.vite.config.ts     # two main entries: index + input-worker
```

Stack: electron-vite · React 18 · Mantine v7 · nut.js · @kmamal/sdl · TypeScript (strict) · Vitest.
