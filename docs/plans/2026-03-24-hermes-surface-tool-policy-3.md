# Hermes Surface Tool Policy Implementation Plan (V1)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Hermes-style surface-aware governance for YAML-configured tools so workspace, channels, and automation can expose different configured toolsets through one runtime. In this lane, subagents inherit the caller surface. Built-in, vision, tool-search, and MCP tools keep their current behavior.

**Architecture:** Extend config with explicit `surface_policy` rules and a read-only configured-tool catalog. Propagate `surface` from each runtime entrypoint to the real tool-binding path (`lead_agent`, embedded `NionClient`, automation runner, and subagent inheritance), then filter configured tools inside `get_available_tools()` before agent creation. Expose the current policy plus configured-tool catalog through a gateway router and a dedicated operator page at `/workspace/tool-policy`.

**Tech Stack:** Pydantic, FastAPI, LangGraph, React, TanStack Query

---

**Scope / Non-goals**

- In scope: tools declared under `tools:` in `config.yaml`, workspace/channel/automation runtime entrypoints, subagent surface inheritance, read-only inspection API, dedicated operator page.
- Out of scope: policy mutations, built-in tool governance, MCP tool governance, a distinct `subagent` policy tier, channel pairing flows, recall storage, shared settings-shell integration.

**Execution Notes**

- Use `@test-driven-development` and `@verification-before-completion`.
- Keep `tool_groups` as the durable tool grouping primitive; `surface_policy` composes on top of it.
- This V1 governs configured tools only. Do not claim full runtime governance over built-ins, `view_image`, `tool_search`, or cached MCP tools in this lane.
- `backend/app/channels/manager.py` only injects runtime context. Enforcement happens where tools are actually bound.
- Subagents inherit the parent surface in this lane. Do not introduce a privileged `subagent` surface.
- Use a dedicated route instead of editing the current settings dialog. The current workspace shell does not have a `/workspace/manage/*` tree.
- When the config schema changes, bump `config_version` from the current value in `config.example.yaml` and update `backend/docs/CONFIGURATION.md`.
- This lane is not parallel-safe with other work that edits `backend/packages/harness/nion/agents/lead_agent/agent.py`; schedule accordingly.

### Task 1: hermes-surface-tool-policy-3-config-model

**Files:**
- Create: `backend/packages/harness/nion/config/surface_policy_config.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `config.example.yaml`
- Modify: `backend/docs/CONFIGURATION.md`
- Test: `backend/tests/test_surface_policy_config.py`

**Step 1: Write the failing test**

Create `backend/tests/test_surface_policy_config.py`:

```python
from nion.config.surface_policy_config import SurfacePolicyConfig, SurfaceRule


def test_surface_policy_returns_empty_rule_for_unknown_surface():
    cfg = SurfacePolicyConfig()

    rule = cfg.get_rule("missing")

    assert rule.allowed_groups is None
    assert rule.denied_tools == []


def test_surface_policy_prefers_explicit_allowlist():
    cfg = SurfacePolicyConfig(
        rules={
            "workspace": SurfaceRule(allowed_groups=["web", "bash"]),
            "channel": SurfaceRule(allowed_groups=["web"], denied_tools=["bash"]),
        }
    )

    assert cfg.rules["workspace"].allowed_groups == ["web", "bash"]
    assert cfg.rules["channel"].denied_tools == ["bash"]
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_surface_policy_config.py -q`

Expected: `FAIL` with `ModuleNotFoundError: No module named 'nion.config.surface_policy_config'`

**Step 3: Write minimal implementation**

```python
# backend/packages/harness/nion/config/surface_policy_config.py
from pydantic import BaseModel, Field


class SurfaceRule(BaseModel):
    allowed_groups: list[str] | None = Field(default=None)
    denied_groups: list[str] = Field(default_factory=list)
    allowed_tools: list[str] | None = Field(default=None)
    denied_tools: list[str] = Field(default_factory=list)


class SurfacePolicyConfig(BaseModel):
    rules: dict[str, SurfaceRule] = Field(default_factory=dict)

    def get_rule(self, surface: str) -> SurfaceRule:
        return self.rules.get(surface, SurfaceRule())
```

Add `surface_policy: SurfacePolicyConfig` to `AppConfig`.

Update `config.example.yaml` by reusing the single `surface_policy` section in that file, not by introducing a second example block. Bump `config_version` from its current value at execution time.

```yaml
surface_policy:
  rules:
    workspace:
      allowed_groups: [web, file:read, file:write, bash]
    channel:
      allowed_groups: [web, file:read]
      denied_tools: [bash, write_file, str_replace]
    automation:
      allowed_groups: [web, file:read, bash]
