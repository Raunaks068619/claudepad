/**
 * Ambient types for the preload-exposed bridge.
 *
 * WHY: the renderer accesses `window.claudepad` but never imports the preload
 * module, so TypeScript needs this global augmentation to know the shape. We
 * point straight at the shared ClaudePadBridge contract so renderer, preload,
 * and main all agree on one type.
 */

declare global {
  interface Window {
    claudepad: import('../shared/bridge').ClaudePadBridge
  }
}

// Ensure this file is treated as a module so `declare global` augments rather
// than redeclares the global scope.
export {}
