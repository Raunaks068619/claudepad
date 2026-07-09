/**
 * GamepadService — main-process controller orchestrator.
 *
 * WHY this design: controlling OTHER apps means ClaudePad is never the focused
 * window, so the browser Gamepad API (renderer) can't be the input source. We
 * read the pad at the OS level with SDL — but SDL can't run in Electron's main
 * process on macOS (run-loop conflict), so it lives in an isolated Node
 * utilityProcess (input-worker.ts). This service:
 *   - spawns/monitors that worker,
 *   - receives ControllerState snapshots from it,
 *   - runs the SAME pure mapping engine (kept pure precisely so it ports here),
 *   - actuates via the executor when enabled && armed,
 *   - forwards live state + status to the renderer for the Tester UI.
 *
 * Net effect: the controller drives Claude while ClaudePad sits in the
 * background, and a native SDL crash only kills the worker (auto-respawned),
 * never the app.
 */

import { fork, execSync, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AppConfig, ControllerState, Intent, Profile } from '../shared/domain'
import type { RuntimeStatus } from '../shared/bridge'
import { createRuntime, step, type EngineRuntime } from '../shared/mapping-engine'
import { executeIntents } from './executor'
import type { WorkerMessage } from './sdl-read'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PUSH_EVERY = 2 // forward UI state at ~30Hz to limit IPC traffic

export interface GamepadServiceDeps {
  getConfig: () => AppConfig
  sendControllerState: (state: ControllerState) => void
  sendRuntimeStatus: (status: RuntimeStatus) => void
}

/**
 * Resolve a SYSTEM Node binary to run the SDL worker under. We must NOT use
 * Electron's bundled Node — @kmamal/sdl's native addon is built against a
 * different ABI there and segfaults. In dev, Node is on PATH; we also probe the
 * usual install locations as a fallback.
 */
function resolveNodePath(): string {
  if (process.env.CLAUDEPAD_NODE && existsSync(process.env.CLAUDEPAD_NODE)) {
    return process.env.CLAUDEPAD_NODE
  }
  const candidates = ['/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node']
  for (const c of candidates) if (existsSync(c)) return c
  try {
    const found = execSync('command -v node', { encoding: 'utf8' }).trim()
    if (found) return found
  } catch {
    /* fall through */
  }
  return 'node'
}

export class GamepadService {
  private worker: ChildProcess | null = null
  private controllerName: string | null = null
  private connected = false
  private rt: EngineRuntime = createRuntime()
  private config: AppConfig
  private armed = false // safety gate; default OFF on launch
  private queue: Intent[] = [] // pending intents; drained serially, never dropped
  private draining = false
  private frame = 0

  constructor(private deps: GamepadServiceDeps) {
    this.config = deps.getConfig()
  }

  async start(): Promise<void> {
    this.config = this.deps.getConfig()
    this.spawnWorker()
    this.emitStatus()
  }

  stop(): void {
    if (this.worker) {
      try {
        this.worker.kill()
      } catch {
        /* ignore */
      }
      this.worker = null
    }
  }

  setArmed(armed: boolean): void {
    this.armed = armed
    this.emitStatus()
  }

  updateConfig(config: AppConfig): void {
    const prevBackend = this.config.inputBackend ?? 'sdl'
    this.config = config
    // Switching the input backend means a different worker binary — respawn it.
    if ((config.inputBackend ?? 'sdl') !== prevBackend) {
      this.restartWorker()
    }
    this.emitStatus()
  }

  /** Tear down the current worker and start the one for the active backend. */
  private restartWorker(): void {
    const old = this.worker
    this.worker = null // so the old worker's exit handler won't auto-respawn it
    if (old) {
      try {
        old.kill()
      } catch {
        /* ignore */
      }
    }
    this.connected = false
    this.controllerName = null
    this.spawnWorker()
  }

  status(): RuntimeStatus {
    return {
      enabled: this.config.enabled,
      armed: this.armed,
      connected: this.connected,
      controllerName: this.controllerName
    }
  }

  private emitStatus(): void {
    this.deps.sendRuntimeStatus(this.status())
  }

  private activeProfile(): Profile | null {
    return (
      this.config.profiles.find((p) => p.id === this.config.activeProfileId) ??
      this.config.profiles[0] ??
      null
    )
  }

  private spawnWorker(): void {
    // Pick the reader for the active backend. Both post the same WorkerMessage
    // protocol, so nothing downstream cares which one is running.
    //  - 'hid': node-hid raw DS4 reader (adds the touchpad)
    //  - 'sdl' (default): @kmamal/sdl
    const backend = this.config.inputBackend ?? 'sdl'
    const workerFile = backend === 'hid' ? 'hid-worker.js' : 'input-worker.js'
    const workerPath = join(__dirname, workerFile)
    // Fork under the system Node (see resolveNodePath). 'ipc' gives us
    // process.send/'message'; stdout/stderr inherit so worker logs are visible.
    const child = fork(workerPath, [], {
      execPath: resolveNodePath(),
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    })
    this.worker = child

    child.on('message', (msg) => this.onWorkerMessage(msg as WorkerMessage))

    child.on('exit', (code) => {
      console.warn('[gamepad] input worker exited', code)
      this.connected = false
      this.controllerName = null
      this.emitStatus()
      // Respawn after a short delay unless we're shutting down.
      if (this.worker === child) {
        this.worker = null
        setTimeout(() => {
          if (!this.worker) this.spawnWorker()
        }, 1500)
      }
    })
  }

  private onWorkerMessage(msg: WorkerMessage): void {
    if (msg.t === 'error') {
      console.error('[gamepad] worker:', msg.message)
      return
    }
    if (msg.t === 'status') {
      this.connected = msg.connected
      this.controllerName = msg.name
      this.emitStatus()
      return
    }
    // msg.t === 'state'
    this.handleState(msg.s)
  }

  private handleState(state: ControllerState): void {
    if (!this.connected) {
      this.connected = true
      this.emitStatus()
    }

    // Live UI feed (throttled).
    this.frame = (this.frame + 1) % STATE_PUSH_EVERY
    if (this.frame === 0) this.deps.sendControllerState(state)

    const profile = this.activeProfile()
    if (!profile) {
      this.rt.prev = state
      return
    }

    const { intents } = step(this.rt, state, profile)

    if (this.config.enabled && this.armed && intents.length > 0) {
      this.enqueue(intents)
      void this.drain()
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
  private enqueue(intents: Intent[]): void {
    for (const it of intents) {
      const tail = this.queue[this.queue.length - 1]
      if (it.type === 'mouseMove' && tail?.type === 'mouseMove') {
        tail.dx += it.dx
        tail.dy += it.dy
      } else if (it.type === 'scroll' && tail?.type === 'scroll') {
        tail.dx += it.dx
        tail.dy += it.dy
      } else {
        this.queue.push(it)
      }
    }
  }

  /**
   * Drain the queue serially. Idempotent: if a drain is already running it
   * returns immediately, and the running loop picks up anything enqueued while
   * it was awaiting the executor.
   */
  private async drain(): Promise<void> {
    if (this.draining) return
    this.draining = true
    try {
      while (this.queue.length > 0) {
        const batch = this.queue
        this.queue = []
        await executeIntents(batch, this.config)
      }
    } catch (e) {
      console.error('[gamepad] execute error:', e)
    } finally {
      this.draining = false
    }
  }
}