```

Document the new section in `backend/docs/CONFIGURATION.md` under the tools configuration chapter.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_surface_policy_config.py -q`

Expected: `2 passed`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/config/surface_policy_config.py backend/packages/harness/nion/config/app_config.py config.example.yaml backend/docs/CONFIGURATION.md backend/tests/test_surface_policy_config.py
git commit -F - <<'EOF'
Add a typed surface policy config for configured-tool governance

Introduce explicit per-surface rules so runtime entry points can stop sharing
one undifferentiated configured-tool exposure contract.

Constraint: Existing tool_groups must remain valid and backwards-compatible
Constraint: config.example.yaml version must advance when the schema changes
Rejected: Encode surfaces inside tool group names | too implicit and hard to govern
Confidence: high
Scope-risk: narrow
Directive: Keep surface policy declarative and scoped to configured tools in this lane
Tested: uv run pytest tests/test_surface_policy_config.py -q
Not-tested: migration behavior for customized user config.yaml files
EOF
```

### Task 2: hermes-surface-tool-policy-3-runtime-propagation-and-filtering

**Files:**
- Create: `backend/packages/harness/nion/tools/catalog.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/app/channels/manager.py`
- Modify: `backend/packages/harness/nion/automation/executor.py`
- Modify: `backend/packages/harness/nion/tools/builtins/task_tool.py`
- Create: `backend/tests/test_tool_surface_policy.py`
- Create: `backend/tests/test_client_surface_policy.py`
- Modify: `backend/tests/test_task_tool_core_logic.py`
- Modify: `backend/tests/test_automation_executor.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_tool_surface_policy.py`:

```python
from types import SimpleNamespace

from nion.config.surface_policy_config import SurfacePolicyConfig, SurfaceRule
from nion.tools.catalog import ToolCatalogEntry
from nion.tools.tools import _apply_surface_policy


def test_channel_surface_drops_bash_from_policy_managed_tools():
    config = SimpleNamespace(
        surface_policy=SurfacePolicyConfig(
            rules={
                "channel": SurfaceRule(
                    allowed_groups=["web"],
                    denied_tools=["bash"],
                )
            }
        )
    )
    catalog = {
        "bash": ToolCatalogEntry(name="bash", group="bash", source="config", policy_managed=True),
        "web_search": ToolCatalogEntry(name="web_search", group="web", source="config", policy_managed=True),
    }
    tools = [
        SimpleNamespace(name="bash"),
        SimpleNamespace(name="web_search"),
        SimpleNamespace(name="ask_clarification"),
    ]

    filtered = _apply_surface_policy(config, "channel", tools, catalog)
    names = [tool.name for tool in filtered]

    assert "bash" not in names
    assert "web_search" in names
    assert "ask_clarification" in names
```

Create `backend/tests/test_client_surface_policy.py`:

```python
from nion.client import NionClient


def test_client_surface_is_part_of_agent_cache_key():
    client = NionClient()

    workspace = client._get_runnable_config("thread-1", surface="workspace")
    automation = client._get_runnable_config("thread-1", surface="automation")

    assert workspace["configurable"]["surface"] == "workspace"
    assert automation["configurable"]["surface"] == "automation"
```

Extend `backend/tests/test_task_tool_core_logic.py` so the existing mocked `get_available_tools()` assertion includes inherited `surface="channel"` when `runtime.context["surface"] == "channel"`.

Extend `backend/tests/test_automation_executor.py` so `build_automation_runtime_config()` asserts `runtime_config["context"]["surface"] == "automation"`.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_surface_policy.py tests/test_client_surface_policy.py tests/test_task_tool_core_logic.py tests/test_automation_executor.py -q
```

Expected: failures for missing `ToolCatalogEntry`, missing `_apply_surface_policy(..., catalog=...)`, absent `surface` propagation, and stale mocked `get_available_tools()` signatures.

**Step 3: Write minimal implementation**

Create a configured-tool catalog:

```python
# backend/packages/harness/nion/tools/catalog.py
from dataclasses import dataclass


@dataclass(slots=True)
class ToolCatalogEntry:
    name: str
    group: str
    source: str
    policy_managed: bool = True


def build_configured_tool_catalog(config) -> dict[str, ToolCatalogEntry]:
    return {
        tool.name: ToolCatalogEntry(name=tool.name, group=tool.group, source="config")
        for tool in config.tools
    }
```

Build the catalog from `config.tools` only in this lane. Do not try to normalize built-in or MCP tools yet.

