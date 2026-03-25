# Tauri Desktop Renderer Pivot From Settings OpenViking Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Nion as a pure desktop application on top of `codex/settings-openviking-rebuild` by replacing the fragile Next.js static-export renderer path with a Tauri v2 shell, a Vite-based desktop renderer, and a bundled Python helper sidecar.

**Architecture:** Treat the current `Next.js 16 + output: export` path as a dead end for the desktop target. Keep the existing `frontend/` web app available for web development, but build a separate `desktop/` workspace whose renderer is a static Vite React app reusing shared UI/core modules extracted from `frontend/src`. Run the existing Python backend as a local-only helper process inside the desktop bundle, expose only the minimal local HTTP/SSE APIs the renderer needs, and let Tauri v2 supervise the helper and package both assets and sidecar together.

**Tech Stack:** Tauri v2, Rust, Vite, React 19, TypeScript, Tailwind CSS 4, FastAPI, `NionClient`, PyInstaller, pnpm, uv

---

## Pre-Read

Read these before changing code:

- Existing desktop plan: `docs/plans/2026-03-25-electron-desktop-embedded-python-helper.md`
- Root orchestration: `Makefile`, `scripts/serve.sh`, `scripts/start-daemon.sh`
- Backend runtime entrypoints: `backend/app/gateway/app.py`, `backend/packages/harness/nion/client.py`, `backend/langgraph.json`
- Frontend thread/runtime surfaces: `frontend/src/core/api/api-client.ts`, `frontend/src/core/threads/hooks.ts`, `frontend/src/core/threads/types.ts`, `frontend/src/components/workspace/chats/use-thread-chat.ts`
- Next-bound files that must be audited for desktop reuse:
  - `frontend/src/components/theme-provider.tsx`
  - `frontend/src/components/workspace/workspace-container.tsx`
  - `frontend/src/components/workspace/recent-chat-list.tsx`
  - `frontend/src/components/workspace/command-palette.tsx`
  - `frontend/src/components/workspace/input-box.tsx`
  - `frontend/src/components/workspace/messages/message-list-item.tsx`
  - `frontend/src/components/workspace/chats/use-thread-chat.ts`
  - `frontend/src/components/workspace/chats/use-chat-mode.ts`
  - `frontend/src/core/i18n/server.ts`
  - `frontend/src/core/i18n/cookies.ts`
- Official references:
  - Tauri v2 frontend assets and `frontendDist`
  - Tauri v2 sidecars and `externalBin`
  - Next.js static export limitations for dynamic routes and server APIs

Constraints to preserve throughout implementation:

- Base all execution work on a new worktree created from `codex/settings-openviking-rebuild`
- Accept the user-reported baseline as the starting point:
  - `node --test src/core/navigation/desktop-routes.test.ts` passes
  - `pnpm typecheck` passes
  - `next build --webpack` for desktop static export is blocked by the `_global-error` prerender bug
- Do not spend more implementation time trying to hard-fix Next 16 static export for the desktop target
- Preserve user-visible capabilities: chats, artifacts, runtime mode, skills, memory, channels, automation, OpenViking-backed memory/config paths
- Desktop production runtime must not require `nginx`, `langgraph dev`, `next start`, Docker, Kubernetes, or a browser
- Remove desktop-only bundle waste, but do not break the existing web app while the migration is in progress

## Task 1: Create the Dedicated Worktree and Freeze the Renderer Pivot Decision

**Files:**
- Create: dedicated worktree only
- Create: `docs/desktop/renderer-pivot-contract.md`
- Create: `backend/tests/test_renderer_pivot_contract.py`

**Step 1: Create the dedicated worktree from the requested branch**

Run:

```bash
git worktree add ~/.config/superpowers/worktrees/nion/tauri-desktop-pivot -b codex/tauri-desktop-pivot codex/settings-openviking-rebuild
```

Expected: new worktree created on branch `codex/tauri-desktop-pivot`

**Step 2: Write the failing contract test**

Create `backend/tests/test_renderer_pivot_contract.py`:

```python
from pathlib import Path


def test_renderer_pivot_contract_records_tauri_and_vite() -> None:
    text = Path("docs/desktop/renderer-pivot-contract.md").read_text(encoding="utf-8")
    assert "Tauri v2" in text
    assert "Vite" in text
    assert "NionClient" in text
    assert "_global-error" in text
    assert "Do not continue investing in Next.js static export for desktop" in text
```

