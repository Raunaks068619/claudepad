import { useState } from 'react'
import { TextInput } from '@mantine/core'

/**
 * Records a keyboard chord by listening to a keydown while focused, and emits
 * the executor's key tokens (e.g. ['Mod','Shift','4']). 'Mod' is Cmd on macOS.
 * Pure UI — the recorded tokens are just data stored on a custom command.
 */

const SPECIAL: Record<string, string> = {
  ' ': 'Space',
  Enter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right'
}

const SYMBOL: Record<string, string> = {
  Mod: '⌘',
  Ctrl: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Enter: '⏎',
  Space: '␣',
  Escape: '⎋',
  Tab: '⇥',
  Up: '↑',
  Down: '↓',
  Left: '←',
  Right: '→'
}

/** Human-readable chord, e.g. ['Mod','Shift','4'] -> "⌘ ⇧ 4". */
export function chordLabel(tokens: string[]): string {
  return tokens.length ? tokens.map((t) => SYMBOL[t] ?? t).join(' ') : ''
}

/** Map a browser keydown to executor tokens, or null for a lone modifier press. */
function eventToTokens(e: React.KeyboardEvent<HTMLInputElement>): string[] | null {
  const mods: string[] = []
  if (e.metaKey) mods.push('Mod')
  if (e.ctrlKey) mods.push('Ctrl')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')

  const k = e.key
  if (k === 'Meta' || k === 'Control' || k === 'Alt' || k === 'Shift') return null // still choosing

  let main: string | null = null
  if (/^[a-zA-Z]$/.test(k)) main = k.toUpperCase()
  else if (/^[0-9]$/.test(k)) main = k
  else if (/^F([1-9]|1[0-9])$/.test(k)) main = k // F1..F19
  else if (SPECIAL[k]) main = SPECIAL[k]
  else if (k === '/') main = '/'
  else if (k.length === 1) main = k.toUpperCase()
  if (!main) return null

  return [...mods, main]
}

export function KeyCapture({
  value,
  onChange
}: {
  value: string[]
  onChange: (tokens: string[]) => void
}): JSX.Element {
  const [recording, setRecording] = useState(false)
  const display = recording
    ? 'Press a shortcut…'
    : value.length
      ? chordLabel(value)
      : 'Click, then press keys'

  return (
    <TextInput
      readOnly
      value={display}
      onFocus={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const tokens = eventToTokens(e)
        if (tokens) {
          onChange(tokens)
          setRecording(false)
          e.currentTarget.blur()
        }
      }}
      styles={{ input: { cursor: 'pointer', fontFamily: 'monospace' } }}
      w={200}
      aria-label="Record shortcut"
    />
  )
}
