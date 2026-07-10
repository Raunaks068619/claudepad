#!/usr/bin/env node
/**
 * `npx claudepad` / `npx github:Raunaks068619/claudepad` launcher.
 *
 * On first run it builds the app if needed, then launches it under the local
 * Electron. The SDL/HID controller worker runs under the Node that started this
 * process (see src/main/gamepad.ts) — which npx guarantees is present, so the
 * usual "GUI app has no PATH" problem doesn't apply here.
 *
 * Prefer the native installer? Grab the macOS .dmg from the Releases page.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', ...opts })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
    child.on('error', reject)
  })
}

// Build once if the compiled output isn't present (fresh npx install).
if (!existsSync(join(root, 'out', 'main', 'index.js'))) {
  console.log('[claudepad] first run — building the app (a few seconds)…')
  const evite = join(root, 'node_modules', '.bin', isWin ? 'electron-vite.cmd' : 'electron-vite')
  await run(evite, ['build'], { shell: isWin })
}

// require('electron') resolves to the Electron executable path.
const electron = require('electron')
console.log('[claudepad] launching ClaudePad… (grant Accessibility when prompted)')
const app = spawn(electron, [root], { stdio: 'inherit' })
app.on('exit', (code) => process.exit(code ?? 0))
