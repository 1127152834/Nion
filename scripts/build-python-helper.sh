#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
SPEC_FILE="$BACKEND_DIR/packaging/pyinstaller/nion-backend.spec"
DIST_DIR="$BACKEND_DIR/dist/nion-backend"
BUILD_DIR="$BACKEND_DIR/build/pyinstaller"

mkdir -p "$DIST_DIR" "$BUILD_DIR"

cd "$BACKEND_DIR"
uv run --with pyinstaller pyinstaller \
  "$SPEC_FILE" \
  --distpath "$DIST_DIR" \
  --workpath "$BUILD_DIR"
