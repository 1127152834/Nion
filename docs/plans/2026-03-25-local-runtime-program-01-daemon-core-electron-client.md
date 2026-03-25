# Local Runtime Program 01: Daemon Core and Electron Client Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the local desktop runtime from Electron-owned helper supervision to a single local daemon, while keeping the existing desktop UI working and making `allow_background_running` a daemon-owned setting.

**Architecture:** Reuse the existing local `ThreadService + NionClient` foundation and package it as a standalone daemon process bound to `127.0.0.1`. In this phase, Electron becomes a single-window client that starts the daemon immediately on launch, connects the renderer to the daemon through compatible `/api/*` surfaces, and detaches cleanly on window close. When background running is disabled, the daemon should exit after a short 2–3 second grace period once the Electron client detaches.

**Tech Stack:** FastAPI, `NionClient`, Electron, TypeScript, node:test, pytest, uvicorn, pnpm, uv, PyInstaller

---

## Pre-Read

Read these before changing code:

- Approved design:
  - `docs/superpowers/specs/2026-03-25-local-runtime-program-01-daemon-core-electron-client-design.md`
  - `docs/plans/2026-03-25-local-daemon-electron-cli-design.md`
  - `docs/plans/2026-03-25-local-runtime-program-00-roadmap-index.md`
- Existing Electron startup and helper supervision:
  - `desktop/src/main/index.ts`
  - `desktop/src/main/backend-supervisor.ts`
  - `desktop/src/main/config.ts`
  - `desktop/src/main/window.ts`
  - `desktop/src/preload/index.ts`
  - `desktop/src/shared/ipc.ts`
  - `desktop/tests/supervisor.test.mjs`
  - `desktop/tests/entrypoint.test.mjs`
- Existing local thread/runtime surfaces:
  - `backend/app/gateway/routers/threads.py`
  - `backend/packages/harness/nion/threads/service.py`
  - `backend/packages/harness/nion/client.py`
  - `backend/tests/test_threads_router.py`
  - `backend/tests/test_thread_repository.py`
- Existing Config Center surfaces:
  - `backend/packages/harness/nion/config/app_config.py`
  - `backend/packages/harness/nion/config/config_repository.py`
  - `backend/app/gateway/routers/config.py`
  - `backend/tests/test_gateway_config_api.py`
  - `backend/tests/test_config_repository.py`
- Existing settings shell:
  - `frontend/src/components/workspace/settings/settings-dialog.tsx`
  - `frontend/src/components/workspace/settings/settings-sections.ts`
  - `frontend/src/components/workspace/settings/use-config-editor.ts`
  - `frontend/src/core/i18n/locales/en-US.ts`
  - `frontend/src/core/i18n/locales/zh-CN.ts`
  - `frontend/src/core/i18n/locales/types.ts`
  - `frontend/src/core/i18n/locales/settings-modules.test.ts`
- Existing packaging lane:
  - `backend/packaging/pyinstaller/nion-backend.spec`
  - `scripts/build-python-helper.sh`
  - `desktop/electron-builder.yml`
  - `desktop/forge.config.ts`

Relevant execution skills:

- `@superpowers:executing-plans`
- `@superpowers:verification-before-completion`
- `@superpowers:requesting-code-review`

Constraints to preserve throughout Phase 01:

- Electron remains single-window.
- CLI/TUI is out of scope for this phase.
- The daemon owns runtime state and shutdown policy.
- `allow_background_running` must live in Config Center storage, not frontend local storage.
- Preserve the current renderer API expectations where possible.
- Do not require standalone `langgraph dev` for the local desktop runtime.
- Do not introduce local token authentication in Phase 01.
- Bind the daemon to `127.0.0.1` only.

## Task 1: Create the Worktree and Add a Typed Daemon Config Surface

