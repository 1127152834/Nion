#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-builder}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT/desktop"

"$ROOT/scripts/build-python-helper.sh"

cd "$DESKTOP_DIR"
pnpm build

case "$MODE" in
  builder)
    pnpm exec electron-builder --config electron-builder.yml
    ;;
  forge)
    pnpm exec electron-forge make --config forge.config.ts
    ;;
  *)
    echo "Unknown desktop packaging mode: $MODE" >&2
    exit 1
    ;;
esac
