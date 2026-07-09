/**
 * The OS actuator: turns platform-agnostic Intents into real key presses,
 * mouse movement, and app launches.
 *
 * WHY this lives only in main: nut.js is a native module and app-launching
 * touches child_process — neither belongs in the sandboxed renderer. The
 * renderer produces pure Intent data (see shared/domain.ts) and hands it here.
 *
 * Robustness stance: the native input backend (nut.js) may fail to load on some
 * machines (missing build tools, unsupported arch, Wayland, etc.). We refuse to
 * let that take down the whole app — instead we load it defensively and, if it
 * is unavailable, degrade key/mouse intents to no-ops while KEEPING app-launch
 * working (launches only need child_process, not nut.js).
 */

import { spawn, exec } from 'node:child_process'
import type { AppConfig, Intent } from '../shared/domain'

/**
 * nut.js is loaded lazily and defensively. Typed as the module's own type so we
 * keep full type-safety on the API even though the value may be null at runtime.
 */
let nut: typeof import('@nut-tree-fork/nut-js') | null = null
let nutLoadAttempted = false

/**
 * Load nut.js once. Wrapped in try/catch so a native-module failure logs a
 * clear warning instead of throwing during boot. Idempotent.
 */
async function loadNut(): Promise<typeof import('@nut-tree-fork/nut-js') | null> {
  if (nutLoadAttempted) return nut
  nutLoadAttempted = true
  try {
    nut = await import('@nut-tree-fork/nut-js')
    // A small auto-delay keeps chords/typing reliable across apps that debounce
    // synthetic input; 4ms is imperceptible but avoids dropped keystrokes.
    nut.keyboard.config.autoDelayMs = 4
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      '[executor] nut.js failed to load — key/mouse intents will be no-ops. ' +
        'App-launch intents still work.',
      err
    )
    nut = null
  }
  return nut
}

/**
 * Translate one of our symbolic key tokens into a nut.js Key enum value.
 *
 * WHY a token layer: the action catalog speaks in portable symbols ('Mod',
 * 'Enter', 'A', '/') so bindings are OS-agnostic. Only here, at actuation time,
 * do we bind 'Mod' to Command vs Control and map characters to physical keys.
 * Returns null for anything we don't recognise so the caller can skip it.
 */
function tokenToKey(
  token: string,
  Key: typeof import('@nut-tree-fork/nut-js').Key
): import('@nut-tree-fork/nut-js').Key | null {
  // Modifiers. 'Mod' is the platform-primary accelerator (Cmd on mac, Ctrl elsewhere).
  switch (token) {
    case 'Mod':
      return process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl
    case 'Super':
      return Key.LeftSuper
    case 'Ctrl':
      return Key.LeftControl
    case 'Shift':
      return Key.LeftShift
    case 'Alt':
      return Key.LeftAlt
    case 'Enter':
      return Key.Enter
    case 'Escape':
      return Key.Escape
    case 'Tab':
      return Key.Tab
    case 'Space':
      return Key.Space
    case 'Up':
      return Key.Up
    case 'Down':
      return Key.Down
    case 'Left':
      return Key.Left
    case 'Right':
      return Key.Right
    case '/':
      return Key.Slash
    default:
      break
  }

  // Function keys F1..F19 -> Key.F1..Key.F19. F13..F19 are unused by default on
  // macOS, so they make ideal collision-free triggers for push-to-talk apps.
  if (/^[Ff]([1-9]|1[0-9])$/.test(token)) {
    const name = token.toUpperCase() as keyof typeof Key
    const k = Key[name]
    return typeof k === 'number' ? (k as import('@nut-tree-fork/nut-js').Key) : null
  }

  // Right-hand modifiers, usable as single-key dictation triggers.
  if (token === 'RightAlt') return Key.RightAlt
  if (token === 'RightCtrl') return Key.RightControl

  // Single letters A..Z -> Key.A..Key.Z. nut.js exposes these as named members,
  // so we index the enum object by the uppercased letter.
  if (/^[A-Za-z]$/.test(token)) {
    const name = token.toUpperCase() as keyof typeof Key
    const k = Key[name]
    return typeof k === 'number' ? (k as import('@nut-tree-fork/nut-js').Key) : null
  }

  // Digits 0..9 -> Key.Num0..Key.Num9 (nut.js names the top-row digits "NumN").
  if (/^[0-9]$/.test(token)) {
    const name = `Num${token}` as keyof typeof Key
    const k = Key[name]
    return typeof k === 'number' ? (k as import('@nut-tree-fork/nut-js').Key) : null
  }

  // eslint-disable-next-line no-console
  console.warn(`[executor] unknown key token "${token}" — skipping`)
  return null
}

