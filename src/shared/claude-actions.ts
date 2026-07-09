/**
 * The Claude Action Catalog — the set of "Claude options" a controller input
 * can be bound to. This is intentionally DATA, not logic: each action declares
 * WHAT it wants to happen (Intents), and the main-process executor decides HOW
 * (translating symbolic keys per-OS, launching apps from configured paths).
 *
 * Key vocabulary used in `keystroke` intents (resolved by the executor):
 *   'Mod'   -> Command on macOS, Control on Windows/Linux
 *   'Super' -> Command / Windows key
 *   'Ctrl' | 'Shift' | 'Alt' -> literal modifiers
 *   'Enter' | 'Escape' | 'Tab' | 'Space' | 'Up' | 'Down' | 'Left' | 'Right'
 *   'A'..'Z' | '0'..'9' | '/' etc. -> the character key
 *
 * App-launch uses a sentinel shell command 'launch:<key>' that the executor
 * maps to the user's configured path (see AppConfig.paths).
 */

import type { ActionId, CustomAction, Intent } from './domain'

export type ActionCategory =
  | 'Claude Desktop'
  | 'Claude Code (CLI)'
  | 'Dictation'
  | 'System'
  | 'Launch'

export interface ActionDef {
  id: ActionId
  label: string
  description: string
  category: ActionCategory
  /** The instructions this action emits when fired. */
  intents: Intent[]
}

/**
 * NOTE on defaults: Claude Desktop / Claude Code don't expose a public,
 * guaranteed hotkey contract, so these are sensible presets. They're fully
 * user-editable in the Mapper UI — the value is the binding framework, not
 * these exact keys.
 */
