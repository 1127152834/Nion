# Electron Desktop Light Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Electron from "shell + auto-started local backend helper" to a thin desktop shell that only loads the UI and connects to an already running Nion service.

**Architecture:** Keep the web product unchanged. In the desktop lane, replace the current `backend-supervisor` startup path with a required remote runtime config resolved in Electron main, expose that config through preload, and let the renderer reuse the existing backend/LangGraph HTTP surfaces against that remote service. After the runtime flip, delete helper-only packaging and wrapper surfaces so the repo no longer claims or ships an embedded Python backend for Electron.

**Tech Stack:** Electron, TypeScript, Vite, React, node:test, FastAPI, pnpm, uv

---

## Pre-Read

Read these before changing code:

- Existing Electron startup path:
  - `desktop/src/main/index.ts`
  - `desktop/src/main/config.ts`
  - `desktop/src/main/backend-supervisor.ts`
  - `desktop/src/preload/index.ts`
  - `desktop/src/shared/ipc.ts`
- Renderer/runtime URL consumers:
  - `frontend/src/core/config/index.ts`
  - `frontend/src/core/api/desktop-client.ts`
  - `frontend/src/typings/desktop-runtime.d.ts`
- Desktop packaging and docs:
  - `desktop/package.json`
  - `desktop/electron-builder.yml`
  - `desktop/forge.config.ts`
  - `desktop/scripts/check-bundle-size.mjs`
  - `scripts/package-desktop.sh`
  - `Makefile`
  - `README.md`
  - `docs/desktop/desktop-product-contract.md`
  - `docs/desktop/development.md`
  - `docs/desktop/release.md`
- Helper-only backend surfaces slated for removal:
  - `backend/app/desktop_helper.py`
  - `backend/app/gateway/routers/desktop_system.py`
  - `backend/app/gateway/app.py`
  - `backend/app/gateway/routers/__init__.py`
  - `backend/packaging/pyinstaller/nion-backend.spec`

Relevant execution skills:

- `@superpowers:executing-plans`
- `@superpowers:verification-before-completion`
- `@superpowers:requesting-code-review`

Constraints to preserve throughout implementation:

- Web behavior stays unchanged.
- Electron must not spawn `uv run python -m app.desktop_helper`, `nion-backend`, or any local gateway/langgraph helper process.
- Desktop light mode must require an explicit remote backend URL and must derive a LangGraph URL deterministically.
- Keep `nion://app` CORS compatibility in the backend because Electron still talks to the remote service from that origin.
- No new dependencies.
- Prefer deletion over addition.
- Do not rewrite historical plan docs such as `docs/plans/2026-03-25-electron-desktop-embedded-python-helper.md`; update product docs instead.

## Task 1: Freeze the Desktop Light-Mode Product Contract

**Files:**
- Create: dedicated worktree only
- Modify: `backend/tests/test_desktop_product_contract.py`
- Modify: `docs/desktop/desktop-product-contract.md`

**Step 1: Create the dedicated worktree from the current HEAD**

Run:

```bash
git worktree add ~/.config/superpowers/worktrees/nion/electron-desktop-light-mode -b codex/electron-desktop-light-mode HEAD
```

Expected: a clean worktree exists at `~/.config/superpowers/worktrees/nion/electron-desktop-light-mode`

**Step 2: Write the failing contract test**

Modify `backend/tests/test_desktop_product_contract.py` to:

```python
from pathlib import Path


def test_desktop_contract_declares_light_mode_runtime() -> None:
    contract = (
        Path(__file__).resolve().parents[2] / "docs" / "desktop" / "desktop-product-contract.md"
    ).read_text(encoding="utf-8")
    assert "thin desktop shell" in contract
    assert "existing Nion service" in contract
    assert "must not bundle a Python helper" in contract
    assert "NION_DESKTOP_BACKEND_URL" in contract
    assert "nion://app" in contract
```

**Step 3: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
```

Expected: `FAIL` because the current contract still describes a bundled Python helper runtime

**Step 4: Rewrite the desktop product contract for light mode**

Modify `docs/desktop/desktop-product-contract.md` so it states:

- runtime = Electron thin shell only
- desktop connects to an existing Nion service
- required env/config key = `NION_DESKTOP_BACKEND_URL`
- optional override key = `NION_DESKTOP_LANGGRAPH_BASE_URL`
- Electron must not bundle or auto-start a Python helper
- `nion://app` remains an allowed origin for the remote backend
- bundle budgets no longer include a Python helper payload