Update `get_available_tools()` to accept `surface: str = "workspace"` and filter configured tools before agent creation:

```python
def _apply_surface_policy(config, surface: str, loaded_tools: list[BaseTool], catalog: dict[str, ToolCatalogEntry]) -> list[BaseTool]:
    rule = config.surface_policy.get_rule(surface)
    allowed_groups = set(rule.allowed_groups or [])
    denied_groups = set(rule.denied_groups or [])
    allowed_tools = set(rule.allowed_tools or [])
    denied_tools = set(rule.denied_tools or [])

    filtered = []
    for tool in loaded_tools:
        entry = catalog.get(tool.name)
        if entry is None or not entry.policy_managed:
            filtered.append(tool)
            continue
        if tool.name in denied_tools or entry.group in denied_groups:
            continue
        if allowed_tools and tool.name not in allowed_tools:
            continue
        if allowed_groups and entry.group not in allowed_groups:
            continue
        filtered.append(tool)
    return filtered


def get_available_tools(..., surface: str = "workspace") -> list[BaseTool]:
    ...
    configured_catalog = build_configured_tool_catalog(config)
    filtered_loaded_tools = _apply_surface_policy(config, surface, loaded_tools, configured_catalog)
    return filtered_loaded_tools + builtin_tools + mcp_tools
```

Propagate `surface` through the real binding path:

- `backend/packages/harness/nion/agents/lead_agent/agent.py`
  Read `surface = cfg.get("surface", "workspace")` and pass it to both bootstrap and default `get_available_tools(...)` calls.
- `backend/packages/harness/nion/client.py`
  Add `surface` to `RunnableConfig.configurable`, pass it through `_get_tools(...)`, and include it in `_agent_config_key`.
- `backend/app/channels/manager.py`
  Inject `"surface": "channel"` into the merged run context.
- `backend/packages/harness/nion/automation/executor.py`
  Inject `"surface": "automation"` into `build_automation_runtime_config()`.
- `backend/packages/harness/nion/tools/builtins/task_tool.py`
  Inherit `runtime.context.get("surface", "workspace")` when calling `get_available_tools(...)`. Do not introduce a separate subagent policy tier in this lane.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_surface_policy_config.py tests/test_tool_surface_policy.py tests/test_client_surface_policy.py tests/test_task_tool_core_logic.py tests/test_automation_executor.py -q
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/catalog.py backend/packages/harness/nion/tools/tools.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/packages/harness/nion/client.py backend/app/channels/manager.py backend/packages/harness/nion/automation/executor.py backend/packages/harness/nion/tools/builtins/task_tool.py backend/tests/test_tool_surface_policy.py backend/tests/test_client_surface_policy.py backend/tests/test_task_tool_core_logic.py backend/tests/test_automation_executor.py
git commit -F - <<'EOF'
Propagate runtime surface to configured-tool binding points

Apply per-surface configured-tool rules where tools are actually bound so
workspace, channel, automation, and inherited subagent runs stop sharing one
tool exposure path by default.

Constraint: Built-in and MCP tools remain unchanged in this V1 lane
Rejected: Enforce policy only in channel manager | manager forwards context but does not bind tools
Rejected: Add a separate subagent surface now | creates unclear privilege semantics
Confidence: high
Scope-risk: moderate
Directive: Keep surface propagation explicit and include surface in client agent cache keys
Tested: uv run pytest tests/test_surface_policy_config.py tests/test_tool_surface_policy.py tests/test_client_surface_policy.py tests/test_task_tool_core_logic.py tests/test_automation_executor.py -q
Not-tested: cached MCP tool exposure under future policy-managed catalog work
EOF
```

### Task 3: hermes-surface-tool-policy-3-api-and-operator-route

**Files:**
- Create: `backend/app/gateway/routers/tool_policy.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/gateway/app.py`
- Create: `backend/tests/test_tool_policy_router.py`
- Create: `frontend/src/core/tool-policy/types.ts`
- Create: `frontend/src/core/tool-policy/api.ts`
- Create: `frontend/src/core/tool-policy/hooks.ts`
- Create: `frontend/src/app/workspace/tool-policy/page.tsx`
- Create: `frontend/src/components/workspace/tool-policy/tool-policy-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Write the failing test**

Create `backend/tests/test_tool_policy_router.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_tool_policy_endpoint_returns_rules_and_configured_catalog():
    client = TestClient(create_app())
    response = client.get("/api/tool-policy")

    assert response.status_code == 200
    body = response.json()
    assert "rules" in body
    assert "catalog" in body
    assert body["scope"] == "configured-tools-v1"
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_policy_router.py -q`