**Step 3: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_renderer_pivot_contract.py -q
```

Expected: `FAIL` because the contract doc does not exist

**Step 4: Write the contract doc**

Create `docs/desktop/renderer-pivot-contract.md` with:

- the base branch: `codex/settings-openviking-rebuild`
- the accepted blocker: Next 16 desktop static export is blocked by `_global-error`
- the explicit decision: do not keep investing in Next.js static export for desktop
- the chosen target: `Tauri v2 + Vite renderer + bundled Python helper`
- preserved capabilities list
- removed runtime surfaces list
- non-goals list:
  - no Rust rewrite of backend business logic
  - no attempt to keep Next server in desktop production
  - no second desktop renderer stack

**Step 5: Run the test again**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_renderer_pivot_contract.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add docs/desktop/renderer-pivot-contract.md backend/tests/test_renderer_pivot_contract.py
git commit -F - <<'EOF'
Freeze the desktop renderer pivot before further implementation

Constraint: The desktop target is blocked by the current Next.js export path and needs a new renderer lane
Rejected: Continue spending time on Next.js static export | the current blocker is framework-level and not core product work
Confidence: high
Scope-risk: narrow
Directive: Treat this contract as the gate that prevents drifting back to a hidden Next.js server in desktop production
Tested: UV_LINK_MODE=copy uv run pytest tests/test_renderer_pivot_contract.py -q
Not-tested: Any runtime packaging path
EOF
```

---

## Task 2: Scaffold the Root Workspace and the Dedicated `desktop/` Tauri + Vite App

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `desktop/package.json`
- Create: `desktop/tsconfig.json`
- Create: `desktop/vite.config.ts`
- Create: `desktop/index.html`
- Create: `desktop/src/main.tsx`
- Create: `desktop/src/App.tsx`
- Create: `desktop/tests/workspace-contract.test.mjs`
- Modify: `Makefile`

**Step 1: Write the failing workspace contract test**

Create `desktop/tests/workspace-contract.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop workspace exposes vite and tauri scripts", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.scripts["dev:web"]);
  assert.ok(pkg.scripts["build:web"]);
  assert.ok(pkg.scripts["dev:tauri"]);
  assert.ok(pkg.scripts["build:tauri"]);
  assert.ok(pkg.scripts["build:helper"]);
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
node --test desktop/tests/workspace-contract.test.mjs
```

Expected: `FAIL` because `desktop/` does not exist

**Step 3: Create the root workspace**

Create root `package.json` with scripts like:

```json
{
  "private": true,
  "packageManager": "pnpm@10.26.2",
  "scripts": {
    "frontend:check": "pnpm --dir frontend check",
    "desktop:install": "pnpm --dir desktop install",
    "desktop:dev": "pnpm --dir desktop dev:tauri",
    "desktop:build": "pnpm --dir desktop build:tauri"
  }
}
```

Create `pnpm-workspace.yaml` with:

```yaml
packages:
  - "frontend"
  - "desktop"
```

**Step 4: Create the desktop Vite app skeleton**

Create `desktop/package.json` with:

- `dev:web`
- `build:web`
- `dev:tauri`
- `build:tauri`
- `build:helper`
- `test`

Create a minimal Vite React app in:

- `desktop/index.html`
- `desktop/src/main.tsx`
- `desktop/src/App.tsx`
- `desktop/vite.config.ts`
- `desktop/tsconfig.json`

Use path aliases so the desktop app can later import shared code from `../frontend/src`.

**Step 5: Add root Makefile placeholders**

Update `Makefile` help and placeholder targets:

- `make desktop-install`
- `make desktop-dev`
- `make package-desktop`

Do not delete legacy web targets yet.

**Step 6: Run the test and the first Vite build**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
node --test desktop/tests/workspace-contract.test.mjs
pnpm --dir desktop build:web
```

Expected:

- test `PASS`
- Vite build `PASS`

**Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml desktop/package.json desktop/tsconfig.json desktop/vite.config.ts desktop/index.html desktop/src/main.tsx desktop/src/App.tsx desktop/tests/workspace-contract.test.mjs Makefile
git commit -F - <<'EOF'
Scaffold the dedicated desktop workspace for the Tauri renderer

Constraint: The desktop target needs an independent renderer pipeline that does not depend on Next.js export
Rejected: Reuse the existing Next.js app as the production renderer | keeps the current blocker on the critical path
Confidence: high
Scope-risk: moderate
Directive: Keep desktop renderer code in desktop/ and keep frontend/ usable for the existing web product
Tested: node --test desktop/tests/workspace-contract.test.mjs; pnpm --dir desktop build:web
Not-tested: Tauri startup
EOF
```