**Files:**
- Create: dedicated worktree only
- Create: `backend/packages/harness/nion/config/daemon_config.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/packages/harness/nion/config/__init__.py`
- Modify: `backend/app/gateway/routers/config.py`
- Create: `backend/tests/test_daemon_config.py`
- Modify: `backend/tests/test_gateway_config_api.py`

**Step 1: Create the dedicated worktree**

Run:

```bash
git worktree add ~/.config/superpowers/worktrees/nion/local-runtime-program-01 -b codex/local-runtime-program-01 HEAD
```

Expected: a clean worktree exists at `~/.config/superpowers/worktrees/nion/local-runtime-program-01`

**Step 2: Write the failing daemon-config tests**

Create `backend/tests/test_daemon_config.py`:

```python
from nion.config.app_config import AppConfig


def test_app_config_exposes_daemon_settings() -> None:
    config = AppConfig.model_validate(
        {
            "models": [],
            "tools": [],
            "tool_groups": [],
            "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
            "daemon": {"allow_background_running": True},
            "extensions": {"mcpServers": {}, "skills": {}},
        }
    )
    defaulted = AppConfig.model_validate(
        {
            "models": [],
            "tools": [],
            "tool_groups": [],
            "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
            "daemon": {},
            "extensions": {"mcpServers": {}, "skills": {}},
        }
    )

    assert config.daemon.allow_background_running is True
    assert defaulted.daemon.allow_background_running is False
    assert config.daemon.host == "127.0.0.1"
    assert config.daemon.port == 43115
    assert defaulted.daemon.startup_timeout_seconds == 3
```

Modify `backend/tests/test_gateway_config_api.py` to assert:

```python
assert "daemon" in schema_payload["sections"]
assert "daemon" in schema_payload["order"]
```

**Step 3: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_config.py tests/test_gateway_config_api.py -q
```

Expected: `FAIL` because `AppConfig` does not expose a typed `daemon` section and the config schema does not mention it

**Step 4: Add the typed daemon config**

Create `backend/packages/harness/nion/config/daemon_config.py`:

```python
from pydantic import BaseModel, Field


class DaemonConfig(BaseModel):
    allow_background_running: bool = Field(
        default=False,
        description="Keep the local daemon alive after Electron closes.",
    )
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=43115)
    shutdown_grace_period_seconds: int = Field(default=3, ge=1, le=10)
```

Modify `backend/packages/harness/nion/config/app_config.py` to add:

```python
from nion.config.daemon_config import DaemonConfig

class AppConfig(BaseModel):
    ...
    daemon: DaemonConfig = Field(
        default_factory=DaemonConfig,
        description="Local daemon lifecycle and listening configuration",
    )
```

Modify `backend/packages/harness/nion/config/__init__.py` to export `DaemonConfig`.

Modify `backend/app/gateway/routers/config.py` so `_build_schema()` includes:

```python
"daemon": ConfigSectionSchema(
    title="Daemon",
    description="Configure local daemon lifecycle and background behavior.",
)
```

Add `"daemon"` to the schema `order`.

**Step 5: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_config.py tests/test_gateway_config_api.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/packages/harness/nion/config/daemon_config.py backend/packages/harness/nion/config/app_config.py backend/packages/harness/nion/config/__init__.py backend/app/gateway/routers/config.py backend/tests/test_daemon_config.py backend/tests/test_gateway_config_api.py
git commit -F - <<'EOF'
Add a typed daemon config surface for the local runtime

Constraint: Background-running policy must be daemon-owned and persisted in Config Center storage
Rejected: Store allow_background_running in frontend localStorage | the daemon would not be able to enforce lifecycle policy consistently
Confidence: high
Scope-risk: narrow
Directive: Any local-runtime lifecycle behavior must read from AppConfig.daemon rather than Electron-only process state
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_config.py tests/test_gateway_config_api.py -q
Not-tested: Live runtime reload in a running daemon process
EOF
```

---

## Task 2: Build the Local Daemon App and Session Registry

