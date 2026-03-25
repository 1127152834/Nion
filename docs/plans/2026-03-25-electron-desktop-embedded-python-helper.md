# Electron Desktop With Embedded Python Helper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Nion as a desktop-only Electron application for macOS and Windows, with a bundled Python helper service, full end-user feature coverage, controlled package size, one-command Make packaging, and release/update delivery through GitHub Releases with optional generic CDN publishing.

**Architecture:** Create a new `desktop/` Electron workspace that launches a bundled Python helper and loads a statically packaged desktop renderer. Replace the renderer's LangGraph SDK dependency with a thin desktop runtime client over new local thread/stream APIs backed by `NionClient`, preserving channels, remote web tools, cloud providers, memory, automation, and artifacts while deleting only browser/server deployment topology (`nginx`, standalone `langgraph dev`, browser auth route, Docker/Kubernetes/provisioner desktop payloads). Use `electron-builder` as the canonical release/update packager, `electron-forge` as the secondary packaging lane, and freeze the Python helper with `PyInstaller --onedir`.

**Tech Stack:** Electron, TypeScript, Next.js desktop-static build profile, FastAPI, `NionClient`, PyInstaller, electron-builder, electron-forge, electron-updater, GitHub Actions, GitHub Releases, optional generic CDN publish

---

## Pre-Read

Reference surfaces to understand before changing code:

- Root dev orchestration: `Makefile`, `scripts/serve.sh`, `scripts/start-daemon.sh`
- Backend runtime entrypoints: `backend/langgraph.json`, `backend/app/gateway/app.py`, `backend/packages/harness/nion/client.py`
- Frontend runtime client surfaces: `frontend/src/core/api/api-client.ts`, `frontend/src/core/threads/hooks.ts`, `frontend/src/core/threads/utils.ts`
- Channel/runtime integrations: `backend/app/channels/*`, `backend/packages/harness/nion/automation/*`
- Packaging and update docs:
  - Electron app lifecycle and login items: https://www.electronjs.org/docs/latest/api/app
  - Electron context isolation and IPC: https://www.electronjs.org/docs/latest/tutorial/context-isolation and https://www.electronjs.org/docs/latest/tutorial/ipc
  - Electron ASAR rules: https://www.electronjs.org/docs/latest/tutorial/asar-archives
  - electron-builder config and publish targets: https://www.electron.build/configuration.html
  - PyInstaller usage and bundle caveats: https://www.pyinstaller.org/en/stable/usage.html

Constraints to preserve throughout implementation:

- Preserve user-visible capabilities: channels, remote search/scrape tools, cloud model providers, automation, artifacts, skills, recall, OpenViking-backed memory
- Remove only server/browser deployment topology and desktop-irrelevant payloads
- Desktop production runtime must not require `nginx`, `langgraph dev`, Docker, Kubernetes, or a browser
- macOS + Windows packaging must work from native hosts and from CI matrix jobs
- Root `make` entrypoints must become desktop-first
- Auto-update must support GitHub Releases first and generic CDN second without changing app code

## Task 1: Create an Isolated Desktop Worktree and Lock the Desktop Contract

**Files:**
- Create: dedicated worktree only
- Create: `docs/desktop/desktop-product-contract.md`
- Create: `backend/tests/test_desktop_product_contract.py`

**Step 1: Create the desktop worktree**

Run:

```bash
git worktree add ~/.config/superpowers/worktrees/nion/electron-desktop -b codex/electron-desktop-helper main
```

Expected: worktree created with a clean branch

**Step 2: Write the failing desktop contract test**

Create `backend/tests/test_desktop_product_contract.py`:

```python
from pathlib import Path


def test_desktop_contract_declares_builder_and_forge() -> None:
    contract = Path("docs/desktop/desktop-product-contract.md").read_text(encoding="utf-8")
    assert "electron-builder" in contract
    assert "electron-forge" in contract
    assert "GitHub Releases" in contract
    assert "generic CDN" in contract
```

