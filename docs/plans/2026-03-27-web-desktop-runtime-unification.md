# Web/Desktop Runtime Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Nion shippable as both a deployable web app and a packaged desktop app, with one shared first-party backend contract and consistent feature behavior across both surfaces.

**Architecture:** Keep two surface wrappers, not two products. Introduce one canonical backend app factory that composes shared API routers for both web and desktop, then layer only the desktop-only daemon/control-plane routes on top when running in desktop mode. On the frontend, make `/api/*` the only first-party contract, let web dev proxy those routes without nginx, and let desktop dev load a Vite renderer URL in development so renderer changes hot-update without rebuilds.

**Tech Stack:** FastAPI, Uvicorn, Next.js 16, React 19, Electron 35, Vite 7, pnpm, pytest, node:test

---

## Ground Rules

- Do not add new dependencies.
- Do not reintroduce browser-only and desktop-only feature forks in the data layer.
- Prefer wrapper-thinning over large rewrites.
- First-party UI must not depend on `/api/langgraph/*` for core chat flows.
- Keep `gateway` and `daemon` entrypoints alive as compatibility wrappers, but make them delegate to shared composition code.
- Every task ends with a focused commit.

## Definition of Done

- `http://localhost:3000` works for first-party web development without nginx.
- `http://localhost:2026` still works as the compatibility full-stack entrypoint.
- Desktop and web both read and write chat threads through the same `/api/threads/*` contract.
- Desktop renderer changes are visible immediately in dev without rebuilding `renderer-dist`.
- Desktop packaged/prod mode still loads static assets through `nion://app`.
- Backend app composition is shared, with only desktop-only routes/lifespan logic isolated.
- README and desktop docs no longer claim “desktop-only product surface”.

## Verification Matrix

- Backend unit tests:
  - `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_app_factory.py -q`
  - `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_threads_router.py -q`
- Frontend contract tests:
  - `node --test frontend/tests/next-config.contract.test.mjs`
  - `node --test frontend/tests/runtime-api-contract.test.mjs`
  - `node --test frontend/tests/makefile-surface.contract.test.mjs`
  - `node --test frontend/tests/product-docs.contract.test.mjs`
- Desktop contract tests:
  - `cd desktop && node --test tests/dev-renderer.contract.test.mjs`
- Static checks:
  - `cd frontend && pnpm lint && pnpm typecheck`
  - `cd desktop && pnpm test`
- Manual smoke:
  - `make web-dev`
  - `make dev`
  - `make desktop-dev`

## Task 1: Create A Canonical Backend App Factory

**Files:**
- Create: `backend/app/runtime/__init__.py`
- Create: `backend/app/runtime/app_factory.py`
- Test: `backend/tests/test_runtime_app_factory.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/daemon/app.py`

**Step 1: Write the failing backend composition test**

```python
from fastapi.testclient import TestClient

from app.runtime.app_factory import create_runtime_app


def test_web_mode_exposes_shared_routes_without_daemon_runtime() -> None:
    app = create_runtime_app(mode="web")
    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.post("/api/threads/search", json={"limit": 1}).status_code == 200
    assert client.get("/api/daemon/runtime-info").status_code == 404


def test_desktop_mode_exposes_shared_routes_and_daemon_runtime() -> None:
    app = create_runtime_app(mode="desktop")
    client = TestClient(app)

    assert client.get("/health").status_code == 200
    assert client.post("/api/threads/search", json={"limit": 1}).status_code == 200
    assert client.get("/api/daemon/runtime-info").status_code == 200
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_app_factory.py -q
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.runtime'`.

**Step 3: Write the minimal shared app factory**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.daemon.routers import clients, control, diagnostics, incidents, logs, runtime
from app.gateway.config import get_gateway_config
from app.gateway.routers import (
    agents,
    artifacts,
    automation,
    cli,
    config,
    files,
    mcp,
    memory,
    model_admin,
    models,
    notebook,
    recall,
    runtime_profile,
    skills,
    suggestions,
    threads,
    tool_policy,
    uploads,
)