Use wording like:

```md
## Runtime

Nion Desktop is a thin desktop shell. The shipped application loads the renderer and connects to an existing Nion service over HTTP/SSE. Electron must not bundle a Python helper or auto-start a local gateway/langgraph chain.
```

**Step 5: Run the test again**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/tests/test_desktop_product_contract.py docs/desktop/desktop-product-contract.md
git commit -F - <<'EOF'
Freeze Electron light mode as the desktop product contract

Constraint: The target product is a thin desktop shell that must not auto-start a redundant local backend
Rejected: Keep the bundled-helper contract and only change code | the repo would keep shipping the wrong product story
Confidence: high
Scope-risk: narrow
Directive: Do not reintroduce a local helper into Electron without a new contract change and explicit product approval
Tested: UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
Not-tested: Desktop runtime launch against a real remote service
EOF
```

---

## Task 2: Replace Electron Supervisor Startup With Required Remote Runtime Config

**Files:**
- Modify: `desktop/src/main/config.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/updater.ts`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/preload/index.ts`
- Delete: `desktop/src/main/backend-supervisor.ts`
- Delete: `desktop/tests/supervisor.test.mjs`
- Test: `desktop/tests/runtime-config.test.mjs`

**Step 1: Write the failing runtime-config test**

Create `desktop/tests/runtime-config.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";

import { resolveDesktopRuntimeConfig } from "../dist/main/config.js";

test("desktop runtime config resolves remote URLs from env", () => {
  const runtime = resolveDesktopRuntimeConfig({
    env: {
      NION_DESKTOP_BACKEND_URL: "https://api.example.com/",
    },
  });

  assert.deepEqual(runtime, {
    mode: "remote",
    helperEnabled: false,
    baseUrl: "https://api.example.com",
    langGraphBaseUrl: "https://api.example.com/api/langgraph",
  });
});

test("desktop runtime config rejects missing backend url", () => {
  assert.throws(
    () => resolveDesktopRuntimeConfig({ env: {} }),
    /NION_DESKTOP_BACKEND_URL is required/,
  );
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/runtime-config.test.mjs
```

Expected: `FAIL` because `resolveDesktopRuntimeConfig()` does not exist

**Step 3: Implement the remote runtime config and remove supervisor startup**

Modify `desktop/src/main/config.ts` to export:

```ts
export type DesktopRuntimeInfo = {
  mode: "remote";
  helperEnabled: false;
  baseUrl: string;
  langGraphBaseUrl: string;
};

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveDesktopRuntimeConfig(options: {
  env?: NodeJS.ProcessEnv;
} = {}): DesktopRuntimeInfo {
  const env = options.env ?? process.env;
  const baseUrl = normalizeUrl(env.NION_DESKTOP_BACKEND_URL ?? "");
  if (!baseUrl) {
    throw new Error("NION_DESKTOP_BACKEND_URL is required in desktop light mode");
  }

  const langGraphBaseUrl = normalizeUrl(
    env.NION_DESKTOP_LANGGRAPH_BASE_URL ?? `${baseUrl}/api/langgraph`,
  );

  return {
    mode: "remote",
    helperEnabled: false,
    baseUrl,
    langGraphBaseUrl,
  };
}
```

Modify `desktop/src/main/index.ts` so it:

- removes the `createBackendSupervisor()` import and usage
- resolves `const runtimeInfo = resolveDesktopRuntimeConfig()`
- sets:

```ts
process.env.NION_DESKTOP_BACKEND_URL = runtimeInfo.baseUrl;
process.env.NION_DESKTOP_LANGGRAPH_BASE_URL = runtimeInfo.langGraphBaseUrl;
```

- registers updater/runtime IPC with `runtimeInfo`
- does not call `supervisor.start()` or `supervisor.stop()`

Modify `desktop/src/shared/ipc.ts` so `DesktopRuntimeInfo` matches the new remote shape.

Modify `desktop/src/preload/index.ts` so it exposes:

```ts
const backendBaseUrl = process.env.NION_DESKTOP_BACKEND_URL ?? "";
const langGraphBaseUrl = process.env.NION_DESKTOP_LANGGRAPH_BASE_URL ?? "";

contextBridge.exposeInMainWorld("__NION_BACKEND_BASE_URL__", backendBaseUrl);
contextBridge.exposeInMainWorld("__NION_LANGGRAPH_BASE_URL__", langGraphBaseUrl);
```

