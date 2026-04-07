#!/usr/bin/env bash

set -euo pipefail

prepend_path() {
  local candidate="$1"
  if [ -d "$candidate" ]; then
    export PATH="$candidate:$PATH"
  fi
}

version_gt() {
  local left="${1#v}"
  local right="${2#v}"
  local left_major left_minor left_patch
  local right_major right_minor right_patch

  IFS=. read -r left_major left_minor left_patch <<< "$left"
  IFS=. read -r right_major right_minor right_patch <<< "$right"

  left_major="${left_major:-0}"
  left_minor="${left_minor:-0}"
  left_patch="${left_patch:-0}"
  right_major="${right_major:-0}"
  right_minor="${right_minor:-0}"
  right_patch="${right_patch:-0}"

  if [ "$left_major" -ne "$right_major" ]; then
    [ "$left_major" -gt "$right_major" ]
    return
  fi

  if [ "$left_minor" -ne "$right_minor" ]; then
    [ "$left_minor" -gt "$right_minor" ]
    return
  fi

  [ "$left_patch" -gt "$right_patch" ]
}

latest_nvm_bin() {
  local versions_dir="$HOME/.nvm/versions/node"
  local candidate=""
  local candidate_version=""
  local best_bin=""
  local best_version=""

  [ -d "$versions_dir" ] || return 0

  for candidate in "$versions_dir"/*; do
    [ -x "$candidate/bin/node" ] || continue
    candidate_version="${candidate##*/}"
    if [ -z "$best_version" ] || version_gt "$candidate_version" "$best_version"; then
      best_version="$candidate_version"
      best_bin="$candidate/bin"
    fi
  done

  [ -n "$best_bin" ] && printf '%s\n' "$best_bin"
}

bootstrap_node_paths() {
  prepend_path "/opt/homebrew/bin"
  prepend_path "/usr/local/bin"
  prepend_path "$HOME/Library/pnpm"
  prepend_path "${NVM_BIN:-}"
  prepend_path "$HOME/.volta/bin"
  prepend_path "$HOME/.fnm/current/bin"

  local nvm_bin=""
  nvm_bin="$(latest_nvm_bin)"
  if [ -n "$nvm_bin" ]; then
    prepend_path "$nvm_bin"
  fi
}

bootstrap_node_paths

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
fi

if command -v corepack >/dev/null 2>&1; then
  exec corepack pnpm "$@"
fi

if command -v node >/dev/null 2>&1; then
  echo "Nion requires pnpm to run this command." >&2
  echo "Install it globally with 'npm install -g pnpm' or enable Corepack." >&2
  exit 1
fi

echo "Nion requires Node.js 22+ before desktop or web tooling can run." >&2
echo "Install Node.js, then retry. pnpm can be provided either globally or via Corepack." >&2
exit 1