---

## Task 3: Add the Tauri v2 Shell, Sidecar Permissions, and Desktop Lifecycle Wiring

**Files:**
- Create: `desktop/src-tauri/Cargo.toml`
- Create: `desktop/src-tauri/tauri.conf.json`
- Create: `desktop/src-tauri/capabilities/default.json`
- Create: `desktop/src-tauri/src/main.rs`
- Create: `desktop/src-tauri/src/lib.rs`
- Create: `desktop/src-tauri/src/sidecar.rs`
- Create: `desktop/src-tauri/src/runtime_info.rs`
- Create: `desktop/tests/tauri-shell-contract.test.mjs`

**Step 1: Write the failing shell contract test**

Create `desktop/tests/tauri-shell-contract.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("tauri config embeds the helper sidecar", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  assert.ok(config.bundle.externalBin.includes("../bin/nion-helper"));
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/tauri-shell-contract.test.mjs
```

Expected: `FAIL`

**Step 3: Create the Tauri shell**

Create `desktop/src-tauri/Cargo.toml` and add:

- `tauri`
- `tauri-build`
- `tauri-plugin-shell`

Create `desktop/src-tauri/tauri.conf.json` with:

- `build.frontendDist` pointing at the Vite output directory
- `bundle.externalBin` containing the bundled Python helper
- app identifier and product name

Create `desktop/src-tauri/capabilities/default.json` with shell execute permission limited to the helper sidecar.

**Step 4: Implement helper supervision**

Create `desktop/src-tauri/src/sidecar.rs` with functions like:

```rust
pub fn helper_binary_name() -> &'static str {
    "nion-helper"
}
```

Create `desktop/src-tauri/src/lib.rs` that:

- starts the helper sidecar in `setup`
- exposes runtime info commands
- stops the helper on app exit

Keep the shell small. Do not proxy business logic into Rust.

**Step 5: Run the shell contract test and cargo test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/tauri-shell-contract.test.mjs
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: both `PASS`

**Step 6: Commit**

```bash
git add desktop/src-tauri/Cargo.toml desktop/src-tauri/tauri.conf.json desktop/src-tauri/capabilities/default.json desktop/src-tauri/src/main.rs desktop/src-tauri/src/lib.rs desktop/src-tauri/src/sidecar.rs desktop/src-tauri/src/runtime_info.rs desktop/tests/tauri-shell-contract.test.mjs
git commit -F - <<'EOF'
Create the Tauri shell and lock helper sidecar permissions

Constraint: The desktop binary must supervise the Python helper without introducing a browser/server runtime
Rejected: Keep packaging around Electron or a hidden Node server | misses the Tauri-only target and keeps unnecessary runtime layers
Confidence: high
Scope-risk: moderate
Directive: Rust owns lifecycle and permissions only; backend business logic stays in Python
Tested: node --test tests/tauri-shell-contract.test.mjs; cargo test --manifest-path src-tauri/Cargo.toml
Not-tested: Native packaged app launch
EOF
```

---

## Task 4: Add the Python Desktop Helper Entrypoint and Local-Only Runtime Endpoints

**Files:**
- Create: `backend/app/desktop_helper.py`
- Create: `backend/app/gateway/routers/desktop_system.py`
- Modify: `backend/app/gateway/app.py`
- Create: `backend/tests/test_desktop_helper_health.py`

**Step 1: Write the failing health test**

Create `backend/tests/test_desktop_helper_health.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_desktop_health_route_reports_desktop_service() -> None:
    client = TestClient(create_app())
    response = client.get("/api/desktop/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "desktop"
    assert payload["service"] == "nion-desktop-helper"
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_helper_health.py -q
```

Expected: `FAIL`

**Step 3: Implement the desktop helper entrypoint**

Create `backend/app/desktop_helper.py` that:

