#!/usr/bin/env node
/**
 * `npx claudepad` / `npx github:Raunaks068619/claudepad` launcher.
 *
 * The prebuilt app (out/) ships in the package, so there is normally nothing to
 * build — this just launches it under the local Electron. The SDL/HID controller
 * worker runs under the Node that started this process (npx guarantees Node is
 * present), so the "GUI app has no PATH" problem of a packaged .app doesn't apply.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
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

/**
 * Raw Electron npm downloads carry only linker signatures. macOS 26 rejects
 * that incomplete app-bundle signature before Electron can launch, even when
 * the files are not quarantined. Add a local ad-hoc bundle signature once.
 *
 * This does not clear quarantine, disable Gatekeeper, or require admin access.
 * A future properly signed Electron bundle passes verification and is left
 * untouched.
 */
function prepareElectronForMac(executable) {
  if (process.platform !== 'darwin') return

  const executablePath = resolve(executable)
  const electronApp = resolve(dirname(executablePath), '..', '..')
  const expectedExecutable = join(electronApp, 'Contents', 'MacOS', 'Electron')
  const codesign = '/usr/bin/codesign'

  if (
    basename(electronApp) !== 'Electron.app' ||
    executablePath !== expectedExecutable ||
    !existsSync(executablePath)
  ) {
    console.error(`\n[claudepad] refusing to sign an unexpected Electron path: ${executablePath}`)
    process.exit(1)
  }

  try {
    execFileSync(codesign, ['--verify', '--deep', '--strict', electronApp], {
      stdio: 'ignore'
    })
    return
  } catch {
    console.log('   • preparing Electron for macOS (first run)…')
  }

  // Only repair Electron's known raw npm signature shape. Do not automatically
  // bless an app bundle carrying some other invalid or damaged signature.
  const inspected = spawnSync(codesign, ['-d', '--verbose=4', electronApp], {
    encoding: 'utf8'
  })
  const signatureInfo = `${inspected.stdout ?? ''}\n${inspected.stderr ?? ''}`
  const isRawElectronBundle =
    inspected.status === 0 &&
    signatureInfo.includes('Signature=adhoc') &&
    signatureInfo.includes('Info.plist=not bound') &&
    signatureInfo.includes('Sealed Resources=none')

  if (!isRawElectronBundle) {
    console.error('\n[claudepad] Electron has an unexpected invalid signature; reinstall ClaudePad.')
    process.exit(1)
  }

  let signingError
  try {
    execFileSync(codesign, ['--force', '--deep', '--sign', '-', electronApp], {
      stdio: 'ignore'
    })
    execFileSync(codesign, ['--verify', '--deep', '--strict', electronApp], {
      stdio: 'ignore'
    })
    return
  } catch (err) {
    signingError = err
  }

  // Another ClaudePad launch may have signed the shared NPX cache concurrently.
  try {
    execFileSync(codesign, ['--verify', '--deep', '--strict', electronApp], {
      stdio: 'ignore'
    })
    return
  } catch {
    console.error('\n[claudepad] macOS could not validate the local Electron runtime.')
    console.error(`Run: codesign --force --deep --sign - "${electronApp}"`)
    console.error(signingError instanceof Error ? signingError.message : String(signingError))
    process.exit(1)
  }
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

let electron
try {
  electron = require('electron') // resolves to the Electron executable path
} catch (err) {
  console.error('\n[claudepad] Electron is missing or incomplete. Re-run the NPX command.')
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}

if (typeof electron !== 'string') {
  console.error('\n[claudepad] Electron returned an unexpected executable path.')
  process.exit(1)
}

prepareElectronForMac(electron)

console.log('   • Launching…\n')

const app = spawn(electron, [root], { stdio: 'inherit' })
app.on('error', (err) => {
  console.error('\n[claudepad] failed to launch Electron:', err.message)
  console.error('Try `npm i -g electron` or reinstall.')
  process.exit(1)
})
app.on('exit', (code) => process.exit(code ?? 0))
