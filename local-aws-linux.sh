#!/usr/bin/env bash
# Build (first time) and install local-aws desktop app on Linux.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

APP_NAME="local-aws"
REINSTALL=false

for arg in "$@"; do
  case "$arg" in
    --reinstall) REINSTALL=true ;;
    --help|-h)
      echo "Usage: ./local-aws-linux.sh [--reinstall]"
      exit 0
      ;;
  esac
done

APPIMAGE=$(find "$ROOT/release" -name "${APP_NAME}*.AppImage" -type f 2>/dev/null | head -1)
DESKTOP_DIR="${HOME}/.local/share/applications"
BIN_DIR="${HOME}/.local/bin"
INSTALLED_APPIMAGE="${HOME}/.local/share/${APP_NAME}/${APP_NAME}.AppImage"

if [[ -f "$INSTALLED_APPIMAGE" && "$REINSTALL" == false ]]; then
  echo "Launching ${APP_NAME}..."
  exec "$INSTALLED_APPIMAGE" --no-sandbox
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required to build the app. Install from https://nodejs.org/" >&2
  exit 1
fi

echo "Building ${APP_NAME} for Linux..."
if [[ ! -d node_modules ]]; then
  npm install
fi
npm run dist:linux

APPIMAGE=$(find "$ROOT/release" -name "${APP_NAME}*.AppImage" -type f | head -1)
if [[ -z "$APPIMAGE" ]]; then
  echo "Error: AppImage not found in release/" >&2
  exit 1
fi

mkdir -p "${HOME}/.local/share/${APP_NAME}" "$BIN_DIR" "$DESKTOP_DIR"
cp "$APPIMAGE" "$INSTALLED_APPIMAGE"
chmod +x "$INSTALLED_APPIMAGE"

cat > "$DESKTOP_DIR/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Name=local-aws
Comment=LocalStack dev console
Exec=${INSTALLED_APPIMAGE} --no-sandbox
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Development;
EOF

ln -sf "$INSTALLED_APPIMAGE" "$BIN_DIR/${APP_NAME}" 2>/dev/null || true

echo ""
echo "Installed! Search for '${APP_NAME}' in your application menu."
echo "Or run: ${INSTALLED_APPIMAGE}"
echo ""

exec "$INSTALLED_APPIMAGE" --no-sandbox
