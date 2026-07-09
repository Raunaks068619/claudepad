/**
 * Bundle a standalone Node binary into build/node so the packaged app can run
 * the SDL / node-hid input worker WITHOUT the user having Node installed.
 *
 * WHY this is necessary:
 *   - @kmamal/sdl's native addon segfaults under Electron's own Node ABI
 *     (verified: exit 139), so the worker must run under a real Node runtime.
 *   - A GUI-launched .app inherits none of the user's shell / nvm PATH, so we
 *     cannot rely on the machine having `node` at all.
 *
 * So we ship a known-good Node binary — the very one building the app, which is
 * already verified to load @kmamal/sdl — inside Contents/Resources/node
 * (wired up via electron-builder `extraResources`). resolveNodePath() in
 * src/main/gamepad.ts prefers this bundled binary when packaged.
 *
 * The binary is git-ignored (~100MB); it is produced at package time only.
 */
import { mkdirSync, copyFileSync, chmodSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dest = resolve(root, 'build', 'node')
const src = process.execPath // the Node binary running this script

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
chmodSync(dest, 0o755)

// arm64 macOS requires every executable to carry a valid signature. Re-apply an
// ad-hoc signature so the copy is valid regardless of what the source carried.
if (process.platform === 'darwin') {
  try {
    execFileSync('codesign', ['--force', '--sign', '-', dest], { stdio: 'ignore' })
  } catch (e) {
    console.warn('[bundle-node] ad-hoc codesign failed (continuing):', e?.message ?? e)
  }
}

const mb = (statSync(dest).size / 1024 / 1024).toFixed(0)
console.log(`[bundle-node] bundled ${src} -> ${dest} (${mb} MB)`)