- boots the gateway app
- binds to `127.0.0.1` only
- chooses a free port
- prints the bound port for the Tauri shell

**Step 4: Implement desktop runtime endpoints**

Create `backend/app/gateway/routers/desktop_system.py` with:

- `GET /api/desktop/health`
- `GET /api/desktop/runtime-info`
- `POST /api/desktop/shutdown`

Mount the router in `backend/app/gateway/app.py`.

**Step 5: Run the test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_helper_health.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/app/desktop_helper.py backend/app/gateway/routers/desktop_system.py backend/app/gateway/app.py backend/tests/test_desktop_helper_health.py
git commit -F - <<'EOF'
Create the local desktop helper entrypoint and health surface

Constraint: The desktop app needs a local-only backend surface without nginx or langgraph dev
Rejected: Reuse the current full web startup chain inside desktop | preserves too many runtime layers
Confidence: high
Scope-risk: narrow
Directive: Keep desktop helper routes local-only and never expose a public network-facing contract here
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_helper_health.py -q
Not-tested: Helper startup under Tauri sidecar supervision
EOF
```

---

## Task 5: Add Local Thread Persistence and Streaming APIs Backed by `NionClient`

**Files:**
- Create: `backend/packages/harness/nion/threads/__init__.py`
- Create: `backend/packages/harness/nion/threads/models.py`
- Create: `backend/packages/harness/nion/threads/repository.py`
- Create: `backend/packages/harness/nion/threads/service.py`
- Create: `backend/app/gateway/routers/threads.py`
- Create: `backend/tests/test_thread_repository.py`
- Create: `backend/tests/test_threads_router.py`

**Step 1: Write the failing repository test**

Create `backend/tests/test_thread_repository.py`:

```python
from nion.threads.repository import ThreadRepository


def test_thread_repository_round_trips_metadata(tmp_path) -> None:
    repo = ThreadRepository(base_dir=tmp_path)
    repo.upsert_thread("thread-1", title="Hello")
    threads = repo.search(limit=10)
    assert threads[0]["thread_id"] == "thread-1"
    assert threads[0]["values"]["title"] == "Hello"
```

**Step 2: Write the failing router test**

Create `backend/tests/test_threads_router.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_threads_search_route_exists() -> None:
    client = TestClient(create_app())
    response = client.post("/api/threads/search", json={"limit": 10})
    assert response.status_code == 200
```

**Step 3: Run the failing tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_thread_repository.py tests/test_threads_router.py -q
```

Expected: `FAIL`

**Step 4: Implement local thread persistence**

Create a small metadata repository under `nion.config.paths()` storing:

- `thread_id`
- `agent_name`
- `title`
- `created_at`
- `updated_at`
- `archived`
- `deleted`

Use SQLite or JSON, but keep the surface intentionally small and desktop-focused.

**Step 5: Implement the threads router**

Create `backend/app/gateway/routers/threads.py` with:

- `POST /api/threads/search`
- `GET /api/threads/{thread_id}/state`
- `PATCH /api/threads/{thread_id}/state`
- `DELETE /api/threads/{thread_id}`
- `POST /api/threads/{thread_id}/stream`

The stream route must:

- call `NionClient.stream(...)`
- emit SSE frames
- update persisted thread metadata after completion

**Step 6: Run the tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_thread_repository.py tests/test_threads_router.py -q
```

Expected: `PASS`

**Step 7: Commit**

```bash
git add backend/packages/harness/nion/threads backend/app/gateway/routers/threads.py backend/tests/test_thread_repository.py backend/tests/test_threads_router.py
git commit -F - <<'EOF'
Add local thread persistence and streaming APIs for the desktop runtime

Constraint: The desktop renderer cannot depend on the LangGraph SDK HTTP contract in production
Rejected: Keep a bundled langgraph dev server for desktop | adds runtime complexity and preserves the wrong abstraction
Confidence: medium
Scope-risk: broad
Directive: Keep the local thread API aligned only with renderer needs and avoid recreating the entire LangGraph HTTP surface
Tested: UV_LINK_MODE=copy uv run pytest tests/test_thread_repository.py tests/test_threads_router.py -q
Not-tested: Long-running resume after helper restart
EOF
```

---

## Task 6: Introduce a Shared Renderer Client Contract and Add a Desktop Runtime Client

**Files:**
- Create: `frontend/src/core/runtime/client-contract.ts`
- Create: `frontend/src/core/runtime/client-web.ts`
- Create: `frontend/src/core/runtime/client-desktop.ts`
- Create: `frontend/src/core/runtime/types.ts`
- Create: `frontend/src/core/runtime/client-contract.test.ts`
- Modify: `frontend/src/core/api/api-client.ts`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/utils.ts`
- Modify: `frontend/src/components/workspace/messages/context.ts`
- Modify: `frontend/src/components/workspace/messages/message-group.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list-item.tsx`
- Modify: `frontend/src/components/workspace/thread-title.tsx`