Expected: `FAIL` with `404` on `/api/tool-policy`

**Step 3: Write minimal implementation**

Expose a read-only inspection endpoint:

```python
# backend/app/gateway/routers/tool_policy.py
from dataclasses import asdict

from fastapi import APIRouter

from nion.config.app_config import get_app_config
from nion.tools.catalog import build_configured_tool_catalog

router = APIRouter(prefix="/api/tool-policy", tags=["tool-policy"])


@router.get("")
async def get_tool_policy():
    config = get_app_config()
    return {
        "scope": "configured-tools-v1",
        "rules": config.surface_policy.model_dump()["rules"],
        "catalog": [asdict(entry) for entry in build_configured_tool_catalog(config).values()],
    }
```

Add the router to both `backend/app/gateway/routers/__init__.py` and `backend/app/gateway/app.py`.

Create a dedicated page at `frontend/src/app/workspace/tool-policy/page.tsx`. Do not wire it into the shared settings dialog in this lane. Keep the page read-only and self-contained.

Create the React data layer:

```ts
// frontend/src/core/tool-policy/api.ts
import { getBackendBaseURL } from "@/core/config";
import { createApiErrorFromResponse } from "@/core/errors/api-errors";

export async function loadToolPolicy() {
  const res = await fetch(`${getBackendBaseURL()}/api/tool-policy`);
  if (!res.ok) {
    throw await createApiErrorFromResponse(res, {
      code: "toolPolicy.load_failed",
      message: `Failed to load tool policy: ${res.statusText}`,
    });
  }
  return res.json();
}
```

Render a simple operator surface that shows:

- active scope badge: `configured-tools-v1`
- per-surface rules table
- configured-tool catalog table
- a warning that built-in and MCP tools are out of scope in this version

**Step 4: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_surface_policy_config.py tests/test_tool_surface_policy.py tests/test_client_surface_policy.py tests/test_task_tool_core_logic.py tests/test_automation_executor.py tests/test_tool_policy_router.py -q
```

Expected: all tests pass.

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Expected: `eslint` and `tsc --noEmit` both succeed.

**Step 5: Commit**

```bash
git add backend/app/gateway/routers/tool_policy.py backend/app/gateway/routers/__init__.py backend/app/gateway/app.py backend/tests/test_tool_policy_router.py frontend/src/core/tool-policy/types.ts frontend/src/core/tool-policy/api.ts frontend/src/core/tool-policy/hooks.ts frontend/src/app/workspace/tool-policy/page.tsx frontend/src/components/workspace/tool-policy/tool-policy-page.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -F - <<'EOF'
Expose configured surface policy through a read-only operator route

Publish the active configured-tool surface rules and catalog so operators can
inspect runtime exposure without reading YAML or reverse-engineering binding code.

Constraint: UI must stay decoupled from the shared settings dialog in this lane
Rejected: Use /workspace/manage/tool-policy | current app tree does not expose a manage route shell
Confidence: medium
Scope-risk: moderate
Directive: Keep the page read-only until policy persistence and approval semantics are designed
Tested: uv run pytest tests/test_surface_policy_config.py tests/test_tool_surface_policy.py tests/test_client_surface_policy.py tests/test_task_tool_core_logic.py tests/test_automation_executor.py tests/test_tool_policy_router.py -q; pnpm check
Not-tested: navigation discoverability from existing workspace menus
EOF
```

### Final Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_surface_policy_config.py tests/test_tool_surface_policy.py tests/test_client_surface_policy.py tests/test_task_tool_core_logic.py tests/test_automation_executor.py tests/test_tool_policy_router.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Manual Acceptance

- Workspace keeps the configured tools it already had by default.
- Channel runs no longer bind explicitly denied configured tools such as `bash`.
- Automation runs resolve `surface="automation"` and use the automation allowlist for configured tools.
- A subagent spawned from a channel run inherits the channel surface and does not regain denied configured tools.
- `/workspace/tool-policy` renders the read-only policy and configured-tool catalog, and clearly labels the page as `configured-tools-v1`.

### Follow-up Work After This Lane

- Normalize built-in, vision, `tool_search`, and MCP tools into a policy-managed catalog.
- Decide whether automation `toolset_profile` and `surface_policy` should merge, layer, or one should replace the other.
- Decide whether a future distinct `subagent` surface should exist, and if so, how it intersects with parent surface restrictions.
- Add route discoverability from existing workspace navigation after the broader Hermes UI settles.