def create_runtime_app(*, mode: str, lifespan=None, shutdown_callback=None) -> FastAPI:
    app = FastAPI(title="Nion Runtime", lifespan=lifespan)
    app.state.daemon_shutdown_callback = shutdown_callback

    gateway_config = get_gateway_config()
    allowed_origins = list(dict.fromkeys([*gateway_config.cors_origins, "nion://app"]))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in [
        models.router,
        model_admin.router,
        config.router,
        runtime_profile.router,
        files.router,
        cli.router,
        mcp.router,
        memory.router,
        notebook.router,
        recall.router,
        automation.router,
        tool_policy.router,
        skills.router,
        artifacts.router,
        uploads.router,
        agents.router,
        suggestions.router,
        threads.router,
    ]:
        app.include_router(router)

    if mode == "desktop":
        for router in [
            runtime.router,
            clients.router,
            control.router,
            logs.router,
            diagnostics.router,
            incidents.router,
        ]:
            app.include_router(router)

    @app.get("/health", tags=["health"])
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "service": f"nion-{mode}"}

    return app
```

**Step 4: Thin the two wrappers to delegate to the factory**

```python
# backend/app/gateway/app.py
from app.runtime.app_factory import create_runtime_app


def create_app() -> FastAPI:
    return create_runtime_app(mode="web", lifespan=lifespan)
```

```python
# backend/app/daemon/app.py
from app.runtime.app_factory import create_runtime_app


def create_app(*, shutdown_callback=None) -> FastAPI:
    return create_runtime_app(
        mode="desktop",
        lifespan=lifespan,
        shutdown_callback=shutdown_callback,
    )
```

**Step 5: Run tests to verify they pass**

Run:

```bash
cd backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_app_factory.py tests/test_threads_router.py -q
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/app/runtime/__init__.py \
  backend/app/runtime/app_factory.py \
  backend/app/gateway/app.py \
  backend/app/daemon/app.py \
  backend/tests/test_runtime_app_factory.py
git commit -m "unify backend app composition across web and desktop"
```

### Task 2: Isolate Desktop-Only Lifespan And Keep Shared HTTP Surface Stable

**Files:**
- Modify: `backend/app/daemon/app.py`
- Modify: `backend/app/daemon/service.py`
- Test: `backend/tests/test_runtime_app_factory.py`
- Test: `backend/tests/test_threads_router.py`

**Step 1: Add the failing regression test for desktop-only daemon state**

```python
def test_web_mode_does_not_require_daemon_service_state() -> None:
    app = create_runtime_app(mode="web")
    client = TestClient(app)

    response = client.post("/api/threads/search", json={"limit": 1})

    assert response.status_code == 200
```

**Step 2: Run test to verify the current wrapper coupling fails or is unguarded**

Run:

```bash
cd backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_app_factory.py -q
```

Expected: FAIL or expose coupling between shared routers and `app.state.daemon_service`.

**Step 3: Make telemetry/event helpers resilient to missing daemon state**

```python
daemon_service = getattr(getattr(request, "app", None), "state", None)
daemon_service = getattr(daemon_service, "daemon_service", None)

if daemon_service is not None and hasattr(daemon_service, "record_thread_event"):
    ...
else:
    store = TelemetryStore(get_paths().telemetry_db_file)
    store.record_event(...)
```

**Step 4: Keep desktop-only lifecycle initialization inside daemon lifespan**

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    service = LocalDaemonService.from_app_config()
    app.state.daemon_service = service
    ...
```

Do not move this into the shared factory.

**Step 5: Re-run regression tests**

Run:

```bash
cd backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_app_factory.py tests/test_threads_router.py -q
```

Expected: PASS.

**Step 6: Commit**

```bash
git add backend/app/daemon/app.py \
  backend/app/daemon/service.py \
  backend/tests/test_runtime_app_factory.py \
  backend/tests/test_threads_router.py
git commit -m "keep daemon lifecycle desktop-only while sharing API surface"
```

### Task 3: Make Web Dev Work Without Nginx And Stop Forcing Static Export

**Files:**
- Modify: `frontend/next.config.js`
- Create: `frontend/tests/next-config.contract.test.mjs`
- Modify: `frontend/README.md`
- Modify: `README.md`