**Step 1: Write the failing client contract test**

Create `frontend/src/core/runtime/client-contract.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { createDesktopRuntimeClient } from "./client-desktop";

test("desktop runtime client exposes search/state/stream methods", () => {
  const client = createDesktopRuntimeClient(() => "http://127.0.0.1:43115");
  assert.equal(typeof client.searchThreads, "function");
  assert.equal(typeof client.getThreadState, "function");
  assert.equal(typeof client.updateThreadState, "function");
  assert.equal(typeof client.deleteThread, "function");
  assert.equal(typeof client.streamThreadRun, "function");
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/runtime/client-contract.test.ts
```

Expected: `FAIL`

**Step 3: Create the shared client contract**

Define a small interface in `client-contract.ts` for:

- thread search
- thread state
- streaming
- upload helpers

Keep the interface renderer-oriented. Do not expose raw `@langchain/langgraph-sdk` types.

**Step 4: Implement the web and desktop clients**

Create:

- `client-web.ts` wrapping the current LangGraph SDK path
- `client-desktop.ts` using `fetch` + SSE against the local desktop helper

Update `hooks.ts`, `types.ts`, `utils.ts`, and the message components to consume the shared contract/types.

**Step 5: Run the test and typecheck**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/runtime/client-contract.test.ts
pnpm typecheck
```

Expected: both `PASS`

**Step 6: Commit**

```bash
git add frontend/src/core/runtime/client-contract.ts frontend/src/core/runtime/client-web.ts frontend/src/core/runtime/client-desktop.ts frontend/src/core/runtime/types.ts frontend/src/core/runtime/client-contract.test.ts frontend/src/core/api/api-client.ts frontend/src/core/threads/hooks.ts frontend/src/core/threads/types.ts frontend/src/core/threads/utils.ts frontend/src/components/workspace/messages/context.ts frontend/src/components/workspace/messages/message-group.tsx frontend/src/components/workspace/messages/message-list.tsx frontend/src/components/workspace/messages/message-list-item.tsx frontend/src/components/workspace/thread-title.tsx
git commit -F - <<'EOF'
Introduce a renderer client contract and add the desktop runtime implementation

