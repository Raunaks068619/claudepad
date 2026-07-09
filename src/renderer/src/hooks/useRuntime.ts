import { useCallback, useEffect, useState } from 'react'
import type { RuntimeStatus } from '@shared/bridge'

/**
 * Single source of truth for the main-process runtime status (enabled / armed /
 * connected / controllerName).
 *
 * The main process owns actuation now; it only fires when `enabled && armed`.
 * The renderer no longer runs the engine — it just reflects and toggles the
 * safety gate. On mount we fetch the current status and subscribe to changes.
 */

const INITIAL_RUNTIME: RuntimeStatus = {
  enabled: false,
  armed: false,
  connected: false,
  controllerName: null
}

export interface UseRuntimeResult {
  runtime: RuntimeStatus
  setArmed: (armed: boolean) => void
}

export function useRuntime(): UseRuntimeResult {
  const [runtime, setRuntime] = useState<RuntimeStatus>(INITIAL_RUNTIME)

  useEffect(() => {
    let alive = true
    void window.claudepad
      .getRuntime()
      .then((status) => {
        if (alive) setRuntime(status)
      })
      .catch(() => {
        /* keep initial fallback */
      })

    const unsubscribe = window.claudepad.onRuntimeStatus((status) => {
      setRuntime(status)
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const setArmed = useCallback((armed: boolean) => {
    // Optimistic local update so the switch feels instant; main confirms via
    // the runtime-status feed.
    setRuntime((prev) => ({ ...prev, armed }))
    window.claudepad.setArmed(armed).catch(() => {})
  }, [])

  return { runtime, setArmed }
}