**Files:**
- Create: `backend/app/daemon/__init__.py`
- Create: `backend/app/daemon/app.py`
- Create: `backend/app/daemon/main.py`
- Create: `backend/app/daemon/service.py`
- Create: `backend/app/daemon/session_registry.py`
- Create: `backend/app/daemon/routers/__init__.py`
- Create: `backend/app/daemon/routers/clients.py`
- Create: `backend/app/daemon/routers/runtime.py`
- Create: `backend/tests/test_local_daemon_api.py`
- Create: `backend/tests/test_local_daemon_session_registry.py`

**Step 1: Write the failing daemon tests**

Create `backend/tests/test_local_daemon_session_registry.py`:

```python
from app.daemon.session_registry import SessionRegistry


def test_registry_respects_background_running_and_grace_period() -> None:
    registry = SessionRegistry(
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
    )
    registry.register("electron-1", "electron")

    registry.unregister("electron-1")
    assert registry.should_exit(now=0) is False
    assert registry.should_exit(now=4) is True
```

Create `backend/tests/test_local_daemon_api.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_local_daemon_exposes_runtime_and_threads_routes() -> None:
    client = TestClient(create_app())

    health = client.get("/health")
    runtime = client.get("/api/daemon/runtime-info")
    threads = client.post("/api/threads/search", json={"limit": 1})

    assert health.status_code == 200
    assert runtime.status_code == 200
    assert runtime.json()["host"] == "127.0.0.1"
    assert threads.status_code == 200
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_api.py tests/test_local_daemon_session_registry.py -q
```

Expected: `FAIL` because the daemon package does not exist

**Step 3: Implement the daemon app and lifecycle service**

Create `backend/app/daemon/session_registry.py`:

```python
from dataclasses import dataclass
from time import monotonic


@dataclass
class ClientSession:
    client_id: str
    client_type: str
    detached_at: float | None = None


class SessionRegistry:
    def __init__(
        self,
        *,
        allow_background_running: bool,
        shutdown_grace_period_seconds: int,
    ) -> None:
        self._allow_background_running = allow_background_running
        self._grace = shutdown_grace_period_seconds
        self._sessions: dict[str, ClientSession] = {}

    def register(self, client_id: str, client_type: str) -> None:
        self._sessions[client_id] = ClientSession(client_id, client_type)

    def unregister(self, client_id: str) -> None:
        session = self._sessions.pop(client_id, None)
        if session and session.client_type == "electron":
            self._last_electron_detach_at = monotonic()

    def should_exit(self, now: float | None = None) -> bool:
        if self._allow_background_running:
            return False
        if self._sessions:
            return False
        current = monotonic() if now is None else now
        return current >= self._last_electron_detach_at + self._grace
```

Create `backend/app/daemon/service.py` to own:

- typed daemon config
- `SessionRegistry`
- runtime info payload

Create `backend/app/daemon/routers/runtime.py` with:

- `GET /health`
- `GET /api/daemon/runtime-info`

Create `backend/app/daemon/routers/clients.py` with:

- `POST /api/daemon/clients/register`
- `POST /api/daemon/clients/{client_id}/heartbeat`
- `DELETE /api/daemon/clients/{client_id}`

Create `backend/app/daemon/app.py` that:

- applies CORS for `nion://app`
- stores `daemon_service` on `app.state`
- includes existing compatible routers:

```python
from app.gateway.routers import config, threads

app.include_router(config.router)
app.include_router(threads.router)
app.include_router(runtime.router)
app.include_router(clients.router)
```

Create `backend/app/daemon/main.py`:

```python
import uvicorn

from app.daemon.app import create_app
from nion.config import get_app_config


def main() -> None:
    config = get_app_config()
    uvicorn.run(
        create_app(),
        host=config.daemon.host,
        port=config.daemon.port,
        log_level="info",
    )


if __name__ == "__main__":
    main()
```

**Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_api.py tests/test_local_daemon_session_registry.py tests/test_threads_router.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/__init__.py backend/app/daemon/app.py backend/app/daemon/main.py backend/app/daemon/service.py backend/app/daemon/session_registry.py backend/app/daemon/routers/__init__.py backend/app/daemon/routers/clients.py backend/app/daemon/routers/runtime.py backend/tests/test_local_daemon_api.py backend/tests/test_local_daemon_session_registry.py
git commit -F - <<'EOF'
Create the single local daemon app and its session registry

Constraint: Electron and later CLI clients must share one runtime process and one local protocol
Rejected: Keep GUI state and daemon lifetime decisions inside Electron main | that would prevent a clean shared-runtime model for later clients
Confidence: medium
Scope-risk: moderate
Directive: Add new local-runtime behavior to app.daemon first; do not keep extending app.desktop_helper
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_api.py tests/test_local_daemon_session_registry.py tests/test_threads_router.py -q
Not-tested: Long-running daemon shutdown after real client disconnects
EOF
```

---

## Task 3: Repoint Packaging and Dev Startup to the Daemon Entry Point

**Files:**
- Modify: `backend/packaging/pyinstaller/nion-backend.spec`
- Modify: `scripts/build-python-helper.sh`
- Modify: `desktop/src/main/config.ts`
- Create: `desktop/tests/daemon-launcher.test.mjs`

**Step 1: Write the failing launcher test**

Create `desktop/tests/daemon-launcher.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";

import { buildDaemonCommand } from "../dist/main/config.js";

test("desktop config resolves the daemon entrypoint in development mode", () => {
  const command = buildDaemonCommand({
    appRoot: "/tmp/nion",
    resourcesPath: "/tmp/resources",
    userDataPath: "/tmp/nion-user-data",
    platform: "darwin",
    packaged: false,
  });

  assert.equal(command.executable, "uv");
  assert.deepEqual(command.args, ["run", "python", "-m", "app.daemon.main"]);
});
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/daemon-launcher.test.mjs
```

Expected: `FAIL` because `buildDaemonCommand()` does not exist and the config still points at `app.desktop_helper`

**Step 3: Repoint the packaged daemon**

Modify `backend/packaging/pyinstaller/nion-backend.spec` so it packages `app/daemon/main.py` instead of `app/desktop_helper.py`.

Modify `scripts/build-python-helper.sh` so it still builds the same artifact path for now, but the artifact contains the daemon entrypoint.

Modify `desktop/src/main/config.ts` to export:

```ts
export function buildDaemonCommand(options: BuildDaemonCommandOptions) {
  if (!options.packaged) {
    return {
      executable: "uv",
      args: ["run", "python", "-m", "app.daemon.main"],
      ...
    };
  }

  return {
    executable: environment.backendExecutable,
    args: [],
    ...
  };
}
```

Do not rename the packaged artifact in Phase 01. Keep the current resource path stable so the packaging lane remains reviewable.

**Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/daemon-launcher.test.mjs
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packaging/pyinstaller/nion-backend.spec scripts/build-python-helper.sh desktop/src/main/config.ts desktop/tests/daemon-launcher.test.mjs
git commit -F - <<'EOF'
Point the desktop packaging lane at the daemon entrypoint

Constraint: Packaged Electron builds still need a bundled local runtime binary during the transition to a standalone daemon model
Rejected: Rename every artifact to niond in Phase 01 | that would expand the review surface before the daemon lifecycle is even proven
Confidence: medium
Scope-risk: moderate
Directive: Keep artifact names stable in this phase, but ensure the packaged binary now boots the daemon entrypoint rather than the helper wrapper
Tested: cd desktop && pnpm run build:main && node --test tests/daemon-launcher.test.mjs
Not-tested: Full packaged macOS and Windows desktop builds
EOF
```

---

## Task 4: Convert Electron Into an Immediate-Start Single-Window Daemon Client