**Step 3: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
```

Expected: `FAIL` because the contract doc does not exist

**Step 4: Write the desktop contract doc**

Create `docs/desktop/desktop-product-contract.md` with:

- Desktop-only runtime statement
- Supported platforms: macOS, Windows
- Preserved features list
- Removed deployment surfaces list
- Packaging lanes: `electron-builder`, `electron-forge`
- Python helper freezing strategy: `PyInstaller --onedir`
- Update providers: GitHub Releases, generic CDN
- Bundle budget targets

**Step 5: Run the test again**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add docs/desktop/desktop-product-contract.md backend/tests/test_desktop_product_contract.py
git commit -F - <<'EOF'
Record the desktop-only product contract before runtime surgery

Constraint: Desktop packaging must preserve all user-visible features while dropping browser/server deployment topology
Rejected: Start implementation without a fixed contract | would blur product scope and package-size boundaries
Confidence: high
Scope-risk: narrow
Directive: Treat this contract as the release gate for all desktop packaging changes
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
Not-tested: Native packaging on macOS/Windows
EOF
```

---

## Task 2: Scaffold the Dedicated Electron Workspace and JS Monorepo Wiring

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `desktop/package.json`
- Create: `desktop/tsconfig.json`
- Create: `desktop/src/main/index.ts`
- Create: `desktop/src/preload/index.ts`
- Create: `desktop/src/shared/ipc.ts`
- Create: `desktop/tests/workspace-contract.test.mjs`
- Modify: `Makefile`

**Step 1: Write the failing workspace contract test**

Create `desktop/tests/workspace-contract.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop workspace defines builder and forge packaging scripts", () => {
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.scripts["package:builder"]);
  assert.ok(pkg.scripts["package:forge"]);
  assert.ok(pkg.scripts["build:helper"]);
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
node --test desktop/tests/workspace-contract.test.mjs
```

Expected: `FAIL` because the `desktop/` workspace does not exist

**Step 3: Add the root JS workspace**

Create:

- root `package.json` with shared scripts delegating to `frontend` and `desktop`
- `pnpm-workspace.yaml` listing `frontend` and `desktop`

The root package should include scripts like:

```json
{
  "private": true,
  "packageManager": "pnpm@10.26.2",
  "scripts": {
    "desktop:install": "pnpm --dir desktop install",
    "desktop:build": "pnpm --dir desktop build",
    "frontend:check": "pnpm --dir frontend check"
  }
}
```

**Step 4: Add the Electron workspace skeleton**

Create `desktop/package.json` with:

- `build`
- `dev`
- `package:builder`
- `package:forge`
- `build:helper`
- `test`

Create `desktop/src/main/index.ts`, `desktop/src/preload/index.ts`, `desktop/src/shared/ipc.ts` as empty but typed skeletons.

**Step 5: Add root Makefile desktop-first placeholders**

Modify root `Makefile` so `help` includes:

- `make desktop-install`
- `make desktop-dev`
- `make package-desktop-builder`
- `make package-desktop-forge`

Do not delete old targets yet; just add desktop placeholders in this task.

**Step 6: Run the desktop workspace test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
node --test desktop/tests/workspace-contract.test.mjs
```

Expected: `PASS`

**Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml desktop/package.json desktop/tsconfig.json desktop/src/main/index.ts desktop/src/preload/index.ts desktop/src/shared/ipc.ts desktop/tests/workspace-contract.test.mjs Makefile
git commit -F - <<'EOF'
Create the dedicated Electron workspace and root desktop build wiring

Constraint: Desktop packaging needs an isolated JS workspace without coupling Electron tooling to backend-only commands
Rejected: Reuse frontend package as the Electron package | blurs renderer and shell responsibilities
Confidence: high
Scope-risk: moderate
Directive: Keep Electron shell code in desktop/ and keep frontend reusable as a renderer-only package
Tested: node --test desktop/tests/workspace-contract.test.mjs
Not-tested: Electron launch
EOF
```

---

## Task 3: Add the Electron Main Process, Preload Bridge, and Local Service Supervision Contract

**Files:**
- Create: `desktop/src/main/window.ts`
- Create: `desktop/src/main/backend-supervisor.ts`
- Create: `desktop/src/main/updater.ts`
- Create: `desktop/src/main/protocol.ts`
- Create: `desktop/src/main/config.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/preload/index.ts`
- Create: `desktop/tests/supervisor.test.mjs`

**Step 1: Write the failing supervisor test**

Create `desktop/tests/supervisor.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { buildBackendCommand } from "../dist/main/backend-supervisor.js";

test("backend supervisor resolves helper path outside ASAR", () => {
  const cmd = buildBackendCommand({
    resourcesPath: "/tmp/Nion.app/Contents/Resources",
    platform: "darwin",
  });
  assert.match(cmd.executable, /Resources\/backend\//);
  assert.equal(cmd.executable.includes(".asar"), false);
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test -- supervisor.test.mjs
```