/** Resolve our three logical mouse buttons to nut.js Button enum values. */
function toButton(
  button: 'left' | 'right' | 'middle',
  Button: typeof import('@nut-tree-fork/nut-js').Button
): import('@nut-tree-fork/nut-js').Button {
  if (button === 'right') return Button.RIGHT
  if (button === 'middle') return Button.MIDDLE
  return Button.LEFT
}

/**
 * Launch (or focus) a configured app for a 'launch:<key>' sentinel command.
 *
 * WHY never throw: a failed launch (app not installed, bad path) must not abort
 * the rest of an intent batch — a controller press often fires several intents.
 * We catch everything and log.
 */
function launchApp(target: 'claudeDesktop' | 'terminal', cfg: AppConfig): void {
  const userPath = cfg.paths?.[target]

  try {
    if (process.platform === 'darwin') {
      if (userPath) {
        // `open -a` handles both bundle names and .app paths and will focus an
        // already-running instance rather than spawning a duplicate.
        spawn('open', ['-a', userPath], { detached: true, stdio: 'ignore' }).unref()
      } else {
        const appName = target === 'claudeDesktop' ? 'Claude' : 'Terminal'
        spawn('open', ['-a', appName], { detached: true, stdio: 'ignore' }).unref()
      }
      return
    }

    if (process.platform === 'win32') {
      if (userPath) {
        // `start "" <path>` via the shell resolves both apps and documents; the
        // empty "" is the (required) window-title argument for start.
        exec(`start "" "${userPath}"`, (err) => {
          if (err) console.warn('[executor] launch failed:', err)
        })
      } else {
        // No path configured: Claude has no known default here, so fall back to
        // a terminal. Prefer Windows Terminal, else cmd.
        exec('start "" wt', (err) => {
          if (err) exec('start "" cmd', (e2) => e2 && console.warn('[executor] launch failed:', e2))
        })
      }
      return
    }

    // Linux / other unix.
    if (userPath) {
      // A configured path is most reliably launched directly; xdg-open is the
      // fallback for .desktop entries or documents.
      const child = spawn(userPath, [], { detached: true, stdio: 'ignore' })
      child.on('error', () => {
        spawn('xdg-open', [userPath], { detached: true, stdio: 'ignore' }).unref()
      })
      child.unref()
    } else {
      // No sane cross-distro "Claude" default; open the generic terminal.
      const term = target === 'terminal' ? 'x-terminal-emulator' : 'xdg-open'
      spawn(term, [], { detached: true, stdio: 'ignore' }).unref()
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[executor] failed to launch ${target}:`, err)
  }
}

/** Execute a single 'shell' intent. Only the 'launch:' sentinel is supported. */
function executeShell(intent: Extract<Intent, { type: 'shell' }>, cfg: AppConfig): void {
  const { command } = intent
  if (command.startsWith('launch:')) {
    const key = command.slice('launch:'.length)
    if (key === 'claudeDesktop' || key === 'terminal') {
      launchApp(key, cfg)
    } else {
      console.warn(`[executor] unknown launch target "${key}"`)
    }
    return
  }
  // We deliberately do NOT run arbitrary shell strings — only the vetted launch
  // sentinels from the action catalog are honoured, to avoid a command-injection
  // surface from persisted config.
  console.warn(`[executor] ignoring non-launch shell command: ${command}`)
}

/**
 * Actuate a batch of intents.
 *
 * Sequential (not parallel) on purpose: keystrokes and typing are inherently
 * ordered (e.g. type '/model' THEN press Enter), so we await each in turn.
 * Throws only on an unexpected hard failure; individual app-launch failures are
 * swallowed inside launchApp so one bad launch can't drop the whole chord.
 */
export async function executeIntents(intents: Intent[], cfg: AppConfig): Promise<void> {
  const n = await loadNut()

  for (const intent of intents) {
    switch (intent.type) {
      case 'noop':
        break

      case 'shell':
        // Launches don't need nut.js, so we handle them even in degraded mode.
        executeShell(intent, cfg)
        break

      case 'keystroke': {
        if (!n) break // degraded: no native backend
        const { keyboard, Key } = n
        const keys = intent.keys
          .map((t) => tokenToKey(t, Key))
          .filter((k): k is import('@nut-tree-fork/nut-js').Key => k !== null)
        if (keys.length === 0) break
        // Press all keys of the chord down, then release — this is how modifier
        // combos (Cmd+N) must be synthesized.
        await keyboard.pressKey(...keys)
        await keyboard.releaseKey(...keys)
        break
      }

      case 'keyDown': {
        // Sustained press, no matching release — pairs with a 'keyUp' intent
        // fired by a separate binding (e.g. press -> keyDown, release -> keyUp)
        // so a held controller button maps to a held keyboard key.
        if (!n) break
        const { keyboard, Key } = n
        const keys = intent.keys
          .map((t) => tokenToKey(t, Key))
          .filter((k): k is import('@nut-tree-fork/nut-js').Key => k !== null)
        if (keys.length === 0) break
        await keyboard.pressKey(...keys)
        break
      }

      case 'keyUp': {
        if (!n) break
        const { keyboard, Key } = n
        const keys = intent.keys
          .map((t) => tokenToKey(t, Key))
          .filter((k): k is import('@nut-tree-fork/nut-js').Key => k !== null)
        if (keys.length === 0) break
        await keyboard.releaseKey(...keys)
        break
      }

      case 'text': {
        if (!n) break
        await n.keyboard.type(intent.value)
        break
      }

      case 'mouseMove': {
        if (!n) break
        const { mouse, Point } = n
        // Intent movement is RELATIVE (stick delta), so read the current cursor
        // position and offset from it.
        const p = await mouse.getPosition()
        await mouse.setPosition(new Point(p.x + intent.dx, p.y + intent.dy))
        break
      }

      case 'scroll': {
        if (!n) break
        const { mouse } = n
        // nut.js scroll amounts are positive integers per direction; split the
        // signed dx/dy into the appropriate directional call.
        if (intent.dy > 0) await mouse.scrollDown(Math.round(intent.dy))
        else if (intent.dy < 0) await mouse.scrollUp(Math.round(-intent.dy))
        if (intent.dx > 0) await mouse.scrollRight(Math.round(intent.dx))
        else if (intent.dx < 0) await mouse.scrollLeft(Math.round(-intent.dx))
        break
      }

      case 'mouseButton': {
        if (!n) break
        const { mouse, Button } = n
        const btn = toButton(intent.button, Button)
        if (intent.action === 'click') await mouse.click(btn)
        else if (intent.action === 'press') await mouse.pressButton(btn)
        else await mouse.releaseButton(btn)
        break
      }

      default: {
        // Exhaustiveness guard: if a new Intent variant is added to the domain
        // and not handled here, this line becomes a compile error.
        const _exhaustive: never = intent
        void _exhaustive
      }
    }
  }
}
