#!/usr/bin/env bash
# Build (first time) and install local-aws to /Applications, then launch from the Dock/Spotlight.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

APP_NAME="local-aws"
INSTALL_PATH="/Applications/${APP_NAME}.app"
REINSTALL=false

for arg in "$@"; do
  case "$arg" in
    --reinstall) REINSTALL=true ;;
    --help|-h)
      echo "Usage: ./local-aws-mac.sh [--reinstall]"
      echo "  Installs local-aws to Applications (builds on first run)."
      echo "  --reinstall  Rebuild and replace the installed app."
      exit 0
      ;;
  esac
done

if [[ -d "$INSTALL_PATH" && "$REINSTALL" == false ]]; then
  echo "Opening ${APP_NAME}..."
  open -a "$APP_NAME"
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required to build the app. Install from https://nodejs.org/" >&2
  exit 1
fi

echo "Building ${APP_NAME} for macOS (this may take a few minutes)..."
if [[ ! -d node_modules ]]; then
  npm install
fi
npm run dist:mac

BUILT_APP=$(find release -name "${APP_NAME}.app" -type d -maxdepth 3 | head -1)
if [[ -z "$BUILT_APP" ]]; then
  echo "Error: ${APP_NAME}.app not found in release/" >&2
  exit 1
fi

echo "Installing to ${INSTALL_PATH}..."
if [[ -d "$INSTALL_PATH" ]]; then
  rm -rf "$INSTALL_PATH"
fi
ditto "$BUILT_APP" "$INSTALL_PATH"

echo ""
echo "Installed! ${APP_NAME} is now in your Applications folder."
echo "Open it from Spotlight, Launchpad, or the Dock."
echo ""
echo "Note: First launch may require Right-click → Open (unsigned app)."
echo ""

open -a "$APP_NAME"
