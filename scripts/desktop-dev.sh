#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if lsof -tiTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "desktop-dev: port 5173 is already in use. Stop the existing Vite renderer before starting a new desktop dev session." >&2
  exit 1
fi

cleanup() {
  trap - EXIT INT TERM
  if [ -n "${MAIN_WATCH_PID:-}" ]; then
    kill "$MAIN_WATCH_PID" 2>/dev/null || true
  fi
  if [ -n "${RENDERER_PID:-}" ]; then
    kill "$RENDERER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

pnpm --dir desktop build:main

pnpm --dir desktop dev:main > logs/desktop-main.log 2>&1 &
MAIN_WATCH_PID=$!

pnpm --dir desktop dev:renderer > logs/desktop-renderer.log 2>&1 &
RENDERER_PID=$!

./scripts/wait-for-port.sh 5173 60 "Desktop renderer"

NION_DESKTOP_RENDERER_URL="http://127.0.0.1:5173" \
  pnpm --dir desktop dev:electron
