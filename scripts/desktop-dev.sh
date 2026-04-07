#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
PNPM_BIN="$REPO_ROOT/scripts/pnpm.sh"

EXISTING_RENDERER_PIDS="$(lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$EXISTING_RENDERER_PIDS" ]; then
  echo "desktop-dev: Stopping existing Vite renderer on port 5173..." >&2
  echo "$EXISTING_RENDERER_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "desktop-dev: Stopping existing desktop Electron process..." >&2
pkill -f "electron dist/main/index.js" 2>/dev/null || true
sleep 1

EXISTING_DAEMON_PIDS="$(lsof -tiTCP:43115 -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$EXISTING_DAEMON_PIDS" ]; then
  echo "desktop-dev: Stopping existing local daemon on port 43115..." >&2
  echo "$EXISTING_DAEMON_PIDS" | xargs kill -9 2>/dev/null || true
  sleep 1
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

"$PNPM_BIN" --dir desktop build:main

"$PNPM_BIN" --dir desktop dev:main > logs/desktop-main.log 2>&1 &
MAIN_WATCH_PID=$!

"$PNPM_BIN" --dir desktop dev:renderer > logs/desktop-renderer.log 2>&1 &
RENDERER_PID=$!

./scripts/wait-for-port.sh 5173 60 "Desktop renderer"

NION_DESKTOP_RENDERER_URL="http://127.0.0.1:5173" \
  "$PNPM_BIN" --dir desktop dev:electron