**Files:**
- Create: `desktop/src/main/daemon-launcher.ts`
- Create: `desktop/src/main/daemon-client-session.ts`
- Create: `desktop/src/main/single-instance.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/window.ts`
- Modify: `desktop/src/main/updater.ts`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/preload/index.ts`
- Delete: `desktop/src/main/backend-supervisor.ts`
- Delete: `desktop/tests/supervisor.test.mjs`
- Create: `desktop/tests/single-instance.test.mjs`
- Modify: `desktop/tests/entrypoint.test.mjs`

**Step 1: Write the failing Electron bootstrap tests**

Create `desktop/tests/single-instance.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";

import { shouldKeepPrimaryInstance } from "../dist/main/single-instance.js";

test("single-instance helper keeps the primary process and rejects the second", () => {
  assert.equal(shouldKeepPrimaryInstance(true), true);
  assert.equal(shouldKeepPrimaryInstance(false), false);
});
```

Modify `desktop/tests/entrypoint.test.mjs` to add an import-level assertion that the main module no longer depends on `backend-supervisor`.

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/daemon-launcher.test.mjs tests/single-instance.test.mjs tests/entrypoint.test.mjs
```

Expected: `FAIL` because the launcher/session/single-instance helpers do not exist

**Step 3: Implement immediate daemon start and client registration**

Create `desktop/src/main/daemon-launcher.ts`:

```ts
import { spawn } from "node:child_process";

export async function startLocalDaemon(command: DaemonCommand): Promise<DaemonRuntimeInfo> {
  const child = spawn(command.executable, command.args, {
    cwd: command.cwd,
    env: command.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await waitForDaemonHealthy(command.urls.health);
  return command.runtime;
}
```

Create `desktop/src/main/daemon-client-session.ts` to:

- register Electron as `client_type = "electron"`
- heartbeat on an interval
- unregister on window close and app quit

Create `desktop/src/main/single-instance.ts`:

```ts
export function shouldKeepPrimaryInstance(lockAcquired: boolean): boolean {
  return lockAcquired;
}
```

Modify `desktop/src/main/index.ts` to:

- acquire `app.requestSingleInstanceLock()`
- install `second-instance` focus behavior
- remove `createBackendSupervisor()`
- call `startLocalDaemon()` immediately on launch
- read daemon runtime info
- register the Electron client session
- remove the old `supervisor.stop()` shutdown path

Modify `desktop/src/main/window.ts` to export a helper that focuses/restores the main window for second-instance handling.

Modify `desktop/src/shared/ipc.ts` and `desktop/src/preload/index.ts` so `runtimeInfo` carries daemon-backed metadata:

```ts
type DesktopRuntimeInfo = {
  mode: "local-daemon";
  baseUrl: string;
  healthUrl: string;
  clientId: string | null;
  allowBackgroundRunning: boolean;
};
```

Delete `desktop/src/main/backend-supervisor.ts` and `desktop/tests/supervisor.test.mjs`.

**Step 4: Run the desktop tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/daemon-launcher.test.mjs tests/single-instance.test.mjs tests/entrypoint.test.mjs tests/updater-config.test.mjs
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add desktop/src/main/daemon-launcher.ts desktop/src/main/daemon-client-session.ts desktop/src/main/single-instance.ts desktop/src/main/index.ts desktop/src/main/window.ts desktop/src/main/updater.ts desktop/src/shared/ipc.ts desktop/src/preload/index.ts desktop/tests/daemon-launcher.test.mjs desktop/tests/single-instance.test.mjs desktop/tests/entrypoint.test.mjs
git rm desktop/src/main/backend-supervisor.ts desktop/tests/supervisor.test.mjs
git commit -F - <<'EOF'
Turn Electron into a single-window client of the local daemon

