#!/usr/bin/env bash
# Build and install local-aws to /Applications, then launch from the Dock/Spotlight.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

APP_NAME="local-aws"
INSTALL_PATH="/Applications/${APP_NAME}.app"
OPEN_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --open-only) OPEN_ONLY=true ;;
    --reinstall) ;; # kept for compatibility; reinstall is now the default
    --help|-h)
      echo "Usage: ./local-aws-mac.sh [--open-only]"
      echo "  Uninstalls any existing app, rebuilds, and installs fresh to Applications."
      echo "  --open-only  Open the installed app without rebuilding."
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

is_installed() {
  [[ -d "$INSTALL_PATH" ]]
}

quit_app_if_running() {
  if pgrep -x "$APP_NAME" >/dev/null 2>&1; then
    echo "Quitting running ${APP_NAME}..."
    osascript -e "quit app \"${APP_NAME}\"" 2>/dev/null || true
    sleep 1
  fi
}

uninstall_app() {
  if ! is_installed; then
    return 0
  fi

  echo "Uninstalling existing ${APP_NAME} from Applications..."
  quit_app_if_running
  rm -rf "$INSTALL_PATH"

  if is_installed; then
    echo "Error: failed to remove ${INSTALL_PATH}" >&2
    exit 1
  fi

  echo "Uninstalled."
}

if [[ "$OPEN_ONLY" == true ]]; then
  if ! is_installed; then
    echo "Error: ${APP_NAME} is not installed at ${INSTALL_PATH}" >&2
    echo "Run ./local-aws-mac.sh without --open-only to build and install." >&2
    exit 1
  fi
  echo "Opening ${APP_NAME}..."
  open -a "$APP_NAME"
  exit 0
fi

if is_installed; then
  uninstall_app
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
ditto "$BUILT_APP" "$INSTALL_PATH"

echo ""
echo "Installed! ${APP_NAME} is now in your Applications folder."
echo "Open it from Spotlight, Launchpad, or the Dock."
echo ""
echo "Note: First launch may require Right-click → Open (unsigned app)."
echo ""

open -a "$APP_NAME"
