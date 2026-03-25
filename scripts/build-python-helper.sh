#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
SPEC_FILE="$BACKEND_DIR/packaging/pyinstaller/nion-backend.spec"
PLATFORM="$(python3 - <<'PY'
import platform
system = platform.system().lower()
if system.startswith('darwin'):
    print('darwin')
elif system.startswith('windows'):
    print('win32')
else:
    print('linux')
PY
)"
DIST_DIR="$BACKEND_DIR/dist/nion-backend/$PLATFORM"
BUILD_DIR="$BACKEND_DIR/build/pyinstaller"

mkdir -p "$DIST_DIR" "$BUILD_DIR"

cd "$BACKEND_DIR"
uv run --with pyinstaller pyinstaller \
  "$SPEC_FILE" \
  --distpath "$DIST_DIR" \
  --workpath "$BUILD_DIR"