Expected: `FAIL` because the supervisor module does not exist

**Step 3: Implement the Electron shell**

Create:

- `window.ts` for BrowserWindow creation
- `protocol.ts` for serving renderer assets through a desktop-safe protocol
- `backend-supervisor.ts` for helper command resolution, health checks, restart policy, and graceful shutdown
- `config.ts` for app data paths, port/socket resolution, and environment shaping

The preload bridge should expose only:

```ts
contextBridge.exposeInMainWorld("nionDesktop", {
  getRuntimeInfo: () => ipcRenderer.invoke("desktop:get-runtime-info"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:check-for-updates"),
  quitAndInstallUpdate: () => ipcRenderer.invoke("desktop:quit-and-install-update"),
});
```

**Step 4: Wire Electron startup**

Update `desktop/src/main/index.ts` to:

- bootstrap the custom protocol
- start the Python helper supervisor
- create the main window only after helper health passes
- initialize the updater module

**Step 5: Run the supervisor test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm build
pnpm test -- supervisor.test.mjs
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add desktop/src/main/index.ts desktop/src/main/window.ts desktop/src/main/backend-supervisor.ts desktop/src/main/updater.ts desktop/src/main/protocol.ts desktop/src/main/config.ts desktop/src/preload/index.ts desktop/tests/supervisor.test.mjs
git commit -F - <<'EOF'
Add the Electron shell lifecycle and bundled helper supervision contract

Constraint: The packaged app must never execute helper binaries from inside ASAR
Rejected: Run the Python helper directly from app.asar | Electron packaging semantics make that unsafe and brittle
Confidence: medium
Scope-risk: moderate
Directive: Keep the preload bridge narrow; do not leak raw ipcRenderer or file paths into the renderer
Tested: pnpm build; pnpm test -- supervisor.test.mjs
Not-tested: macOS code signing, Windows packaged launch
EOF
```

---

## Task 4: Create the Desktop Python Helper Entrypoint and Health Surface

**Files:**
- Create: `backend/app/desktop_helper.py`
- Create: `backend/app/gateway/routers/desktop_system.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/gateway/app.py`
- Create: `backend/tests/test_desktop_helper_health.py`

**Step 1: Write the failing health test**

Create `backend/tests/test_desktop_helper_health.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_desktop_health_route_reports_desktop_runtime() -> None:
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

Expected: `FAIL` because the route does not exist

**Step 3: Add the desktop helper entrypoint**

Create `backend/app/desktop_helper.py` that:

- boots the FastAPI app
- binds only to loopback or socket path
- reads `NION_DESKTOP_HELPER_*` environment values
- logs desktop runtime metadata

**Step 4: Add the desktop system router**

Create `desktop_system.py` with:

- `GET /api/desktop/health`
- `GET /api/desktop/runtime-info`
- `POST /api/desktop/shutdown`

Mount it in `app.py`.

**Step 5: Run the health test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_helper_health.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/app/desktop_helper.py backend/app/gateway/routers/desktop_system.py backend/app/gateway/routers/__init__.py backend/app/gateway/app.py backend/tests/test_desktop_helper_health.py
git commit -F - <<'EOF'
Create the desktop helper entrypoint and local health surface

Constraint: The desktop helper must be privately reachable and bootable without nginx or langgraph dev
Rejected: Reuse the existing root serve.sh chain inside Electron | keeps browser/server deployment topology alive
Confidence: high
Scope-risk: moderate
Directive: Keep all desktop helper endpoints local-only and do not assume a browser origin
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_helper_health.py -q
Not-tested: helper launch from Electron main process
EOF
```

---

## Task 5: Add Local Thread Persistence and Stream APIs Backed by NionClient

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

**Step 4: Implement thread persistence**

Create a small thread metadata repository storing:

- `thread_id`
- `agent_name`
- `created_at`
- `updated_at`
- `title`
- `archived/deleted` flags
- optional renderer-facing snapshot data

Use SQLite or JSON under `~/.nion-data` through `nion.config.paths`.

**Step 5: Implement the router**

Create `backend/app/gateway/routers/threads.py` with:

- `POST /api/threads/search`
- `GET /api/threads/{thread_id}/state`
- `PATCH /api/threads/{thread_id}/state`
- `DELETE /api/threads/{thread_id}`
- `POST /api/threads/{thread_id}/stream`

The stream route must:

- call `NionClient.stream(...)`
- emit SSE frames the renderer can consume
- update thread metadata after completion

**Step 6: Run the repository/router tests**

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
Add local thread persistence and stream APIs backed by the embedded runtime

Constraint: The renderer must retain thread search and streaming without relying on LangGraph Server
Rejected: Keep the old SDK contract by bundling langgraph dev in production | increases process count and desktop complexity
Confidence: medium
Scope-risk: broad
Directive: Keep the desktop thread API surface small and explicitly aligned with what the renderer actually uses
Tested: UV_LINK_MODE=copy uv run pytest tests/test_thread_repository.py tests/test_threads_router.py -q
Not-tested: Long-running stream resume after helper restart
EOF
```