Delete `desktop/src/main/backend-supervisor.ts` and `desktop/tests/supervisor.test.mjs`.

**Step 4: Run the targeted desktop tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/runtime-config.test.mjs tests/entrypoint.test.mjs
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add desktop/src/main/config.ts desktop/src/main/index.ts desktop/src/main/updater.ts desktop/src/shared/ipc.ts desktop/src/preload/index.ts desktop/tests/runtime-config.test.mjs
git rm desktop/src/main/backend-supervisor.ts desktop/tests/supervisor.test.mjs
git commit -F - <<'EOF'
Stop Electron from auto-starting a local backend

Constraint: Desktop light mode must require a remote service URL and must not spawn a local helper process
Rejected: Keep the supervisor behind a dormant flag | dead startup paths would keep packaging and maintenance complexity alive
Confidence: high
Scope-risk: moderate
Directive: Desktop main should only resolve runtime URLs and load the window; do not reintroduce child-process orchestration here
Tested: cd desktop && pnpm run build:main && node --test tests/runtime-config.test.mjs tests/entrypoint.test.mjs
Not-tested: Packaged Electron app startup on macOS/Windows
EOF
```

---

## Task 3: Teach the Renderer To Resolve Both Backend and LangGraph URLs From Desktop Runtime

**Files:**
- Modify: `frontend/src/core/config/index.ts`
- Modify: `frontend/src/typings/desktop-runtime.d.ts`
- Test: `frontend/src/core/config/index.test.ts`

**Step 1: Write the failing config test**

Create `frontend/src/core/config/index.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";

import { getBackendBaseURL, getLangGraphBaseURL } from "./index.ts";