Constraint: Electron must start the local daemon immediately but must no longer own the daemon lifetime the way a helper child process did
Rejected: Keep the old supervisor and only stop calling kill on quit | that would preserve the wrong ownership model and hide daemon/session state inside a child-process wrapper
Confidence: high
Scope-risk: moderate
Directive: Electron main may start and attach to the daemon, but runtime shutdown policy must remain daemon-owned
Tested: cd desktop && pnpm run build:main && node --test tests/daemon-launcher.test.mjs tests/single-instance.test.mjs tests/entrypoint.test.mjs tests/updater-config.test.mjs
Not-tested: Real second-launch behavior in a packaged desktop app
EOF
```

---

## Task 5: Add the Daemon Settings Page to Config Center

**Files:**
- Create: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Create: `frontend/src/components/workspace/settings/settings-sections.test.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/settings-modules.test.ts`

**Step 1: Write the failing settings tests**

Create `frontend/src/components/workspace/settings/settings-sections.test.ts`:

```typescript
import assert from "node:assert/strict";
import test from "node:test";

import { SETTINGS_SECTIONS, parseSettingsSection } from "./settings-sections.ts";

void test("daemon appears as a first-class settings section", () => {
  assert.equal(SETTINGS_SECTIONS.includes("daemon"), true);
  assert.equal(parseSettingsSection("daemon"), "daemon");
});
```

Modify `frontend/src/core/i18n/locales/settings-modules.test.ts` so the settings contract now asserts a `daemon` section in both locales.

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/settings/settings-sections.test.ts src/core/i18n/locales/settings-modules.test.ts
```

Expected: `FAIL` because the daemon section does not exist

**Step 3: Build the settings page**

Create `frontend/src/components/workspace/settings/daemon-settings-page.tsx` using `useConfigEditor()`:

```tsx
"use client";

import { Switch } from "@/components/ui/switch";

import { ConfigSaveBar } from "./configuration/config-save-bar";
import { SettingsSection } from "./settings-section";
import { useConfigEditor } from "./use-config-editor";

export function DaemonSettingsPage() {
  const { draftConfig, onConfigChange, dirty, disabled, saving, onDiscard, onSave } =
    useConfigEditor();

  const daemon = (draftConfig.daemon ?? {}) as Record<string, unknown>;
  const allowBackgroundRunning = Boolean(daemon.allow_background_running);

  return (
    <SettingsSection title="Daemon" description="Control local daemon lifetime.">
      <Switch
        checked={allowBackgroundRunning}
        onCheckedChange={(checked) =>
          onConfigChange({
            ...draftConfig,
            daemon: {
              ...daemon,
              allow_background_running: checked,
            },
          })
        }
      />
      <ConfigSaveBar
        dirty={dirty}
        disabled={disabled}
        saving={saving}
        onDiscard={onDiscard}
        onSave={() => {
          void onSave();
        }}
      />
    </SettingsSection>
  );
}
```

Modify `frontend/src/components/workspace/settings/settings-sections.ts` to add `"daemon"`.

Modify `frontend/src/components/workspace/settings/settings-dialog.tsx` to:

- import `DaemonSettingsPage`
- add `daemon` to the visible `system` nav group
- render the page when `activeSection === "daemon"`

Modify the locale files and locale types to add:

- `t.settings.sections.daemon`
- `t.settings.daemon.title`
- `t.settings.daemon.description`
- daemon page copy for the background-running toggle

**Step 4: Run the frontend tests and typecheck**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/settings/settings-sections.test.ts src/core/i18n/locales/settings-modules.test.ts
pnpm typecheck
```

Expected: both commands `PASS`

**Step 5: Commit**

```bash
git add frontend/src/components/workspace/settings/daemon-settings-page.tsx frontend/src/components/workspace/settings/settings-sections.ts frontend/src/components/workspace/settings/settings-dialog.tsx frontend/src/components/workspace/settings/settings-sections.test.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts frontend/src/core/i18n/locales/settings-modules.test.ts
git commit -F - <<'EOF'
Add a Config Center page for daemon lifecycle settings

