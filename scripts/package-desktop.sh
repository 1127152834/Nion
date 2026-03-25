#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-builder}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT/desktop"
BUILDER_CONFIG="$DESKTOP_DIR/electron-builder.yml"

bash "$ROOT/scripts/build-python-helper.sh"

cd "$DESKTOP_DIR"
pnpm build

case "$MODE" in
  builder)
    if [[ -n "${NION_UPDATE_BASE_URL:-}" ]]; then
      pnpm exec electron-builder --config "$BUILDER_CONFIG"
    else
      TEMP_CONFIG="$(mktemp "$DESKTOP_DIR/electron-builder.local.XXXXXX.yml")"
      trap 'rm -f "$TEMP_CONFIG"' EXIT
      awk '
        /^  - provider: generic$/ { skip = 1; next }
        skip && /^    url:/ { skip = 0; next }
        { print }
      ' "$BUILDER_CONFIG" > "$TEMP_CONFIG"
      pnpm exec electron-builder --config "$TEMP_CONFIG"
    fi
    ;;
  forge)
    pnpm exec electron-forge make --config forge.config.ts
    ;;
  *)
    echo "Unknown desktop packaging mode: $MODE" >&2
    exit 1
    ;;
esac
