#!/usr/bin/env node
/**
 * `npx claudepad` / `npx github:Raunaks068619/claudepad` launcher.
 *
 * The prebuilt app (out/) ships in the package, so there is normally nothing to
 * build — this just launches it under the local Electron. The SDL/HID controller
 * worker runs under the Node that started this process (npx guarantees Node is
 * present), so the "GUI app has no PATH" problem of a packaged .app doesn't apply.
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

console.log('\n🎮  ClaudePad — drive Claude with a game controller\n')

// The build normally ships in the package; rebuild only if it's somehow absent.
if (!existsSync(join(root, 'out', 'main', 'index.js'))) {
  const evite = join(root, 'node_modules', '.bin', isWin ? 'electron-vite.cmd' : 'electron-vite')
  if (!existsSync(evite)) {
    console.error('   ✗ No build found and no build tool available. Please reinstall.')
    process.exit(1)
  }
  console.log('   • building (first run)…')
  await run(evite, ['build'], { shell: isWin })
}

if (process.platform === 'darwin') {
  console.log('   macOS note: if buttons don\'t do anything, grant Accessibility to your')
  console.log('   terminal → System Settings ▸ Privacy & Security ▸ Accessibility.\n')
}

console.log('   • Connect your DualShock (Bluetooth or USB), then hit "Arm" in the app.')
console.log('   • Launching…\n')

const electron = require('electron') // resolves to the Electron executable path
const app = spawn(electron, [root], { stdio: 'inherit' })
app.on('error', (err) => {
  console.error('\n[claudepad] failed to launch Electron:', err.message)
  console.error('Try `npm i -g electron` or reinstall.')
  process.exit(1)
})
app.on('exit', (code) => process.exit(code ?? 0))