**Step 1: Write the failing Next config contract test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.js";

test("frontend dev rewrites proxy app APIs without nginx", async () => {
  const rewrites = await nextConfig.rewrites();

  assert.deepEqual(rewrites, [
    {
      source: "/api/langgraph/:path*",
      destination: "http://127.0.0.1:2024/:path*",
    },
    {
      source: "/api/:path*",
      destination: "http://127.0.0.1:8001/api/:path*",
    },
  ]);
});

test("frontend config no longer hard-forces static export", () => {
  assert.notEqual(nextConfig.output, "export");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/tests/next-config.contract.test.mjs
```

Expected: FAIL because `rewrites` is undefined and `output === "export"`.

**Step 3: Add rewrites and gate export behind an explicit env flag**

```javascript
const isStaticExport = process.env.NION_STATIC_EXPORT === "1";

const config = {
  devIndicators: false,
  ...(isStaticExport ? { output: "export" } : {}),
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: "/api/langgraph/:path*",
        destination: "http://127.0.0.1:2024/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
    ];
  },
};
```

**Step 4: Re-run the contract test**

Run:

```bash
node --test frontend/tests/next-config.contract.test.mjs
```

Expected: PASS.

**Step 5: Run frontend static checks**

Run:

```bash
cd frontend && pnpm lint && pnpm typecheck
```

Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/next.config.js \
  frontend/tests/next-config.contract.test.mjs \
  frontend/README.md \
  README.md
git commit -m "make web dev self-sufficient without nginx"
```

### Task 4: Replace Desktop-Specific Frontend Naming With Runtime-Aware API Client

**Files:**
- Create: `frontend/src/core/api/thread-client.ts`
- Modify: `frontend/src/core/api/api-client.ts`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Create: `frontend/tests/runtime-api-contract.test.mjs`