Constraint: Users need one visible setting that controls whether the daemon survives Electron shutdown
Rejected: Hide allow_background_running in raw config only | the runtime policy is product-level behavior and must be directly discoverable in settings
Confidence: high
Scope-risk: moderate
Directive: Keep daemon lifecycle settings in Config Center pages, not in frontend local settings state
Tested: cd frontend && node --test src/components/workspace/settings/settings-sections.test.ts src/core/i18n/locales/settings-modules.test.ts && pnpm typecheck
Not-tested: End-to-end save flow from Electron UI into a running daemon
EOF
```

---

## Task 6: Update Runtime Docs and Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/desktop/development.md`
- Modify: `docs/desktop/desktop-product-contract.md`
- Modify: `backend/README.md`
- Modify: `backend/tests/test_desktop_product_contract.py`

**Step 1: Write the failing product-contract assertion**

Modify `backend/tests/test_desktop_product_contract.py` to assert:

```python
assert "single local daemon" in contract
assert "Electron single-window client" in contract
assert "allow_background_running" in contract
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_desktop_product_contract.py -q
```

Expected: `FAIL` because the docs still describe the old helper-owned product

**Step 3: Update the docs**

Modify:

- `README.md`
  - describe the local desktop runtime as daemon + Electron client
- `docs/desktop/development.md`
  - explain immediate daemon start on launch
  - explain `allow_background_running`
  - explain the short shutdown grace period
  - explain single-window Electron
- `docs/desktop/desktop-product-contract.md`
  - replace helper-owned language with daemon-owned language
- `backend/README.md`
  - stop describing the local runtime as an Electron-bundled helper wrapper

**Step 4: Run the full verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_config.py tests/test_local_daemon_api.py tests/test_local_daemon_session_registry.py tests/test_gateway_config_api.py tests/test_threads_router.py tests/test_desktop_product_contract.py -q
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
pnpm run build:main
node --test tests/daemon-launcher.test.mjs tests/single-instance.test.mjs tests/entrypoint.test.mjs tests/updater-config.test.mjs
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/settings/settings-sections.test.ts src/core/i18n/locales/settings-modules.test.ts src/core/threads/desktop-client.test.ts
pnpm typecheck
```

Expected: all commands `PASS`

**Step 5: Run the manual smoke test**

Terminal A:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
pnpm --dir desktop dev
```

Terminal B:

```bash
pgrep -fal "app.daemon.main|nion-backend" || true
curl -s http://127.0.0.1:43115/health
```

Expected:

- Electron opens one window
- a second launch focuses the existing window
- the daemon is alive on `127.0.0.1:43115`
- `/health` responds successfully

Then turn `allow_background_running` off in settings, close Electron, and verify after 4 seconds:

```bash
sleep 4
pgrep -fal "app.daemon.main|nion-backend" || true
```

Expected:

- the daemon exits when no other clients are attached

**Step 6: Commit**

```bash
git add README.md docs/desktop/development.md docs/desktop/desktop-product-contract.md backend/README.md backend/tests/test_desktop_product_contract.py
git commit -F - <<'EOF'
Document the daemon-owned local runtime after Program 01

Constraint: Product docs must describe the same runtime ownership model that the code enforces
Rejected: Delay doc updates until the CLI phase | that would leave the repo describing a helper-owned desktop runtime after the daemon conversion
Confidence: high
Scope-risk: narrow
Directive: Keep local-runtime docs aligned with the single-daemon model as future phases add CLI, tray, and autostart features
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_config.py tests/test_local_daemon_api.py tests/test_local_daemon_session_registry.py tests/test_gateway_config_api.py tests/test_threads_router.py tests/test_desktop_product_contract.py -q; cd desktop && pnpm run build:main && node --test tests/daemon-launcher.test.mjs tests/single-instance.test.mjs tests/entrypoint.test.mjs tests/updater-config.test.mjs; cd frontend && node --test src/components/workspace/settings/settings-sections.test.ts src/core/i18n/locales/settings-modules.test.ts src/core/threads/desktop-client.test.ts && pnpm typecheck
Not-tested: Packaged installer behavior and future CLI coexistence
EOF
```
