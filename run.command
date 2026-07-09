#!/bin/bash
# ClaudePad launcher — double-click this file in Finder to install & run.
# No terminal commands needed on your side.

cd "$(dirname "$0")" || exit 1
echo "======================================"
echo "   ClaudePad — setup & launch"
echo "======================================"
echo "Working in: $(pwd)"
echo ""

# 1) Node check
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed."
  echo "   Install Node 20+ from https://nodejs.org , then double-click this again."
  read -r -p "Press Enter to close..."
  exit 1
fi
echo "✅ Node $(node -v) found"
echo ""

# 2) Install (with automatic clean-retry on the 'Invalid Version' class of errors)
echo "📦 Installing dependencies (first run compiles a native module; this can take a few minutes)..."
if ! npm install; then
  echo ""
  echo "⚠️  First install failed — clearing cache and retrying from a clean state..."
  npm cache clean --force
  rm -rf node_modules package-lock.json
  if ! npm install; then
    echo ""
    echo "❌ Install still failing. If it mentions a native build (node-gyp), run:"
    echo "     xcode-select --install"
    echo "   then double-click this file again."
    read -r -p "Press Enter to close..."
    exit 1
  fi
fi

echo ""
echo "🚀 Launching ClaudePad..."
echo "   (Grant Accessibility when the app asks — it needs it to send keystrokes.)"
npm run dev
