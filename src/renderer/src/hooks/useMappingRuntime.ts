import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { ControllerState, Intent, Profile } from '@shared/domain'
import { createRuntime, step } from '@shared/mapping-engine'

/**
 * Runs the pure mapping engine once per animation frame and actuates the
 * resulting Intents through window.claudepad.execute().
 *
 * Design constraints (from the spec):
 *  - Keep the EngineRuntime in a ref so it persists across frames and profile
 *    edits don't restart the loop.
 *  - Read the *current* profile from a ref each frame (the loop is set up once).
 *  - Never fire keystrokes unless `armed && enabled` — the Tester page passes
 *    armed=false so testing sensitivity doesn't send real input.
 *  - Batch continuous mouseMove/scroll intents into a single accumulated intent
 *    per frame (sticks emit one per frame already, but coalescing guards against
 *    flooding if multiple axis maps target the same thing).
 *  - Fire-and-forget execute(); skip a frame's execute if the previous call is
 *    still pending to avoid overlapping IPC floods.
 */

export interface UseMappingRuntimeArgs {
  /** Frame-accurate controller snapshot ref (from useGamepad). */
  stateRef: MutableRefObject<ControllerState>
  /** The active profile — read fresh each frame via a ref. */
  profile: Profile | null
  /** Master switch (config.enabled). */
  enabled: boolean
  /** True once onboarding is complete. */
  onboardingComplete: boolean
  /** When false, the engine runs (for diagnostics) but NOTHING is executed. */
  armed: boolean
}

/**
 * Coalesce a frame's intents so we never send two mouseMoves or two scrolls in
 * the same batch — the actuator gets one summed delta each.
 */
function coalesce(intents: Intent[]): Intent[] {
  let moveDx = 0
  let moveDy = 0
  let hasMove = false
  let scrollDx = 0
  let scrollDy = 0
  let hasScroll = false
  const rest: Intent[] = []

  for (const intent of intents) {
    if (intent.type === 'mouseMove') {
      moveDx += intent.dx
      moveDy += intent.dy
      hasMove = true
    } else if (intent.type === 'scroll') {
      scrollDx += intent.dx
      scrollDy += intent.dy
      hasScroll = true
    } else {
      rest.push(intent)
    }
  }

  const out: Intent[] = [...rest]
  if (hasMove && (moveDx !== 0 || moveDy !== 0)) {
    out.push({ type: 'mouseMove', dx: moveDx, dy: moveDy })
  }
  if (hasScroll && (scrollDx !== 0 || scrollDy !== 0)) {
    out.push({ type: 'scroll', dx: scrollDx, dy: scrollDy })
  }
  return out
}

export function useMappingRuntime(args: UseMappingRuntimeArgs): void {
  const { stateRef } = args

  // Runtime persists for the component's lifetime — never recreated on edits.
  const runtimeRef = useRef(createRuntime())

  // Live values the loop reads each frame without re-subscribing.
  const profileRef = useRef<Profile | null>(args.profile)
  const enabledRef = useRef(args.enabled)
  const onboardingRef = useRef(args.onboardingComplete)
  const armedRef = useRef(args.armed)

  // In-flight guard: skip execute if the previous IPC call hasn't resolved.
  const pendingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  // Keep refs in sync on every render (cheap, no loop restart).
  profileRef.current = args.profile
  enabledRef.current = args.enabled
  onboardingRef.current = args.onboardingComplete
  armedRef.current = args.armed

  useEffect(() => {
    const loop = (): void => {
      const profile = profileRef.current
      const curr = stateRef.current

      if (profile) {
        // Always advance the engine so `prev` stays correct and edges are not
        // dropped when we toggle armed/enabled — but only *execute* when live.
        const { intents } = step(runtimeRef.current, curr, profile)

        const live =
          armedRef.current && enabledRef.current && onboardingRef.current

        if (live && intents.length > 0 && !pendingRef.current) {
          const batch = coalesce(intents)
          if (batch.length > 0) {
            pendingRef.current = true
            // Fire-and-forget; clear the guard when it settles.
            window.claudepad
              .execute(batch)
              .catch(() => {})
              .finally(() => {
                pendingRef.current = false
              })
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // Set up exactly once — all mutable inputs flow through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