Constraint: The desktop renderer must use a local runtime surface while the web app keeps using its existing SDK path
Rejected: Fork the entire workspace UI into a second implementation | duplicates too much behavior and slows iteration
Confidence: medium
Scope-risk: broad
Directive: Keep renderer client interfaces small, typed, and free of raw LangGraph SDK leakage
Tested: node --test src/core/runtime/client-contract.test.ts; pnpm typecheck
Not-tested: End-to-end desktop streaming
EOF
```

---

## Task 7: Extract a Navigation Adapter and Replace Direct `next/*` Imports in Shared Workspace Code

**Files:**
- Create: `frontend/src/core/navigation/types.ts`
- Create: `frontend/src/core/navigation/routes.ts`
- Create: `frontend/src/core/navigation/context.tsx`
- Create: `frontend/src/core/navigation/web-adapter.tsx`
- Create: `desktop/src/platform/navigation-desktop.tsx`
- Create: `frontend/src/core/navigation/routes.test.ts`
- Modify:
  - `frontend/src/components/theme-provider.tsx`
  - `frontend/src/components/workspace/workspace-container.tsx`
  - `frontend/src/components/workspace/recent-chat-list.tsx`
  - `frontend/src/components/workspace/command-palette.tsx`
  - `frontend/src/components/workspace/input-box.tsx`
  - `frontend/src/components/workspace/messages/message-list-item.tsx`
  - `frontend/src/components/workspace/chats/use-thread-chat.ts`
  - `frontend/src/components/workspace/chats/use-chat-mode.ts`
  - `frontend/src/components/workspace/workspace-nav-chat-list.tsx`
  - `frontend/src/components/workspace/workspace-nav-menu.tsx`
  - `frontend/src/components/workspace/workspace-sidebar-primary-action.tsx`
  - `frontend/src/components/workspace/settings/skill-settings-page.tsx`
  - `frontend/src/components/workspace/about/about-page.tsx`
  - `frontend/src/components/workspace/welcome.tsx`
  - `frontend/src/app/workspace/chats/page.tsx`
  - `frontend/src/app/workspace/agents/new/page.tsx`
  - `frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx`

**Step 1: Write the failing route helper test**

Create `frontend/src/core/navigation/routes.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { pathOfDesktopThread, pathOfDesktopAgentThread } from "./routes";

test("desktop routes use query params instead of dynamic filesystem segments", () => {
  assert.equal(pathOfDesktopThread("thread-1"), "/workspace/chats?thread=thread-1");
  assert.equal(
    pathOfDesktopAgentThread("writer", "thread-2"),
    "/workspace/agents?agent=writer&thread=thread-2",
  );
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/navigation/routes.test.ts
```

Expected: `FAIL`

**Step 3: Create the navigation abstraction**

Create:

- `types.ts` with a tiny router shape
- `routes.ts` with both web and desktop route helpers
- `context.tsx` for dependency injection
- `web-adapter.tsx` for the Next-backed implementation
- `desktop/src/platform/navigation-desktop.tsx` for the desktop implementation

**Step 4: Replace direct Next imports**

Update the listed shared files so they import navigation behavior from the adapter instead of importing `next/link` and `next/navigation` directly.

For shared links, introduce a local component shaped like:

```tsx
export function AppLink(props: { to: string; children: React.ReactNode }) {
  const { Link } = useAppNavigation();
  return <Link to={props.to}>{props.children}</Link>;
}
```

**Step 5: Run the test and typecheck**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/navigation/routes.test.ts
pnpm typecheck
```

Expected: both `PASS`

**Step 6: Commit**

```bash
git add frontend/src/core/navigation/types.ts frontend/src/core/navigation/routes.ts frontend/src/core/navigation/context.tsx frontend/src/core/navigation/web-adapter.tsx desktop/src/platform/navigation-desktop.tsx frontend/src/core/navigation/routes.test.ts frontend/src/components/theme-provider.tsx frontend/src/components/workspace/workspace-container.tsx frontend/src/components/workspace/recent-chat-list.tsx frontend/src/components/workspace/command-palette.tsx frontend/src/components/workspace/input-box.tsx frontend/src/components/workspace/messages/message-list-item.tsx frontend/src/components/workspace/chats/use-thread-chat.ts frontend/src/components/workspace/chats/use-chat-mode.ts frontend/src/components/workspace/workspace-nav-chat-list.tsx frontend/src/components/workspace/workspace-nav-menu.tsx frontend/src/components/workspace/workspace-sidebar-primary-action.tsx frontend/src/components/workspace/settings/skill-settings-page.tsx frontend/src/components/workspace/about/about-page.tsx frontend/src/components/workspace/welcome.tsx frontend/src/app/workspace/chats/page.tsx frontend/src/app/workspace/agents/new/page.tsx frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx
git commit -F - <<'EOF'
Extract a navigation adapter so shared workspace code no longer depends directly on Next

Constraint: The desktop renderer must reuse shared UI without importing next/navigation or next/link
Rejected: Rewrite all workspace screens separately for desktop | duplicates too much behavior and misses the point of the pivot
Confidence: medium
Scope-risk: broad
Directive: New shared workspace code must depend on the navigation adapter, never directly on Next navigation APIs
Tested: node --test src/core/navigation/routes.test.ts; pnpm typecheck
Not-tested: Desktop deep-link behavior under a packaged app
EOF
```

---

## Task 8: Build the Desktop App Root, Providers, and Static Query-Based Routes in Vite

**Files:**
- Create: `desktop/src/app/DesktopRoot.tsx`
- Create: `desktop/src/app/routes.tsx`
- Create: `desktop/src/platform/providers.tsx`
- Create: `desktop/src/platform/runtime.ts`
- Create: `desktop/src/app/DesktopRoot.test.tsx`
- Modify: `desktop/src/App.tsx`
- Modify: `desktop/src/main.tsx`

**Step 1: Write the failing desktop root test**

Create `desktop/src/app/DesktopRoot.test.tsx`:

```tsx
import test from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";

import { DesktopRoot } from "./DesktopRoot";

test("desktop root renders the workspace shell", () => {
  const html = renderToString(<DesktopRoot />);
  assert.match(html, /workspace/i);
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --import tsx --test src/app/DesktopRoot.test.tsx
```

Expected: `FAIL`

**Step 3: Create the desktop root**

Create:

- `providers.tsx` with `QueryClientProvider`, `I18nProvider`, `ThemeProvider`, and the desktop navigation context
- `routes.tsx` mapping static desktop URLs:
  - `/`
  - `/workspace`
  - `/workspace/chats`
  - `/workspace/agents`
- `runtime.ts` with desktop-specific helpers for helper base URL and runtime info

`DesktopRoot.tsx` should mount the existing workspace UI using query params for selected thread and agent.

**Step 4: Wire the app entrypoint**

Update `desktop/src/App.tsx` and `desktop/src/main.tsx` to render `DesktopRoot`.

**Step 5: Run the test and build**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --import tsx --test src/app/DesktopRoot.test.tsx
pnpm build:web
```

Expected: both `PASS`

**Step 6: Commit**

```bash
git add desktop/src/app/DesktopRoot.tsx desktop/src/app/routes.tsx desktop/src/platform/providers.tsx desktop/src/platform/runtime.ts desktop/src/app/DesktopRoot.test.tsx desktop/src/App.tsx desktop/src/main.tsx
git commit -F - <<'EOF'
Create the desktop app root and mount the shared workspace UI through static routes

Constraint: The desktop renderer must be statically buildable without App Router dynamic segments
Rejected: Keep filesystem dynamic routes as the desktop runtime model | they are tied to the failing Next.js export path
Confidence: medium
Scope-risk: broad
Directive: Desktop route state lives in query params and local router state, not in App Router filesystem params
Tested: node --import tsx --test src/app/DesktopRoot.test.tsx; pnpm build:web
Not-tested: Full desktop user flows
EOF
```

---

## Task 9: Bundle the Python Helper, Trim Desktop-Only Dependency Weight, and Add Packaging Scripts

**Files:**
- Create: `backend/packaging/pyinstaller/nion-helper.spec`
- Create: `desktop/scripts/check-bundle-size.mjs`
- Create: `desktop/bundle-budget.json`
- Create: `scripts/build-desktop-helper.sh`
- Create: `scripts/package-tauri-desktop.sh`
- Create: `backend/tests/test_desktop_dependency_profile.py`
- Modify: `backend/pyproject.toml`
- Modify: `backend/packages/harness/pyproject.toml`
- Modify: `Makefile`

**Step 1: Write the failing dependency-profile test**

Create `backend/tests/test_desktop_dependency_profile.py`:

```python
from pathlib import Path


def test_desktop_profile_moves_deployment_only_dependencies_out_of_core() -> None:
    text = Path("packages/harness/pyproject.toml").read_text(encoding="utf-8")
    assert "langgraph-cli" not in text or "optional-dependencies" in text
    assert "kubernetes" not in text or "optional-dependencies" in text
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_dependency_profile.py -q
```

Expected: `FAIL`

**Step 3: Split desktop bundle dependencies**

Move deployment-only dependencies behind optional groups where possible:

- `langgraph-cli`
- `langgraph-api`
- `kubernetes`

Do not remove:

- channels
- remote search/scrape tools
- cloud model providers
- OpenViking-related runtime dependencies

**Step 4: Add the PyInstaller spec and scripts**

Create `backend/packaging/pyinstaller/nion-helper.spec` targeting `app.desktop_helper:main`.

Create:

- `scripts/build-desktop-helper.sh`
- `scripts/package-tauri-desktop.sh`

Add `desktop/bundle-budget.json` and `check-bundle-size.mjs`.

**Step 5: Run the test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_dependency_profile.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/packaging/pyinstaller/nion-helper.spec desktop/scripts/check-bundle-size.mjs desktop/bundle-budget.json scripts/build-desktop-helper.sh scripts/package-tauri-desktop.sh backend/tests/test_desktop_dependency_profile.py backend/pyproject.toml backend/packages/harness/pyproject.toml Makefile
git commit -F - <<'EOF'
Bundle the helper and trim desktop-only dependency weight

Constraint: The pure desktop bundle must stay reasonably small without dropping user-visible functionality
Rejected: Ship every backend deployment dependency in the desktop build | bloats the installer and preserves the wrong runtime assumptions
Confidence: medium
Scope-risk: moderate
Directive: Remove only deployment-only dependencies from the desktop profile and keep runtime-facing capabilities intact
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_dependency_profile.py -q
Not-tested: Final packaged size on native macOS and Windows
EOF
```

---

## Task 10: Add End-to-End Packaging Verification, Desktop CI, and Final Documentation

**Files:**
- Create: `.github/workflows/desktop-tauri-smoke.yml`
- Create: `.github/workflows/desktop-tauri-release.yml`
- Create: `docs/desktop/development.md`
- Create: `docs/desktop/release.md`
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `backend/README.md`

**Step 1: Write the failing CI contract test**

Create `backend/tests/test_desktop_release_workflow_contract.py`:

```python
from pathlib import Path


def test_desktop_release_workflow_exists() -> None:
    text = Path("../.github/workflows/desktop-tauri-release.yml").read_text(encoding="utf-8")
    assert "macos-latest" in text
    assert "windows-latest" in text
    assert "tauri" in text.lower()
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_release_workflow_contract.py -q
```

Expected: `FAIL`

**Step 3: Add CI workflows**

Create:

- `desktop-tauri-smoke.yml` for PR smoke builds
- `desktop-tauri-release.yml` for tagged macOS and Windows packaging

Each workflow must:

- install backend + frontend + desktop dependencies
- build the Python helper
- build the Vite renderer
- run the Tauri packaging lane

**Step 4: Add docs**

Create:

- `docs/desktop/development.md`
- `docs/desktop/release.md`

Update the READMEs so desktop is documented as:

- Tauri shell
- bundled Python helper
- Vite renderer
- no Next.js server in production desktop runtime

**Step 5: Run the test and final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_release_workflow_contract.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm build:web
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: all `PASS`

**Step 6: Commit**

```bash
git add .github/workflows/desktop-tauri-smoke.yml .github/workflows/desktop-tauri-release.yml docs/desktop/development.md docs/desktop/release.md README.md frontend/README.md backend/README.md backend/tests/test_desktop_release_workflow_contract.py
git commit -F - <<'EOF'
Add desktop CI and document the Tauri + Vite + helper architecture

Constraint: The new desktop path must be reproducible by CI and understandable to future maintainers
Rejected: Leave the renderer pivot as tribal knowledge | invites regression back to the broken Next.js export path
Confidence: high
Scope-risk: moderate
Directive: Documentation must keep calling out that desktop production uses Vite assets plus a bundled helper, not a Next.js server
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_release_workflow_contract.py -q; pnpm build:web; cargo test --manifest-path src-tauri/Cargo.toml
Not-tested: Signed release artifacts on real macOS and Windows hosts
EOF
```

---

## Final Verification Checklist

Run these before calling the migration complete:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm typecheck

cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_renderer_pivot_contract.py tests/test_desktop_helper_health.py tests/test_thread_repository.py tests/test_threads_router.py tests/test_desktop_dependency_profile.py tests/test_desktop_release_workflow_contract.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/workspace-contract.test.mjs
node --test tests/tauri-shell-contract.test.mjs
node --import tsx --test src/app/DesktopRoot.test.tsx
pnpm build:web
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected:

- all tests `PASS`
- Vite renderer build `PASS`
- Tauri Rust tests `PASS`
- no desktop packaging step depends on `next build`, `next export`, `nginx`, or `langgraph dev`

## Notes for the Implementer

- Keep the old web app working while building the desktop path. Do not force the web route to migrate at the same time unless the adapter extraction makes it unavoidable.
- If you discover that `codex/settings-openviking-rebuild` is missing the user-reported `desktop-routes` work, record the mismatch in the first commit and continue from the branch as checked out in the dedicated worktree.
- Prefer deleting desktop-only dead paths from the desktop bundle over adding compatibility shims.
- Do not add a Node backend just to preserve old renderer assumptions. That defeats the purpose of the pivot.
