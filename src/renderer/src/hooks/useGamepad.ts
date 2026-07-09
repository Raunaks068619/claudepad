import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { ControllerState } from '@shared/domain'
import { readGamepad, emptyControllerState } from '@shared/gamepad-mapping'

/**
 * Poll the browser Gamepad API every animation frame and expose the latest
 * normalized ControllerState.
 *
 * We keep the freshest snapshot in a ref (updated inside rAF) and only push it
 * to React state on a light throttle — re-rendering the whole tree at 60fps for
 * every micro-stick-jitter is wasteful. Components that need frame-accurate
 * values (e.g. the mapping runtime) read `stateRef` directly; components that
 * just visualize read `state`.
 */

export interface UseGamepadResult {
  state: ControllerState
  connected: boolean
  /** Frame-accurate ref for consumers that must not miss an edge. */
  stateRef: MutableRefObject<ControllerState>
}

/** Pick the first connected, non-null pad from navigator.getGamepads(). */
function pickPad(): Gamepad | null {
  const pads = navigator.getGamepads ? navigator.getGamepads() : []
  for (const pad of pads) {
    if (pad && pad.connected) return pad
  }
  return null
}

const UI_UPDATE_MS = 33 // ~30fps for visual state; plenty smooth

export function useGamepad(): UseGamepadResult {
  const [state, setState] = useState<ControllerState>(emptyControllerState)
  const [connected, setConnected] = useState(false)
  const stateRef = useRef<ControllerState>(emptyControllerState())
  const rafRef = useRef<number | null>(null)
  const lastUiPush = useRef(0)

  useEffect(() => {
    // Prompt the browser to surface pads on connect/disconnect. We still poll
    // each frame for values (events don't carry live state).
    const onConnect = (): void => {
      setConnected(pickPad() !== null)
    }
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onConnect)

    const loop = (): void => {
      const pad = pickPad()
      const snapshot = readGamepad(pad)
      stateRef.current = snapshot

      const now = snapshot.timestamp
      if (now - lastUiPush.current >= UI_UPDATE_MS) {
        lastUiPush.current = now
        setState(snapshot)
        setConnected(snapshot.connected)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onConnect)
    }
  }, [])

  return { state, connected, stateRef }
}
