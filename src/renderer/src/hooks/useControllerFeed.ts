import { useEffect, useState } from 'react'
import type { ControllerState } from '@shared/domain'
import { emptyControllerState } from '@shared/gamepad-mapping'

/**
 * Live controller feed for the UI.
 *
 * Input is no longer polled in the renderer — the MAIN process reads the
 * controller via SDL (focus-independent) and pushes ~30Hz snapshots over IPC.
 * This hook simply subscribes to that feed and re-exposes the latest snapshot
 * for visualization. It REPLACES useGamepad as the renderer's input source.
 */

export interface UseControllerFeedResult {
  state: ControllerState
  connected: boolean
}

export function useControllerFeed(): UseControllerFeedResult {
  const [state, setState] = useState<ControllerState>(emptyControllerState)

  useEffect(() => {
    const unsubscribe = window.claudepad.onControllerState((s) => {
      setState(s)
    })
    return unsubscribe
  }, [])

  return { state, connected: state.connected }
}