test("desktop runtime globals override browser-origin fallbacks", () => {
  const originalWindow = globalThis.window;

  globalThis.window = {
    location: { origin: "nion://app" },
    __NION_BACKEND_BASE_URL__: "https://api.example.com",
    __NION_LANGGRAPH_BASE_URL__: "https://api.example.com/api/langgraph",
  } as any;

  try {
    assert.equal(getBackendBaseURL(), "https://api.example.com");
    assert.equal(getLangGraphBaseURL(), "https://api.example.com/api/langgraph");
  } finally {
    globalThis.window = originalWindow as any;
  }
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/config/index.test.ts
```

Expected: `FAIL` because `getLangGraphBaseURL()` does not read `window.__NION_LANGGRAPH_BASE_URL__`

**Step 3: Implement desktop runtime URL resolution**

Modify `frontend/src/typings/desktop-runtime.d.ts` to declare:

```typescript
declare global {
  interface Window {
    __NION_BACKEND_BASE_URL__?: string;
    __NION_LANGGRAPH_BASE_URL__?: string;
  }
}
```

Modify `frontend/src/core/config/index.ts` so `getLangGraphBaseURL()` checks the desktop global before falling back to `window.location.origin`:

```ts
export function getLangGraphBaseURL(isMock?: boolean) {
  if (env.NEXT_PUBLIC_LANGGRAPH_BASE_URL) {
    return env.NEXT_PUBLIC_LANGGRAPH_BASE_URL;
  } else if (
    typeof window !== "undefined" &&
    typeof window.__NION_LANGGRAPH_BASE_URL__ === "string" &&
    window.__NION_LANGGRAPH_BASE_URL__.length > 0
  ) {
    return window.__NION_LANGGRAPH_BASE_URL__;
  } else if (isMock) {
    ...
  } else {
    ...
  }
}
```

Do not change `getBackendBaseURL()` unless needed for lint/type fixes; it already matches the existing preload bridge.

**Step 4: Run the frontend config test and typecheck**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/config/index.test.ts
pnpm typecheck
```

Expected: both commands `PASS`

**Step 5: Commit**

```bash
git add frontend/src/core/config/index.ts frontend/src/core/config/index.test.ts frontend/src/typings/desktop-runtime.d.ts
git commit -F - <<'EOF'
Teach the desktop renderer to use remote LangGraph URLs

Constraint: Electron loads from nion://app, so browser-origin LangGraph fallbacks are invalid in light mode
Rejected: Add a second renderer-only config layer | the existing preload bridge already provides the right runtime seam
Confidence: high
Scope-risk: narrow
Directive: Keep desktop runtime URL resolution centralized in frontend/src/core/config/index.ts instead of duplicating ad-hoc globals
Tested: cd frontend && node --test src/core/config/index.test.ts && pnpm typecheck
Not-tested: Live chat flow against a remote LangGraph service
EOF
```

---

## Task 4: Delete Helper-Only Backend Surfaces

**Files:**
- Delete: `backend/app/desktop_helper.py`
- Delete: `backend/app/gateway/routers/desktop_system.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Delete: `backend/tests/test_desktop_helper_health.py`
- Test: `backend/tests/test_desktop_surface_removed.py`

**Step 1: Write the failing gateway test**

Create `backend/tests/test_desktop_surface_removed.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_gateway_does_not_mount_desktop_helper_routes() -> None:
    client = TestClient(create_app())

    response = client.get("/api/desktop/health")

    assert response.status_code == 404
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_surface_removed.py -q
```

Expected: `FAIL` because `/api/desktop/health` still exists

**Step 3: Remove the helper wrapper surfaces**

Delete:

- `backend/app/desktop_helper.py`
- `backend/app/gateway/routers/desktop_system.py`
- `backend/tests/test_desktop_helper_health.py`

Modify `backend/app/gateway/routers/__init__.py` to remove `desktop_system` from both the import list and `__all__`.

Modify `backend/app/gateway/app.py` to:

- remove `desktop_system` from router imports
- remove the `"desktop-system"` OpenAPI tag block
- delete `app.include_router(desktop_system.router)`

Do not touch the general backend CORS allowance for `nion://app`; that still matters for Electron.

**Step 4: Run the backend cleanup tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_surface_removed.py tests/test_desktop_product_contract.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/gateway/app.py backend/app/gateway/routers/__init__.py backend/tests/test_desktop_surface_removed.py
git rm backend/app/desktop_helper.py backend/app/gateway/routers/desktop_system.py backend/tests/test_desktop_helper_health.py
git commit -F - <<'EOF'
Remove helper-only backend wrapper surfaces

Constraint: Electron light mode no longer owns a local helper process or helper-control HTTP surface
Rejected: Leave /api/desktop/* as dormant compatibility routes | dead routes keep implying a local helper contract that no longer exists
Confidence: medium
Scope-risk: moderate
Directive: Keep Electron runtime metadata in preload/IPC, not in backend helper routes
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_desktop_surface_removed.py tests/test_desktop_product_contract.py -q
Not-tested: Third-party tooling that may have been calling /api/desktop/* directly
EOF
```

---

## Task 5: Remove Helper Packaging, Rewrite Desktop Docs, and Run Final Verification

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/electron-builder.yml`
- Modify: `desktop/forge.config.ts`
- Modify: `desktop/scripts/check-bundle-size.mjs`
- Modify: `desktop/bundle-budget.json`
- Modify: `desktop/tests/workspace-contract.test.mjs`
- Modify: `desktop/tests/make-packaging-contract.test.mjs`
- Modify: `Makefile`
- Modify: `scripts/package-desktop.sh`
- Delete: `scripts/build-python-helper.sh`
- Delete: `backend/packaging/pyinstaller/nion-backend.spec`
- Modify: `README.md`
- Modify: `docs/desktop/development.md`
- Modify: `docs/desktop/release.md`

**Step 1: Write the failing packaging contract tests**

Modify `desktop/tests/workspace-contract.test.mjs` to:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop workspace keeps packaging scripts but no helper build script", () => {
  const pkg = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );

  assert.ok(pkg.scripts["package:builder"]);
  assert.ok(pkg.scripts["package:forge"]);
  assert.equal(pkg.scripts["build:helper"], undefined);
});
```

Modify `desktop/tests/make-packaging-contract.test.mjs` to:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "yaml";

test("desktop packaging does not bundle a local backend helper", () => {
  const makefile = fs.readFileSync(new URL("../../Makefile", import.meta.url), "utf8");
  const builder = yaml.parse(
    fs.readFileSync(new URL("../electron-builder.yml", import.meta.url), "utf8"),
  );
  const forge = fs.readFileSync(new URL("../forge.config.ts", import.meta.url), "utf8");

  assert.doesNotMatch(makefile, /build-python-helper/);
  assert.equal(builder.extraResources, undefined);
  assert.doesNotMatch(forge, /nion-backend/);
});
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/workspace-contract.test.mjs tests/make-packaging-contract.test.mjs tests/updater-config.test.mjs
```

Expected: `FAIL` because the desktop workspace and packaging still reference `build:helper` and `nion-backend`

**Step 3: Remove helper packaging and rewrite desktop docs**

Make these changes:

- `desktop/package.json`
  - remove `"build:helper"`
  - update `"description"` to say thin shell / remote service
- `desktop/electron-builder.yml`
  - delete the `extraResources` block for `../backend/dist/nion-backend`
- `desktop/forge.config.ts`
  - delete `extraResource: ["../backend/dist/nion-backend"]`
- `desktop/scripts/check-bundle-size.mjs`
  - delete the `nion-backend` branch
  - only enforce packaged-app budgets
- `desktop/bundle-budget.json`
  - delete `"python_helper_max_mb"`
- `scripts/package-desktop.sh`
  - stop calling `scripts/build-python-helper.sh`
- `Makefile`
  - remove helper build invocation from `desktop-dev`
  - keep `desktop-install`, `desktop-dev`, `package-desktop-builder`, `package-desktop-forge`
- delete `scripts/build-python-helper.sh`
- delete `backend/packaging/pyinstaller/nion-backend.spec`
- rewrite docs:
  - `README.md`: replace "Electron shell + local Python helper" with "Electron thin shell + existing Nion service"
  - `docs/desktop/development.md`: document `NION_DESKTOP_BACKEND_URL` and optional `NION_DESKTOP_LANGGRAPH_BASE_URL`
  - `docs/desktop/release.md`: remove helper build/spec references and describe packaging as UI-only shell packaging

Use wording like:

```md
export NION_DESKTOP_BACKEND_URL=http://localhost:2026
export NION_DESKTOP_LANGGRAPH_BASE_URL=http://localhost:2026/api/langgraph
make desktop-dev
```

**Step 4: Run the full verification loop**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build
node --test tests/workspace-contract.test.mjs tests/make-packaging-contract.test.mjs tests/runtime-config.test.mjs tests/updater-config.test.mjs tests/entrypoint.test.mjs
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/config/index.test.ts src/core/threads/desktop-client.test.ts
pnpm typecheck
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py tests/test_desktop_surface_removed.py tests/test_desktop_release_workflow_contract.py -q
```

Expected: all commands `PASS`

**Step 5: Run the manual smoke check that proves no local backend chain starts**

In terminal A, start the existing remote service:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
make dev
```

In terminal B, start Electron light mode:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
export NION_DESKTOP_BACKEND_URL=http://localhost:2026
export NION_DESKTOP_LANGGRAPH_BASE_URL=http://localhost:2026/api/langgraph
pnpm --dir desktop dev
```

In terminal C, prove no helper process exists:

```bash
pgrep -fal "app.desktop_helper|nion-backend" || true
lsof -iTCP:43115 -sTCP:LISTEN || true
```

Expected:

- Electron window loads
- remote requests go to `http://localhost:2026`
- `pgrep` prints nothing related to `app.desktop_helper` or `nion-backend`
- `lsof` shows no listener on `127.0.0.1:43115`

**Step 6: Commit**

```bash
git add desktop/package.json desktop/electron-builder.yml desktop/forge.config.ts desktop/scripts/check-bundle-size.mjs desktop/bundle-budget.json desktop/tests/workspace-contract.test.mjs desktop/tests/make-packaging-contract.test.mjs Makefile scripts/package-desktop.sh README.md docs/desktop/development.md docs/desktop/release.md
git rm scripts/build-python-helper.sh backend/packaging/pyinstaller/nion-backend.spec
git commit -F - <<'EOF'
Strip helper packaging and document Electron as a thin shell

Constraint: The desktop deliverable must stay UI-only and must not keep shipping helper build artifacts by inertia
Rejected: Keep helper packaging files around "just in case" | dead packaging paths cause drift, size bloat, and misleading release docs
Confidence: high
Scope-risk: moderate
Directive: Any future desktop packaging change must preserve the guarantee that Electron loads UI only and connects to an already running service
Tested: cd desktop && pnpm run build && node --test tests/workspace-contract.test.mjs tests/make-packaging-contract.test.mjs tests/runtime-config.test.mjs tests/updater-config.test.mjs tests/entrypoint.test.mjs; cd frontend && node --test src/core/config/index.test.ts src/core/threads/desktop-client.test.ts && pnpm typecheck; cd backend && UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py tests/test_desktop_surface_removed.py tests/test_desktop_release_workflow_contract.py -q
Not-tested: Signed installer generation and auto-update flow against GitHub Releases
EOF
```