---

## Task 6: Replace the Renderer's LangGraph SDK Dependency With a Desktop Runtime Client

**Files:**
- Create: `frontend/src/core/api/desktop-client.ts`
- Create: `frontend/src/core/threads/desktop-types.ts`
- Create: `frontend/src/core/threads/desktop-client.test.ts`
- Modify: `frontend/src/core/api/api-client.ts`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/utils.ts`
- Modify: `frontend/src/components/workspace/messages/*` as needed

**Step 1: Write the failing desktop client test**

Create `frontend/src/core/threads/desktop-client.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { createDesktopThreadClient } from "./desktop-client";

test("desktop thread client exposes search/getState/update/delete/stream", () => {
  const client = createDesktopThreadClient(() => "http://127.0.0.1:43115");
  assert.equal(typeof client.search, "function");
  assert.equal(typeof client.getState, "function");
  assert.equal(typeof client.updateState, "function");
  assert.equal(typeof client.deleteThread, "function");
  assert.equal(typeof client.streamRun, "function");
});
```

**Step 2: Run the failing frontend test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/threads/desktop-client.test.ts
```

Expected: `FAIL`

**Step 3: Implement the thin desktop client**

Create `desktop-client.ts` with methods:

- `search`
- `getState`
- `updateState`
- `deleteThread`
- `streamRun`

Keep the method names stable and renderer-focused.

**Step 4: Replace LangGraph SDK usage**

Update:

- `src/core/api/api-client.ts` to stop importing `@langchain/langgraph-sdk/client`
- `src/core/threads/hooks.ts` to use the new client and a custom stream consumer
- `src/core/threads/types.ts` and `utils.ts` to use local message/thread types instead of SDK types

**Step 5: Run the focused test and typecheck**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/threads/desktop-client.test.ts
pnpm typecheck
```

Expected: both `PASS`

**Step 6: Commit**

```bash
git add frontend/src/core/api/api-client.ts frontend/src/core/api/desktop-client.ts frontend/src/core/threads/desktop-types.ts frontend/src/core/threads/desktop-client.test.ts frontend/src/core/threads/hooks.ts frontend/src/core/threads/types.ts frontend/src/core/threads/utils.ts frontend/src/components/workspace/messages
git commit -F - <<'EOF'
Replace the renderer LangGraph SDK dependency with a desktop runtime client

Constraint: Desktop production must not require a separate LangGraph server process
Rejected: Keep using @langchain/langgraph-sdk in desktop release | preserves an obsolete external service contract
Confidence: medium
Scope-risk: broad
Directive: Keep the desktop client API intentionally small and do not reintroduce generic SDK coupling
Tested: node --test src/core/threads/desktop-client.test.ts; pnpm typecheck
Not-tested: Full renderer end-to-end streaming in packaged Electron
EOF
```

---

## Task 7: Flatten Desktop Routing and Remove Server-Only Next Features So the Renderer Can Be Statically Packaged

**Files:**
- Create: `frontend/src/core/navigation/desktop-routes.ts`
- Create: `frontend/src/core/navigation/desktop-routes.test.ts`
- Modify: `frontend/src/app/workspace/chats/page.tsx`
- Modify: `frontend/src/app/workspace/agents/page.tsx`
- Modify: `frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx`
- Modify: `frontend/src/app/workspace/chats/[thread_id]/page.tsx`
- Delete: `frontend/src/app/api/auth/[...all]/route.ts`
- Delete: `frontend/src/server/better-auth/client.ts`
- Delete: `frontend/src/server/better-auth/config.ts`
- Delete: `frontend/src/server/better-auth/index.ts`
- Delete: `frontend/src/server/better-auth/server.ts`
- Modify: `frontend/src/core/i18n/server.ts`
- Modify: `frontend/src/core/i18n/cookies.ts`
- Modify: `frontend/next.config.ts`

**Step 1: Write the failing route-contract test**

Create `frontend/src/core/navigation/desktop-routes.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { pathOfThread, pathOfAgentThread } from "./desktop-routes";

test("desktop routes are query-based and static-export friendly", () => {
  assert.equal(pathOfThread("thread-1"), "/workspace/chats?thread=thread-1");
  assert.equal(
    pathOfAgentThread("writer", "thread-2"),
    "/workspace/agents?agent=writer&thread=thread-2",
  );
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/navigation/desktop-routes.test.ts
```

Expected: `FAIL`

**Step 3: Implement static-friendly route helpers**

Create `desktop-routes.ts` and migrate thread navigation helpers away from filesystem dynamic segments to query-based routes.

**Step 4: Remove server-only Next features**

Delete the unused `better-auth` route and helper files.

Replace `detectLocaleServer()` so it falls back to:

- desktop bridge setting
- persisted local setting
- browser language

Set `next.config.ts` to desktop static/export mode once all server-only imports are gone.

**Step 5: Update page components**

Refactor the thread pages so the selected thread/agent comes from query params or local state instead of App Router dynamic segments.

**Step 6: Run the test and build**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/navigation/desktop-routes.test.ts
pnpm build
```

Expected: both `PASS`

**Step 7: Commit**

```bash
git add frontend/src/core/navigation/desktop-routes.ts frontend/src/core/navigation/desktop-routes.test.ts frontend/src/app/workspace/chats/page.tsx frontend/src/app/workspace/agents/page.tsx frontend/src/app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx frontend/src/app/workspace/chats/[thread_id]/page.tsx frontend/src/core/i18n/server.ts frontend/src/core/i18n/cookies.ts frontend/next.config.ts
git rm frontend/src/app/api/auth/[...all]/route.ts frontend/src/server/better-auth/client.ts frontend/src/server/better-auth/config.ts frontend/src/server/better-auth/index.ts frontend/src/server/better-auth/server.ts
git commit -F - <<'EOF'
Flatten renderer routing and remove server-only Next features for desktop export

Constraint: Desktop release must not need a hidden web server just to render the UI
Rejected: Keep App Router dynamic filesystem routes unchanged | blocks static packaging and increases runtime complexity
Confidence: medium
Scope-risk: broad
Directive: All renderer navigation must remain static-export friendly after this point
Tested: node --test src/core/navigation/desktop-routes.test.ts; pnpm build
Not-tested: Deep links into packaged Electron builds
EOF
```

---

## Task 8: Rewire Channels and Automation to the Embedded Runtime Instead of LangGraph URLs

**Files:**
- Modify: `backend/app/channels/manager.py`
- Modify: `backend/app/channels/service.py`
- Modify: `backend/packages/harness/nion/automation/executor.py`
- Modify: `backend/packages/harness/nion/automation/service.py`
- Create: `backend/tests/test_channel_manager_embedded.py`
- Create: `backend/tests/test_automation_embedded_runner.py`

**Step 1: Write the failing channel test**

Create `backend/tests/test_channel_manager_embedded.py`:

```python
from app.channels.manager import ChannelManager


def test_channel_manager_uses_embedded_runtime_when_desktop_mode_enabled() -> None:
    manager = ChannelManager(bus=None, store=None, runtime_mode="embedded")
    assert manager.runtime_mode == "embedded"
```

**Step 2: Write the failing automation test**

Create `backend/tests/test_automation_embedded_runner.py`:

```python
from nion.automation.executor import EmbeddedAutomationRunner


def test_embedded_automation_runner_accepts_nion_client() -> None:
    runner = EmbeddedAutomationRunner(client=object())
    assert runner is not None
```

**Step 3: Run the failing tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_channel_manager_embedded.py tests/test_automation_embedded_runner.py -q
```

Expected: `FAIL`

**Step 4: Add embedded runtime execution paths**

Update `ChannelManager` and automation execution so they can:

- instantiate or receive `NionClient`
- submit runs locally
- stream/collect results without `langgraph_url`

Preserve the existing channel behaviors:

- Feishu websocket mode
- Slack socket mode
- Telegram polling

**Step 5: Run the tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_channel_manager_embedded.py tests/test_automation_embedded_runner.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/app/channels/manager.py backend/app/channels/service.py backend/packages/harness/nion/automation/executor.py backend/packages/harness/nion/automation/service.py backend/tests/test_channel_manager_embedded.py backend/tests/test_automation_embedded_runner.py
git commit -F - <<'EOF'
Rewire channels and automation to the embedded runtime for desktop mode

Constraint: Feature parity requires channels and automations to survive the removal of the standalone LangGraph server
Rejected: Drop channels or automation from desktop scope | violates the desktop feature-completeness requirement
Confidence: medium
Scope-risk: broad
Directive: Embedded runtime mode must remain a first-class path, not a degraded compatibility fallback
Tested: UV_LINK_MODE=copy uv run pytest tests/test_channel_manager_embedded.py tests/test_automation_embedded_runner.py -q
Not-tested: Live Feishu/Slack/Telegram connector sessions
EOF
```

---

## Task 9: Define the Desktop Bundle Profile and Enforce Package-Size Budgets

**Files:**
- Create: `desktop/bundle-budget.json`
- Create: `desktop/scripts/check-bundle-size.mjs`
- Create: `backend/packaging/pyinstaller/nion-backend.spec`
- Create: `backend/tests/test_desktop_dependency_profile.py`
- Modify: `backend/pyproject.toml`
- Modify: `backend/packages/harness/pyproject.toml`

**Step 1: Write the failing dependency-profile test**

Create `backend/tests/test_desktop_dependency_profile.py`:

```python
from pathlib import Path


def test_desktop_profile_excludes_server_deployment_dependencies() -> None:
    text = Path("packages/harness/pyproject.toml").read_text(encoding="utf-8")
    assert "kubernetes" not in text or "optional-dependencies" in text
    assert "langgraph-cli" not in text or "optional-dependencies" in text
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_dependency_profile.py -q
```

Expected: `FAIL`

**Step 3: Split desktop bundle dependencies**

Refactor backend dependency metadata so the desktop bundle includes:

- core harness/runtime
- channels
- remote web tools
- cloud providers

And excludes from the desktop bundle:

- `kubernetes`
- `langgraph-cli`
- `langgraph-api`
- Docker/provisioner-only support dependencies

If repo-wide dev still needs them, keep them in non-desktop optional groups.

**Step 4: Add the PyInstaller spec**

Create `backend/packaging/pyinstaller/nion-backend.spec` that:

- packages `app.desktop_helper:main`
- excludes tests, docs, docker, `.github`, mock/demo data
- writes into platform-specific `dist/nion-backend/<platform>/`

**Step 5: Add bundle budgets**

Create `desktop/bundle-budget.json` like:

```json
{
  "macos_zip_max_mb": 350,
  "windows_nsis_max_mb": 350,
  "python_helper_max_mb": 180
}
```

Add `check-bundle-size.mjs` to fail builds that exceed the budget.

**Step 6: Run the desktop dependency test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_dependency_profile.py -q
```

Expected: `PASS`

**Step 7: Commit**

```bash
git add desktop/bundle-budget.json desktop/scripts/check-bundle-size.mjs backend/packaging/pyinstaller/nion-backend.spec backend/tests/test_desktop_dependency_profile.py backend/pyproject.toml backend/packages/harness/pyproject.toml
git commit -F - <<'EOF'
Create the desktop bundle profile and enforce package-size budgets

Constraint: Desktop release must stay reasonably small without dropping user-visible capabilities
Rejected: Preserve every backend deployment dependency in the desktop bundle | bloats installers without helping users
Confidence: medium
Scope-risk: moderate
Directive: Remove only deployment-only payloads; do not cut channels, remote tools, or cloud providers from the desktop profile
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_dependency_profile.py -q
Not-tested: Final packaged artifact sizes on native macOS and Windows
EOF
```

---

## Task 10: Add the Canonical electron-builder Release Lane With GitHub Release and Generic CDN Update Support

**Files:**
- Create: `desktop/electron-builder.yml`
- Create: `desktop/src/main/update-feed.ts`
- Modify: `desktop/src/main/updater.ts`
- Create: `desktop/tests/updater-config.test.mjs`
- Create: `scripts/publish-desktop-release.mjs`

**Step 1: Write the failing updater-config test**

Create `desktop/tests/updater-config.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "yaml";

test("electron-builder publish config supports github and generic providers", () => {
  const config = yaml.parse(fs.readFileSync(new URL("../electron-builder.yml", import.meta.url), "utf8"));
  assert.equal(config.publish[0].provider, "github");
  assert.equal(config.publish[1].provider, "generic");
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test -- updater-config.test.mjs
```

Expected: `FAIL`

**Step 3: Add the builder config**

Create `desktop/electron-builder.yml` with:

- mac targets: `dmg`, `zip`
- windows targets: `nsis`, `zip`
- `extraResources` for the Python helper
- publish providers:
  - GitHub
  - generic (`url` from env/config)

**Step 4: Implement updater selection**

Update `updater.ts` so the app:

- uses GitHub Releases by default
- switches to generic provider when `NION_UPDATE_BASE_URL` is set
- surfaces update status into IPC

**Step 5: Add release publish script**

Create `scripts/publish-desktop-release.mjs` to:

- upload artifacts to GitHub Releases
- optionally mirror metadata/artifacts to generic CDN when credentials are configured

**Step 6: Run the updater-config test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test -- updater-config.test.mjs
```

Expected: `PASS`

**Step 7: Commit**

```bash
git add desktop/electron-builder.yml desktop/src/main/update-feed.ts desktop/src/main/updater.ts desktop/tests/updater-config.test.mjs scripts/publish-desktop-release.mjs
git commit -F - <<'EOF'
Add the canonical electron-builder release and auto-update lane

Constraint: Desktop auto-update must work with GitHub Releases first and generic CDN second without shipping two app variants
Rejected: Hard-code a single update backend | makes release operations brittle and inflexible
Confidence: high
Scope-risk: moderate
Directive: Keep GitHub as the default provider and treat generic CDN as a publish-time override, not a forked product path
Tested: pnpm test -- updater-config.test.mjs
Not-tested: Live signed update flow on macOS and Windows
EOF
```

---

## Task 11: Add the Secondary electron-forge Packaging Lane and Make-Driven Native Packaging Commands

**Files:**
- Create: `desktop/forge.config.ts`
- Create: `scripts/package-desktop.sh`
- Create: `scripts/build-python-helper.sh`
- Modify: `Makefile`
- Create: `desktop/tests/make-packaging-contract.test.mjs`

**Step 1: Write the failing packaging-contract test**

Create `desktop/tests/make-packaging-contract.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("root makefile exposes builder and forge packaging commands", () => {
  const makefile = fs.readFileSync(new URL("../../Makefile", import.meta.url), "utf8");
  assert.match(makefile, /package-desktop-builder/);
  assert.match(makefile, /package-desktop-forge/);
  assert.match(makefile, /desktop-install/);
});
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test -- make-packaging-contract.test.mjs
```

Expected: `FAIL`

**Step 3: Add the secondary packager**

Create `desktop/forge.config.ts` for:

- macOS archive packaging
- Windows squirrel/zip or maker zip for smoke builds
- local verification lane only

This lane is not the canonical updater lane; it exists to satisfy the two-packager requirement and provide a fallback build path.

**Step 4: Add packaging scripts**

Create:

- `scripts/build-python-helper.sh`
- `scripts/package-desktop.sh`

The shell script must:

- detect platform
- build the Python helper first
- build renderer assets
- invoke either `electron-builder` or `electron-forge`

**Step 5: Make the root Makefile desktop-first**

Replace root user-facing targets with:

- `make desktop-install`
- `make desktop-dev`
- `make package-desktop-builder`
- `make package-desktop-forge`
- `make package-desktop`

Keep legacy backend-only commands only if still needed internally, but remove browser/web wording from help text.

**Step 6: Run the packaging-contract test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test -- make-packaging-contract.test.mjs
```

Expected: `PASS`

**Step 7: Commit**

```bash
git add desktop/forge.config.ts scripts/build-python-helper.sh scripts/package-desktop.sh Makefile desktop/tests/make-packaging-contract.test.mjs
git commit -F - <<'EOF'
Add the secondary packaging lane and desktop-first Make commands

Constraint: Packaging must be callable by make from native macOS and Windows developer hosts
Rejected: Hide packaging behind package-manager-only commands | weakens release ergonomics and CI symmetry
Confidence: high
Scope-risk: moderate
Directive: Keep electron-builder as the canonical signed-release path and electron-forge as the secondary verification path
Tested: pnpm test -- make-packaging-contract.test.mjs
Not-tested: Native forge packaging on macOS and Windows
EOF
```

---

## Task 12: Add Desktop Release CI, Signing/Publishing Hooks, and Final Documentation

**Files:**
- Create: `.github/workflows/desktop-release.yml`
- Create: `.github/workflows/desktop-smoke.yml`
- Create: `docs/desktop/release.md`
- Create: `docs/desktop/development.md`
- Modify: `README.md`
- Modify: `frontend/README.md`
- Modify: `backend/README.md`
- Modify: `SECURITY.md`

**Step 1: Write the failing CI contract test**

Create `backend/tests/test_desktop_release_workflow_contract.py`:

```python
from pathlib import Path


def test_desktop_release_workflow_exists() -> None:
    text = Path("../.github/workflows/desktop-release.yml").read_text(encoding="utf-8")
    assert "macos-latest" in text
    assert "windows-latest" in text
    assert "GitHub Releases" in text or "release" in text
```

**Step 2: Run the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_release_workflow_contract.py -q
```

Expected: `FAIL`

**Step 3: Add the release workflow**

Create `.github/workflows/desktop-release.yml` with:

- matrix: `macos-latest`, `windows-latest`
- install backend + frontend + desktop dependencies
- build Python helper
- package with `electron-builder`
- upload GitHub Release assets
- optionally sync to generic CDN when secrets are present

Create `.github/workflows/desktop-smoke.yml` with:

- PR smoke packaging
- `electron-forge` verification lane
- bundle budget check

**Step 4: Write docs**

Create:

- `docs/desktop/development.md`
- `docs/desktop/release.md`

Update root docs so the application is described as desktop-first.

**Step 5: Remove web-start framing from public docs**

Update `README.md`, `frontend/README.md`, and `backend/README.md` so:

- root startup story is Electron desktop
- local web/browser startup is no longer the recommended product path
- legacy server/browser instructions are moved to an appendix or internal note if still needed

**Step 6: Run the workflow contract test and verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_release_workflow_contract.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test
```

Expected: all `PASS`

**Step 7: Commit**

```bash
git add .github/workflows/desktop-release.yml .github/workflows/desktop-smoke.yml docs/desktop/development.md docs/desktop/release.md README.md frontend/README.md backend/README.md SECURITY.md backend/tests/test_desktop_release_workflow_contract.py
git commit -F - <<'EOF'
Add desktop release automation and rewrite the project docs around the desktop product

Constraint: The shipped product must present as desktop-only even though internal developer-only surfaces may still exist
Rejected: Keep public docs centered on browser startup | conflicts with the product boundary and confuses release operations
Confidence: high
Scope-risk: moderate
Directive: Treat GitHub Actions release output and the public README as part of the shipped desktop product
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_release_workflow_contract.py -q; cd frontend && pnpm check; cd ../desktop && pnpm test
Not-tested: Signed notarized releases and live auto-update download/install
EOF
```

---

## Final Verification Pass

After all tasks are complete, run the full verification sequence:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py tests/test_desktop_helper_health.py tests/test_thread_repository.py tests/test_threads_router.py tests/test_channel_manager_embedded.py tests/test_automation_embedded_runner.py tests/test_desktop_dependency_profile.py tests/test_desktop_release_workflow_contract.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
pnpm build

cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm test
pnpm build

cd /Users/zhangtiancheng/Documents/项目/agent/nion
make package-desktop-builder
```

Expected:

- backend tests `PASS`
- frontend `check` and `build` `PASS`
- desktop tests and build `PASS`
- `make package-desktop-builder` produces a native artifact on the current platform
- bundle budget check passes

## Completion Criteria

- The shipped product starts from Electron only; no public web/browser startup path remains in user-facing docs
- The renderer no longer depends on `@langchain/langgraph-sdk`
- The Python helper owns local runtime APIs, thread streaming, and system health
- Channels and automation work against embedded runtime mode
- Package sizes stay within budget after removing deployment-only payloads
- `electron-builder` is the canonical signed/update lane
- `electron-forge` is available as the second packaging lane
- GitHub Releases publishing works, with generic CDN mirroring optional
- `make` is the root entrypoint for install, dev, and package flows
