/**
 * Wrap the built ClaudePad.app into a drag-to-Applications .dmg using hdiutil.
 *
 * WHY not electron-builder's dmg target: it shells out to a vendored Python
 * (dmgbuild + biplist) that breaks on modern Homebrew Python (pyexpat ABI). hdiutil
 * ships with every macOS and needs nothing else, so the build stays reproducible.
 *
 * Run after `electron-builder --mac` (which produces release/mac-arm64/ClaudePad.app).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const APP = 'ClaudePad'
const version = pkg.version

const app = resolve(root, 'release', 'mac-arm64', `${APP}.app`)
if (!existsSync(app)) {
  console.error(`[make-dmg] ${app} not found — run electron-builder --mac first.`)
  process.exit(1)
}

const stage = resolve(root, 'release', '.dmg-stage')
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })

// ditto is the macOS-correct way to copy an .app (preserves symlinks, perms,
// code signatures, xattrs) — a plain recursive copy can corrupt the bundle.
execFileSync('ditto', [app, resolve(stage, `${APP}.app`)], { stdio: 'inherit' })
symlinkSync('/Applications', resolve(stage, 'Applications'))

const dmg = resolve(root, 'release', `${APP}-${version}-arm64.dmg`)
rmSync(dmg, { force: true })
execFileSync(
  'hdiutil',
  ['create', '-volname', `${APP} ${version}`, '-srcfolder', stage, '-ov', '-format', 'UDZO', dmg],
  { stdio: 'inherit' }
)
rmSync(stage, { recursive: true, force: true })
console.log(`[make-dmg] created ${dmg}`)