export const ACTION_CATALOG: ActionDef[] = [
  // ---- Claude Desktop (app must be focused) ---------------------------------
  {
    id: 'claude.desktop.newChat',
    label: 'New chat',
    description: 'Start a fresh conversation in Claude Desktop.',
    category: 'Claude Desktop',
    intents: [{ type: 'keystroke', keys: ['Mod', 'N'], description: 'New chat' }]
  },
  {
    id: 'claude.desktop.send',
    label: 'Send message',
    description: 'Submit the current prompt.',
    category: 'Claude Desktop',
    intents: [{ type: 'keystroke', keys: ['Enter'] }]
  },
  {
    id: 'claude.desktop.newline',
    label: 'New line (no send)',
    description: 'Insert a newline without submitting.',
    category: 'Claude Desktop',
    intents: [{ type: 'keystroke', keys: ['Shift', 'Enter'] }]
  },
  {
    id: 'claude.desktop.search',
    label: 'Search / command bar',
    description: 'Open the search / command palette.',
    category: 'Claude Desktop',
    intents: [{ type: 'keystroke', keys: ['Mod', 'K'] }]
  },
  {
    id: 'claude.desktop.stop',
    label: 'Stop generating',
    description: 'Interrupt the current response.',
    category: 'Claude Desktop',
    intents: [{ type: 'keystroke', keys: ['Escape'] }]
  },

  // ---- Claude Code / CLI (types into the focused terminal) ------------------
  {
    id: 'claude.cli.model',
    label: 'Switch model (/model)',
    description: 'Types the /model slash command and submits it.',
    category: 'Claude Code (CLI)',
    intents: [
      { type: 'text', value: '/model', description: 'Switch model' },
      { type: 'keystroke', keys: ['Enter'] }
    ]
  },
  {
    id: 'claude.cli.clear',
    label: 'Clear context (/clear)',
    description: 'Types the /clear slash command and submits it.',
    category: 'Claude Code (CLI)',
    intents: [
      { type: 'text', value: '/clear' },
      { type: 'keystroke', keys: ['Enter'] }
    ]
  },
  {
    id: 'claude.cli.help',
    label: 'Help (/help)',
    description: 'Types /help and submits.',
    category: 'Claude Code (CLI)',
    intents: [
      { type: 'text', value: '/help' },
      { type: 'keystroke', keys: ['Enter'] }
    ]
  },
  {
    id: 'claude.cli.submit',
    label: 'Submit / accept',
    description: 'Press Enter (accept prompt or confirm).',
    category: 'Claude Code (CLI)',
    intents: [{ type: 'keystroke', keys: ['Enter'] }]
  },
  {
    id: 'claude.cli.interrupt',
    label: 'Interrupt (Esc)',
    description: 'Interrupt the current run.',
    category: 'Claude Code (CLI)',
    intents: [{ type: 'keystroke', keys: ['Escape'] }]
  },

  // ---- System / navigation --------------------------------------------------
  {
    id: 'sys.appSwitch',
    label: 'Switch app (quick)',
    description: 'One Cmd+Tab — flips to the previous app.',
    category: 'System',
    intents: [{ type: 'keystroke', keys: ['Mod', 'Tab'] }]
  },
  // App switcher HOLD scheme — replicates a full Cmd+Tab so you can hop to ANY
  // window: one button opens & holds the switcher, another advances, releasing
  // the hold button selects. Uses the same keyDown/keyUp hold mechanism as
  // push-to-talk. Suggested: L2 press = open&hold + L2 release = select,
  // R1 = next, L1 = previous.
  {
    id: 'sys.appSwitchHold',
    label: 'App switcher — open & hold',
    description:
      'Holds Cmd and taps Tab to open the switcher and KEEP it open. Bind to "On ' +
      'press"; pair with "App switcher — select" on the SAME button at "On release", ' +
      'and put "App switcher — next"/"previous" on other buttons to move through it.',
    category: 'System',
    intents: [
      { type: 'keyDown', keys: ['Mod'], description: 'Hold Cmd' },
      { type: 'keystroke', keys: ['Tab'], description: 'Open / next' }
    ]
  },
  {
    id: 'sys.appSwitchNext',
    label: 'App switcher — next',
    description: 'Tap to move to the next app (while the switcher is held open).',
    category: 'System',
    intents: [{ type: 'keystroke', keys: ['Tab'] }]
  },
  {
    id: 'sys.appSwitchPrev',
    label: 'App switcher — previous',
    description: 'Tap to move to the previous app (Shift+Tab) while the switcher is held open.',
    category: 'System',
    intents: [{ type: 'keystroke', keys: ['Shift', 'Tab'] }]
  },
  {
    id: 'sys.appSwitchSelect',
    label: 'App switcher — select (release)',
    description:
      'Releases Cmd to jump to the highlighted window. Pair with "App switcher — ' +
      'open & hold" on the same button at "On release".',
    category: 'System',
    intents: [{ type: 'keyUp', keys: ['Mod'], description: 'Release Cmd (select)' }]
  },
  {
    id: 'sys.copy',
    label: 'Copy',
    description: 'Copy selection.',
    category: 'System',
    intents: [{ type: 'keystroke', keys: ['Mod', 'C'] }]
  },
  {
    id: 'sys.paste',
    label: 'Paste',
    description: 'Paste clipboard.',
    category: 'System',
    intents: [{ type: 'keystroke', keys: ['Mod', 'V'] }]
  },
  {
    id: 'sys.leftClick',
    label: 'Left click',
    description: 'Click at the current cursor position.',
    category: 'System',
    intents: [{ type: 'mouseButton', button: 'left', action: 'click' }]
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
    id: 'dictation.pttStart',
    label: 'Push-to-talk — start (hold Ctrl+Alt)',
    description:
      "Presses and holds Ctrl+Alt. This is Wispr Flow's own default push-to-talk " +
      'shortcut when no Apple Fn key is present, so it is guaranteed valid. Bind on ' +
      '"On press" and pair with "Push-to-talk — stop" on "On release".',
    category: 'Dictation',
    intents: [{ type: 'keyDown', keys: ['Ctrl', 'Alt'], description: 'PTT down (Ctrl+Alt)' }]
  },
  {
    id: 'dictation.pttStop',
    label: 'Push-to-talk — stop (release Ctrl+Alt)',
    description: 'Releases Ctrl+Alt. Pair with "Push-to-talk — start" on the same button.',
    category: 'Dictation',
    intents: [{ type: 'keyUp', keys: ['Ctrl', 'Alt'], description: 'PTT up (Ctrl+Alt)' }]
  },
  {
    id: 'dictation.f13Start',
    label: 'Push-to-talk — start (hold F13)',
    description:
      'Presses and holds F13 — an unused, collision-free key on macOS. Use if your ' +
      "dictation app's shortcut picker accepts a single key. Pair with the F13 stop " +
      'action on "On release".',
    category: 'Dictation',
    intents: [{ type: 'keyDown', keys: ['F13'], description: 'PTT down (F13)' }]
  },
  {
    id: 'dictation.f13Stop',
    label: 'Push-to-talk — stop (release F13)',
    description: 'Releases F13. Pair with "Push-to-talk — start (hold F13)" on the same button.',
    category: 'Dictation',
    intents: [{ type: 'keyUp', keys: ['F13'], description: 'PTT up (F13)' }]
  },

  // ---- Launch (uses configured paths) --------------------------------------
  {
    id: 'launch.claudeDesktop',
    label: 'Launch Claude Desktop',
    description: 'Open (or focus) the Claude Desktop app.',
    category: 'Launch',
    intents: [{ type: 'shell', command: 'launch:claudeDesktop', description: 'Launch Claude Desktop' }]
  },
  {
    id: 'launch.terminal',
    label: 'Launch terminal',
    description: 'Open your configured terminal for Claude CLI.',
    category: 'Launch',
    intents: [{ type: 'shell', command: 'launch:terminal', description: 'Launch terminal' }]
  }
]

const CATALOG_INDEX: Record<ActionId, ActionDef> = Object.fromEntries(
  ACTION_CATALOG.map((a) => [a.id, a])
)

export function getAction(id: ActionId): ActionDef | undefined {
  return CATALOG_INDEX[id]
}

export function actionsByCategory(): Record<ActionCategory, ActionDef[]> {
  const out = {} as Record<ActionCategory, ActionDef[]>
  for (const a of ACTION_CATALOG) {
    ;(out[a.category] ??= []).push(a)
  }
  return out
}

/**
 * Expand a user-defined command into executor Intents. Text commands type the
 * string (optionally submitting with Enter); key commands fire one chord. This
 * is the ONLY thing custom commands can do — deliberately no shell execution.
 */
export function customActionIntents(ca: CustomAction): Intent[] {
  if (ca.kind === 'text') {
    const out: Intent[] = []
    if (ca.text) out.push({ type: 'text', value: ca.text, description: ca.label })
    if (ca.submit) out.push({ type: 'keystroke', keys: ['Enter'] })
    return out
  }
  // kind 'keys'
  if (ca.keys && ca.keys.length > 0) {
    return [{ type: 'keystroke', keys: ca.keys, description: ca.label }]
  }
  return []
}