**Step 1: Write the failing runtime API contract test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("api client reads from runtime-aware thread client entrypoint", () => {
  const source = fs.readFileSync(
    new URL("../src/core/api/api-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /from \"\\.\\/thread-client\"/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/tests/runtime-api-contract.test.mjs
```

Expected: FAIL because `api-client.ts` still imports `./desktop-client`.

**Step 3: Add a runtime-aware entrypoint and keep the old filename as a thin shim**

```typescript
// frontend/src/core/api/thread-client.ts
export {
  createDesktopThreadClient as createThreadClient,
  type DesktopThreadClient as ThreadClient,
} from "./desktop-client";
```

```typescript
// frontend/src/core/api/api-client.ts
import { createThreadClient, type ThreadClient } from "./thread-client";

let _singleton: ThreadClient | null = null;

export function getAPIClient(isMock?: boolean): ThreadClient {
  ...
}
```

Do not rename `desktop-client.ts` in this task; preserve compatibility and keep the diff small.

**Step 4: Update the highest-level thread consumer to use the runtime-aware type import**

```typescript
import type { ThreadClientSearchParams } from "../api/thread-client";
```

Use this step to remove the most misleading “desktop-only” type imports in active chat flows.

**Step 5: Re-run the contract test and static checks**

Run:

```bash
node --test frontend/tests/runtime-api-contract.test.mjs
cd frontend && pnpm lint && pnpm typecheck
```

Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/src/core/api/thread-client.ts \
  frontend/src/core/api/api-client.ts \
  frontend/src/core/threads/hooks.ts \
  frontend/src/core/api/desktop-client.ts \
  frontend/tests/runtime-api-contract.test.mjs
git commit -m "introduce runtime-aware frontend thread client entrypoint"
```

### Task 5: Give Desktop Renderer Real Hot Updates In Development

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/vite.config.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/window.ts`
- Modify: `desktop/index.html`
- Create: `desktop/tests/dev-renderer.contract.test.mjs`
- Create: `scripts/desktop-dev.sh`
- Modify: `Makefile`

**Step 1: Write the failing desktop dev contract test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main can load a dev renderer URL", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /NION_DESKTOP_RENDERER_URL/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd desktop && node --test tests/dev-renderer.contract.test.mjs
```

Expected: FAIL because dev URL support does not exist yet.

**Step 3: Add explicit dev scripts without new dependencies**

```json
{
  "scripts": {
    "dev:renderer": "vite --host 127.0.0.1 --port 5173",
    "dev:main": "tsc -p tsconfig.json --watch",
    "dev:electron": "electron dist/main/index.js",
    "dev": "node dist/main/index.js"
  }
}
```

```bash
#!/usr/bin/env bash
set -euo pipefail

pnpm --dir desktop dev:main &
MAIN_PID=$!
pnpm --dir desktop dev:renderer &
RENDERER_PID=$!

cleanup() {
  kill "$MAIN_PID" "$RENDERER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

./scripts/wait-for-port.sh 5173 60 "Desktop renderer"
NION_DESKTOP_RENDERER_URL=http://127.0.0.1:5173 \
  pnpm --dir desktop exec electron dist/main/index.js
```

**Step 4: Teach Electron to prefer a dev renderer URL in development**

```typescript
const rendererUrl =
  process.env.NION_DESKTOP_RENDERER_URL?.trim() || "nion://app/index.html";

mainWindow = await createMainWindow({
  preloadPath,
  rendererUrl,
});
```

Keep `nion://app/index.html` as the packaged/default path.

**Step 5: Make Vite dev usable for Electron**

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "renderer-dist",
    emptyOutDir: true,
  },
});
```

Update `desktop/index.html` CSP `connect-src` and `script-src` for dev only if needed via injected meta logic or conditional header handling in Vite. Do not loosen packaged CSP globally.

**Step 6: Re-run desktop contract tests**

Run:

```bash
cd desktop && node --test tests/dev-renderer.contract.test.mjs tests/bridge-main-contract.test.mjs
```

Expected: PASS.

**Step 7: Manual smoke**

Run:

```bash
make desktop-dev
```

Expected: Electron opens from `http://127.0.0.1:5173`, and editing `frontend/src/app/workspace/chats/page.tsx` updates the renderer without rebuilding `renderer-dist`.

**Step 8: Commit**

```bash
git add desktop/package.json \
  desktop/vite.config.ts \
  desktop/src/main/index.ts \
  desktop/src/main/window.ts \
  desktop/index.html \
  desktop/tests/dev-renderer.contract.test.mjs \
  scripts/desktop-dev.sh \
  Makefile
git commit -m "enable desktop renderer hot updates in dev"
```

### Task 6: Add Explicit Web Surface Commands And Keep Legacy `make dev` As Compatibility

**Files:**
- Modify: `Makefile`
- Create: `scripts/web-dev.sh`
- Create: `scripts/web-start.sh`
- Modify: `scripts/serve.sh`
- Create: `frontend/tests/makefile-surface.contract.test.mjs`

**Step 1: Write the failing Makefile/help contract test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("make help documents explicit web and desktop surface commands", () => {
  const source = fs.readFileSync(new URL("../../Makefile", import.meta.url), "utf8");

  assert.match(source, /web-dev/);
  assert.match(source, /web-start/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/tests/makefile-surface.contract.test.mjs
```

Expected: FAIL because `web-dev` and `web-start` are not present yet.

**Step 3: Split web orchestration into explicit scripts**

```bash
# scripts/web-dev.sh
./scripts/serve.sh --dev

# scripts/web-start.sh
./scripts/serve.sh --prod
```

```make
web-dev:
	@./scripts/web-dev.sh

web-start:
	@./scripts/web-start.sh

dev: web-dev
start: web-start
```

Do not remove `make dev`; keep it as the compatibility alias.

**Step 4: Re-run contract test**

Run:

```bash
node --test frontend/tests/makefile-surface.contract.test.mjs
make help
```

Expected: PASS, and help output lists the explicit commands.

**Step 5: Commit**

```bash
git add Makefile \
  scripts/web-dev.sh \
  scripts/web-start.sh \
  scripts/serve.sh \
  frontend/tests/makefile-surface.contract.test.mjs
git commit -m "name web and desktop dev surfaces explicitly"
```

### Task 7: Rewrite Product And Developer Docs Around “One Core Backend, Two Shells”

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `docs/desktop/development.md`
- Modify: `docs/desktop/desktop-product-contract.md`
- Modify: `docs/plans/2026-03-27-web-desktop-runtime-unification.md`
- Create: `frontend/tests/product-docs.contract.test.mjs`

**Step 1: Add the failing docs contract test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop contract no longer claims browser deployment is removed forever", () => {
  const source = fs.readFileSync(
    new URL("../../docs/desktop/desktop-product-contract.md", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /desktop-only product/i);
  assert.match(source, /two shells/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/tests/product-docs.contract.test.mjs
```

Expected: FAIL because the docs still declare a desktop-only product contract.

**Step 3: Rewrite the docs around the new product contract**

Use language like:

```md
Nion ships as two first-party surfaces:

- Web: deployed server + browser client
- Desktop: packaged Electron shell + local daemon

Both surfaces must share:

- the same `/api/*` first-party contract
- the same thread/config/notebook/artifact semantics
- the same user-visible feature behavior unless explicitly documented otherwise
```

Also document:

- `make web-dev`
- `make dev` as compatibility alias
- `make desktop-dev`
- web dev does not require nginx
- desktop packaged mode still uses `nion://app`

**Step 4: Re-run docs contract test**

Run:

```bash
node --test frontend/tests/product-docs.contract.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md \
  backend/README.md \
  docs/desktop/development.md \
  docs/desktop/desktop-product-contract.md \
  docs/plans/2026-03-27-web-desktop-runtime-unification.md \
  frontend/tests/product-docs.contract.test.mjs
git commit -m "document the unified multi-surface product contract"
```

### Task 8: Run The Full Smoke Matrix Before Declaring Victory

**Files:**
- Modify: `README.md`
- Modify: `docs/desktop/development.md`
- Modify: `backend/README.md`

**Step 1: Write the smoke checklist into docs before running it**

```md
## Multi-Surface Smoke Checklist

1. `make web-dev`
2. Open `http://127.0.0.1:3000/workspace/chats`
3. Verify recent chats are visible
4. `make dev`
5. Open `http://127.0.0.1:2026/workspace/chats`
6. Verify recent chats are visible
7. `make desktop-dev`
8. Edit a renderer file and verify HMR updates the desktop window
```

**Step 2: Run backend tests**

Run:

```bash
cd backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_app_factory.py tests/test_threads_router.py -q
```

Expected: PASS.

**Step 3: Run frontend and desktop contract tests**

Run:

```bash
node --test frontend/tests/next-config.contract.test.mjs \
  frontend/tests/runtime-api-contract.test.mjs \
  frontend/tests/makefile-surface.contract.test.mjs \
  frontend/tests/product-docs.contract.test.mjs
cd desktop && node --test tests/dev-renderer.contract.test.mjs tests/bridge-main-contract.test.mjs
```

Expected: PASS.

**Step 4: Run frontend static checks**

Run:

```bash
cd frontend && pnpm lint && pnpm typecheck
```

Expected: PASS.

**Step 5: Run surface smoke tests**

Run:

```bash
make web-dev
make dev
make desktop-dev
```

Expected:

- `3000` works without nginx
- `2026` still works through the compatibility stack
- desktop loads its dev renderer from Vite and updates on renderer edits

**Step 6: Final commit**

```bash
git add README.md docs/desktop/development.md backend/README.md
git commit -m "verify unified web and desktop runtime workflow"
```

## Notes For The Implementer

- Do not try to replace LangGraph server topology in the same PR. This plan only removes first-party dependence on it and isolates it to the web compatibility lane.
- If a task starts touching more than the files listed, stop and split the task before continuing.
- Keep `desktop-client.ts` as a shim during this plan. Full rename/deletion can be a follow-up once imports are migrated.
- If desktop CSP changes become messy, prefer a dev-only branch in `window.ts` or protocol handling over weakening packaged defaults.
- If `make desktop-dev` needs electron restart for main/preload changes, accept that. The user requirement is renderer hot update, not full-process hot swap.
