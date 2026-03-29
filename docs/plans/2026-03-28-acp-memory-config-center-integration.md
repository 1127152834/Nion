# ACP Agent And Memory Storage Productization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Safely absorb upstream ACP agent integration, ACP env injection, and memory storage abstraction into NION through Config Center and settings pages instead of reintroducing `config.yaml` as the runtime source of truth.

**Architecture:** Add two first-class product surfaces on top of the existing Config Center. ACP support becomes a dedicated settings-driven capability backed by structured `acp_agents` config, runtime tool registration, and sandbox-safe per-thread workspaces. Memory storage abstraction is implemented as a backend-compatible `storage_class` capability, but the UI exposes it as a safe storage mode selector with an advanced custom-class escape hatch.

**Tech Stack:** FastAPI, Pydantic, SQLite config center, Python pytest, React 19, Next.js 16, React Query, node:test, TypeScript

---

## Preflight Notes

- Execute this plan in a dedicated worktree, not in the dirty main workspace.
- Use `@test-driven-development` and `@verification-before-completion` discipline for every task.
- Keep ACP and memory work in separate commits even if they touch the same config plumbing.
- Full `pnpm --dir frontend check` currently has unrelated notebook lint failures on this branch. During implementation, use targeted `node --test` plus `pnpm --dir frontend typecheck` as the gate, then rerun the broader frontend check after the notebook baseline is clean.

### Task 1: Add A First-Class Settings Home For ACP Integrations

**Files:**
- Create: `frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`
- Modify: `frontend/src/components/workspace/settings/settings-sections.test.ts`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/settings-modules.test.ts`

**Step 1: Write the failing tests**

Add the new section and locale contract expectations before adding any UI:

```ts
// frontend/src/components/workspace/settings/settings-sections.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { SETTINGS_SECTIONS, parseSettingsSection } from "./settings-sections.ts";

void test("agent integrations appears as a first-class settings section", () => {
  assert.equal(SETTINGS_SECTIONS.includes("agentIntegrations"), true);
  assert.equal(parseSettingsSection("agentIntegrations"), "agentIntegrations");
});
```

```ts
// frontend/src/core/i18n/locales/settings-modules.test.ts
const EXPECTED_AGENT_INTEGRATIONS_SHAPE = {
  title: true,
  description: true,
  empty: true,
  knownAgents: {
    codex: true,
    claudeCode: true,
  },
  fields: {
    enabled: true,
    command: true,
    args: true,
    description: true,
    model: true,
    autoApprovePermissions: true,
    env: true,
  },
} as const;
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir frontend exec node --test \
  src/components/workspace/settings/settings-sections.test.ts \
  src/core/i18n/locales/settings-modules.test.ts
```

Expected:
- FAIL because `agentIntegrations` is missing from `SETTINGS_SECTIONS`
- FAIL because the locale contract does not expose `settings.agentIntegrations`

**Step 3: Write the minimal implementation**

Add the section id, nav entry, and placeholder page first:

```ts
// frontend/src/components/workspace/settings/settings-sections.ts
export const SETTINGS_SECTIONS = [
  "appearance",
  "models",
  "sessionPolicy",
  "notification",
  "daemon",
  "memory",
  "tools",
  "search",
  "cliTools",
  "agentIntegrations",
  "mcpServers",
  "skills",
  "sandbox",
] as const;
```

```tsx
// frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx
"use client";

import { SettingsSection } from "./settings-section";
import { useI18n } from "@/core/i18n/hooks";

export function AgentIntegrationsSettingsPage() {
  const { t } = useI18n();

  return (
    <SettingsSection
      title={t.settings.agentIntegrations.title}
      description={t.settings.agentIntegrations.description}
    >
      <div className="text-muted-foreground text-sm">
        {t.settings.agentIntegrations.empty}
      </div>
    </SettingsSection>
  );
}
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir frontend exec node --test \
  src/components/workspace/settings/settings-sections.test.ts \
  src/core/i18n/locales/settings-modules.test.ts
pnpm --dir frontend typecheck
```

Expected:
- PASS for both `node --test` files
- PASS for `typecheck`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx \
  frontend/src/components/workspace/settings/settings-sections.ts \
  frontend/src/components/workspace/settings/settings-sections.test.ts \
  frontend/src/components/workspace/settings/settings-dialog.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/core/i18n/locales/settings-modules.test.ts
git commit -F - <<'EOF'
Create a first-class settings home for ACP agent integrations

The settings shell needs a dedicated destination for ACP configuration before
runtime fields are wired. This commit adds the new section, navigation entry,
placeholder page, and locale contract only.

Constraint: ACP config must be discoverable without overloading the existing CLI tools page
Rejected: Reuse the CLI tools page | mixes host CLI allowlisting with ACP runtime config
Confidence: high
Scope-risk: narrow
Directive: Keep agent integrations separate from local CLI detection unless both screens share the same editable fields
Tested: node --test settings section and locale contract tests; frontend typecheck
Not-tested: Full frontend lint/check because unrelated notebook baseline issues already fail on this branch
EOF
```

### Task 2: Add Config-Center Schema For `acp_agents` And Memory Storage Class

**Files:**
- Create: `backend/packages/harness/nion/config/acp_config.py`
- Modify: `backend/packages/harness/nion/config/memory_config.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/app/gateway/routers/config.py`
- Create: `backend/tests/test_acp_config.py`
- Create: `backend/tests/test_memory_config.py`
- Modify: `backend/tests/test_gateway_config_api.py`

**Step 1: Write the failing tests**

Use the same store-backed test style already used by search/settings validation:

```python
# backend/tests/test_acp_config.py
from nion.config.app_config import AppConfig
from nion.config.extensions_config import ExtensionsConfig


def test_app_config_accepts_acp_agents():
    payload = {
        "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
        "acp_agents": {
            "codex": {
                "command": "npx",
                "args": ["-y", "@zed-industries/codex-acp"],
                "description": "Codex ACP adapter",
            }
        },
        "extensions": ExtensionsConfig().model_dump(),
    }

    config = AppConfig.model_validate(payload)
    assert config.acp_agents["codex"].command == "npx"
```

```python
# backend/tests/test_memory_config.py
from nion.config.memory_config import MemoryConfig


def test_memory_config_accepts_storage_class():
    config = MemoryConfig(storage_class="nion.agents.memory.storage.FileMemoryStorage")
    assert config.storage_class == "nion.agents.memory.storage.FileMemoryStorage"
```

```python
# backend/tests/test_gateway_config_api.py
assert "agent_integrations" in schema_payload["sections"]
assert "memory" in schema_payload["order"]
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest \
  tests/test_acp_config.py \
  tests/test_memory_config.py \
  tests/test_gateway_config_api.py -q
```

Expected:
- FAIL because `AppConfig` has no `acp_agents`
- FAIL because `MemoryConfig` has no `storage_class`
- FAIL because `/api/config/schema` does not describe the new sections

**Step 3: Write the minimal implementation**

Create typed ACP config and extend memory config:

```python
# backend/packages/harness/nion/config/acp_config.py
from pydantic import BaseModel, Field


class ACPAgentConfig(BaseModel):
    command: str
    args: list[str] = Field(default_factory=list)
    description: str = ""
    model: str | None = None
    auto_approve_permissions: bool = False
    env: dict[str, str] = Field(default_factory=dict)
```

```python
# backend/packages/harness/nion/config/memory_config.py
class MemoryConfig(BaseModel):
    ...
    storage_class: str = Field(
        default="nion.agents.memory.storage.FileMemoryStorage",
        description="Python class path for the active memory storage provider",
    )
```

```python
# backend/packages/harness/nion/config/app_config.py
from nion.config.acp_config import ACPAgentConfig, load_acp_config_from_dict

class AppConfig(BaseModel):
    ...
    acp_agents: dict[str, ACPAgentConfig] = Field(default_factory=dict)

    @classmethod
    def _hydrate_auxiliary_configs(cls, config_data: dict[str, Any]) -> None:
        ...
        load_acp_config_from_dict(config_data.get("acp_agents") or {})
```

**Step 4: Run tests to verify they pass**

Run:

```bash
cd backend && uv run pytest \
  tests/test_acp_config.py \
  tests/test_memory_config.py \
  tests/test_gateway_config_api.py -q
```

Expected:
- PASS for all three tests

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/acp_config.py \
  backend/packages/harness/nion/config/memory_config.py \
  backend/packages/harness/nion/config/app_config.py \
  backend/app/gateway/routers/config.py \
  backend/tests/test_acp_config.py \
  backend/tests/test_memory_config.py \
  backend/tests/test_gateway_config_api.py
git commit -F - <<'EOF'
Teach Config Center about ACP agents and memory storage providers

NION needs typed config-center fields for ACP agents and memory storage before
runtime or settings work can land safely. This commit adds the backend schema
surface and validation hooks without introducing runtime behavior yet.

Constraint: Upstream config semantics must be preserved without restoring config.yaml as the runtime source of truth
Rejected: Treat acp_agents as untyped extra config | weakens validation and makes the settings UI brittle
Confidence: high
Scope-risk: moderate
Directive: Do not expose raw Python class paths to end users without a UI-level abstraction on top
Tested: targeted pytest for ACP config, memory config, and gateway config schema
Not-tested: Full backend test suite
EOF
```

### Task 3: Add Memory Storage Abstraction Behind The Existing Memory System

**Files:**
- Create: `backend/packages/harness/nion/agents/memory/storage.py`
- Modify: `backend/packages/harness/nion/agents/memory/__init__.py`
- Modify: `backend/packages/harness/nion/agents/memory/updater.py`
- Modify: `backend/tests/test_memory_updater.py`
- Create: `backend/tests/test_memory_storage.py`

**Step 1: Write the failing tests**

Use a backend-only test first; do not touch the UI yet:

```python
# backend/tests/test_memory_storage.py
from nion.agents.memory.storage import FileMemoryStorage, get_memory_storage
from nion.config.memory_config import MemoryConfig, set_memory_config


def test_get_memory_storage_uses_configured_storage_class():
    set_memory_config(
        MemoryConfig(
            storage_class="nion.agents.memory.storage.FileMemoryStorage"
        )
    )

    storage = get_memory_storage()
    assert isinstance(storage, FileMemoryStorage)
```

```python
# backend/tests/test_memory_updater.py
with patch(
    "nion.agents.memory.updater.get_memory_storage",
    return_value=MagicMock(save=MagicMock(return_value=True)),
):
    ...
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest \
  tests/test_memory_storage.py \
  tests/test_memory_updater.py -q
```

Expected:
- FAIL because `storage.py` and `get_memory_storage()` do not exist
- FAIL because `MemoryUpdater` still writes directly to files

**Step 3: Write the minimal implementation**

Extract storage into its own module, then route updater calls through it:

```python
# backend/packages/harness/nion/agents/memory/storage.py
class MemoryStorage(abc.ABC):
    @abc.abstractmethod
    def load(self, agent_name: str | None = None) -> dict[str, Any]: ...

    @abc.abstractmethod
    def reload(self, agent_name: str | None = None) -> dict[str, Any]: ...

    @abc.abstractmethod
    def save(self, memory_data: dict[str, Any], agent_name: str | None = None) -> bool: ...


class FileMemoryStorage(MemoryStorage):
    ...


def get_memory_storage() -> MemoryStorage:
    ...
```

```python
# backend/packages/harness/nion/agents/memory/updater.py
from nion.agents.memory.storage import get_memory_storage

def get_memory_data(agent_name: str | None = None) -> dict[str, Any]:
    return get_memory_storage().load(agent_name)

def reload_memory_data(agent_name: str | None = None) -> dict[str, Any]:
    return get_memory_storage().reload(agent_name)
```

**Step 4: Run tests to verify they pass**

Run:

```bash
cd backend && uv run pytest \
  tests/test_memory_storage.py \
  tests/test_memory_updater.py -q
```

Expected:
- PASS for both files

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/agents/memory/storage.py \
  backend/packages/harness/nion/agents/memory/__init__.py \
  backend/packages/harness/nion/agents/memory/updater.py \
  backend/tests/test_memory_storage.py \
  backend/tests/test_memory_updater.py
git commit -F - <<'EOF'
Decouple memory persistence behind a storage provider interface

The upstream memory storage abstraction is useful in NION only if it stays
behind the existing memory APIs. This commit moves persistence behind a storage
provider while keeping the public updater surface stable.

Constraint: Existing memory injection and updater callers must not learn about storage provider internals
Rejected: Expose storage_class directly through every memory caller | leaks infrastructure detail into application logic
Confidence: high
Scope-risk: moderate
Directive: Add new storage backends by extending the provider layer, not by branching inside MemoryUpdater
Tested: targeted pytest for memory storage and updater behavior
Not-tested: Full memory/router integration suite
EOF
```

### Task 4: Add ACP Tool Registration Without Yet Handling Env Injection

**Files:**
- Create: `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/pyproject.toml`
- Modify: `backend/uv.lock`
- Create: `backend/tests/test_invoke_acp_agent_tool.py`
- Modify: `backend/tests/test_tool_search.py`

**Step 1: Write the failing tests**

Start with registration and missing-adapter behavior, not sandbox complexity:

```python
# backend/tests/test_tool_search.py
def test_get_available_tools_includes_invoke_acp_agent_when_agents_configured(monkeypatch):
    from nion.config.acp_config import load_acp_config_from_dict

    load_acp_config_from_dict({
        "codex": {
            "command": "npx",
            "args": ["-y", "@zed-industries/codex-acp"],
            "description": "Codex ACP adapter",
        }
    })

    tools = get_available_tools(include_mcp=True, subagent_enabled=False)
    assert "invoke_acp_agent" in [tool.name for tool in tools]
```

```python
# backend/tests/test_invoke_acp_agent_tool.py
def test_missing_acp_executable_returns_actionable_error(...):
    result = asyncio.run(tool.coroutine(agent="codex", prompt="hello"))
    assert "not found" in result.lower()
    assert "codex-acp" in result.lower()
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest \
  tests/test_invoke_acp_agent_tool.py \
  tests/test_tool_search.py -q
```

Expected:
- FAIL because `invoke_acp_agent_tool.py` does not exist
- FAIL because `get_available_tools()` never registers ACP tools

**Step 3: Write the minimal implementation**

Add the ACP dependency and register a tool only when ACP agents exist:

```python
# backend/packages/harness/nion/tools/tools.py
from nion.config.acp_config import get_acp_agents
from nion.tools.builtins.invoke_acp_agent_tool import build_invoke_acp_agent_tool

acp_agents = get_acp_agents()
if acp_agents:
    tools.append(build_invoke_acp_agent_tool(acp_agents))
```

```python
# backend/packages/harness/nion/agents/lead_agent/prompt.py
def _build_acp_section() -> str:
    agents = get_acp_agents()
    if not agents:
        return ""
    return (
        "\n**ACP Agent Tasks (invoke_acp_agent):**\n"
        "- ACP agents run in their own workspace.\n"
        "- Write self-contained prompts.\n"
    )
```

**Step 4: Run tests to verify they pass**

Run:

```bash
cd backend && uv run pytest \
  tests/test_invoke_acp_agent_tool.py \
  tests/test_tool_search.py -q
```

Expected:
- PASS for both files

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/packages/harness/pyproject.toml \
  backend/uv.lock \
  backend/tests/test_invoke_acp_agent_tool.py \
  backend/tests/test_tool_search.py
git commit -F - <<'EOF'
Introduce ACP tool registration behind explicit agent configuration

ACP support should only exist in NION when users configure real ACP adapters.
This commit adds the minimum runtime and prompt plumbing to discover and invoke
ACP agents without yet layering in environment injection.

Constraint: Do not expose ACP instructions or runtime cost when no ACP agents are configured
Rejected: Always register invoke_acp_agent | pollutes the tool surface for users who never enable ACP
Confidence: medium
Scope-risk: broad
Directive: Keep ACP registration conditional and keep prompt guidance generated from config instead of hard-coded assumptions
Tested: targeted pytest for ACP tool registration and missing adapter handling
Not-tested: Sandbox path bridging and real ACP subprocess execution
EOF
```

### Task 5: Add ACP Env Injection And Safe Permission Defaults

**Files:**
- Modify: `backend/packages/harness/nion/config/acp_config.py`
- Modify: `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
- Modify: `backend/tests/test_acp_config.py`
- Modify: `backend/tests/test_invoke_acp_agent_tool.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_acp_config.py
def test_acp_agent_config_keeps_env_mapping():
    config = ACPAgentConfig(
        command="npx",
        args=["-y", "@zed-industries/codex-acp"],
        env={"OPENAI_API_KEY": "$OPENAI_API_KEY"},
    )
    assert config.env == {"OPENAI_API_KEY": "$OPENAI_API_KEY"}
```

```python
# backend/tests/test_invoke_acp_agent_tool.py
async def test_invoke_acp_agent_passes_resolved_env(monkeypatch):
    ...
    assert captured_env["OPENAI_API_KEY"] == "test-token"
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest \
  tests/test_acp_config.py \
  tests/test_invoke_acp_agent_tool.py -q
```

Expected:
- FAIL because env fields are not forwarded to the subprocess
- FAIL because permission responses are not explicitly default-deny

**Step 3: Write the minimal implementation**

Resolve config-center env placeholders using the same app-config env resolution rules:

```python
# backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py
resolved_env = {
    key: AppConfig.resolve_env_variables(value, strict=False)
    for key, value in agent_config.env.items()
}

process_env = os.environ.copy()
process_env.update({k: v for k, v in resolved_env.items() if isinstance(v, str)})
```

```python
def _build_permission_response(options, *, auto_approve: bool) -> list[dict[str, Any]]:
    if not auto_approve:
        return [{"optionId": option.optionId, "decision": "deny"} for option in options]
    ...
```

**Step 4: Run tests to verify they pass**

Run:

```bash
cd backend && uv run pytest \
  tests/test_acp_config.py \
  tests/test_invoke_acp_agent_tool.py -q
```

Expected:
- PASS for both files

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/acp_config.py \
  backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py \
  backend/tests/test_acp_config.py \
  backend/tests/test_invoke_acp_agent_tool.py
git commit -F - <<'EOF'
Wire ACP env injection through Config Center and keep permissions default-safe

ACP adapters need explicit environment injection to be useful in NION, but that
must happen with safe defaults. This commit resolves env placeholders from the
config payload and keeps permission handling deny-by-default unless users opt in.

Constraint: ACP env injection must reuse existing config-center env resolution semantics
Rejected: Pass raw config strings directly to subprocess env | would leak unresolved placeholders and surprise users
Confidence: high
Scope-risk: moderate
Directive: Any future ACP secret handling should centralize here instead of each adapter building its own env merge logic
Tested: targeted pytest for ACP config and invoke tool env behavior
Not-tested: UI wiring for editing env rows
EOF
```

### Task 6: Add Per-Thread ACP Workspaces And Sandbox-Safe Path Bridging

**Files:**
- Modify: `backend/packages/harness/nion/config/paths.py`
- Modify: `backend/packages/harness/nion/sandbox/tools.py`
- Modify: `backend/packages/harness/nion/community/aio_sandbox/aio_sandbox_provider.py`
- Modify: `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
- Modify: `backend/tests/test_sandbox_tools_security.py`
- Create: `backend/tests/test_aio_sandbox_provider.py`
- Modify: `backend/tests/test_invoke_acp_agent_tool.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_sandbox_tools_security.py
def test_validate_local_tool_path_allows_acp_workspace_read_only():
    validate_local_tool_path("/mnt/acp-workspace/report.md", _THREAD_DATA, read_only=True)


def test_validate_local_tool_path_blocks_acp_workspace_write():
    with pytest.raises(PermissionError, match="ACP workspace"):
        validate_local_tool_path("/mnt/acp-workspace/report.md", _THREAD_DATA, read_only=False)
```

```python
# backend/tests/test_invoke_acp_agent_tool.py
async def test_invoke_acp_agent_uses_thread_scoped_acp_workspace(...):
    assert captured["cwd"].endswith("/threads/thread-xyz/acp-workspace")
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd backend && uv run pytest \
  tests/test_sandbox_tools_security.py \
  tests/test_invoke_acp_agent_tool.py \
  tests/test_aio_sandbox_provider.py -q
```

Expected:
- FAIL because `/mnt/acp-workspace` is unknown to sandbox path validation
- FAIL because ACP subprocesses do not use per-thread workspaces
- FAIL because the AIO sandbox does not mount ACP workspace paths

**Step 3: Write the minimal implementation**

Add a thread-scoped ACP workspace to `Paths`, then bridge it into sandbox tooling:

```python
# backend/packages/harness/nion/config/paths.py
def acp_workspace_dir(self, thread_id: str) -> Path:
    return self.thread_dir(thread_id) / "acp-workspace"
```

```python
# backend/packages/harness/nion/sandbox/tools.py
ACP_WORKSPACE_VIRTUAL_PREFIX = "/mnt/acp-workspace"

def _resolve_acp_workspace_path(path: str, thread_id: str) -> str:
    ...
```

```python
# backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py
work_dir = str(get_paths().acp_workspace_dir(thread_id))
```

**Step 4: Run tests to verify they pass**

Run:

```bash
cd backend && uv run pytest \
  tests/test_sandbox_tools_security.py \
  tests/test_invoke_acp_agent_tool.py \
  tests/test_aio_sandbox_provider.py -q
```

Expected:
- PASS for all targeted tests

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/sandbox/tools.py \
  backend/packages/harness/nion/community/aio_sandbox/aio_sandbox_provider.py \
  backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py \
  backend/tests/test_sandbox_tools_security.py \
  backend/tests/test_aio_sandbox_provider.py \
  backend/tests/test_invoke_acp_agent_tool.py
git commit -F - <<'EOF'
Isolate ACP workspaces per thread and expose them safely to sandboxed tools

ACP output needs a predictable, thread-scoped workspace that the lead agent can
read without opening a write path back into the adapter runtime. This commit
adds the ACP workspace path, virtual mount, and security checks.

Constraint: ACP results must be readable from the agent tool surface without granting write access to ACP workspace paths
Rejected: Reuse /mnt/user-data/workspace | couples ACP execution to the main thread workspace and muddies trust boundaries
Confidence: medium
Scope-risk: broad
Directive: Treat /mnt/acp-workspace as read-only from agent tools unless a future design explicitly revisits that trust model
Tested: targeted pytest for ACP workspace path validation, invoke tool cwd selection, and AIO sandbox mounts
Not-tested: End-to-end desktop runtime with a live ACP adapter
EOF
```

### Task 7: Build A Real Agent Integrations Settings Page

**Files:**
- Create: `frontend/src/components/workspace/settings/agent-integrations-settings-page.copy.ts`
- Create: `frontend/src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts`
- Modify: `frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/settings-modules.test.ts`

**Step 1: Write the failing tests**

Model this after the existing search settings catalog tests:

```ts
// frontend/src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentIntegrationsCopy } from "./agent-integrations-settings-page.copy";

void test("buildAgentIntegrationsCopy exposes the known ACP adapter catalog", async () => {
  const copy = buildAgentIntegrationsCopy(enUS.settings.agentIntegrations);

  assert.equal(copy.catalog.codex.commandDefault, "npx");
  assert.deepEqual(copy.catalog.codex.argsDefault, ["-y", "@zed-industries/codex-acp"]);
  assert.equal(copy.catalog.claudeCode.commandDefault, "npx");
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir frontend exec node --test \
  src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts \
  src/core/i18n/locales/settings-modules.test.ts
```

Expected:
- FAIL because the copy builder does not exist
- FAIL because the locale contract lacks full ACP page copy

**Step 3: Write the minimal implementation**

Build the page around `useConfigEditor()` and a known-adapter catalog, not around raw YAML text:

```ts
// frontend/src/components/workspace/settings/agent-integrations-settings-page.copy.ts
export function buildAgentIntegrationsCopy(source: Translations["settings"]["agentIntegrations"]) {
  return {
    page: source,
    catalog: {
      codex: {
        commandDefault: "npx",
        argsDefault: ["-y", "@zed-industries/codex-acp"],
      },
      claudeCode: {
        commandDefault: "npx",
        argsDefault: ["-y", "@zed-industries/claude-agent-acp"],
      },
    },
  };
}
```

```tsx
// frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx
const agents = asObject(draftConfig.acp_agents);
const codex = asObject(agents.codex);

onConfigChange({
  ...draftConfig,
  acp_agents: {
    ...agents,
    codex: {
      ...codex,
      command: "npx",
      args: ["-y", "@zed-industries/codex-acp"],
      auto_approve_permissions: false,
    },
  },
});
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir frontend exec node --test \
  src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts \
  src/core/i18n/locales/settings-modules.test.ts
pnpm --dir frontend typecheck
```

Expected:
- PASS for `node --test`
- PASS for `typecheck`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/settings/agent-integrations-settings-page.copy.ts \
  frontend/src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts \
  frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/core/i18n/locales/settings-modules.test.ts
git commit -F - <<'EOF'
Productize ACP configuration as a settings-driven agent integrations page

NION should let users configure ACP adapters from the settings UI instead of
editing raw config payloads. This commit adds a dedicated page, localized copy,
and a known-adapter catalog for Codex and Claude Code.

Constraint: ACP settings must map to config-center structure without exposing YAML editing as the primary workflow
Rejected: Generic key/value editor for acp_agents | too opaque for a product surface and too easy to misconfigure
Confidence: medium
Scope-risk: moderate
Directive: Add new adapters through the catalog layer first so the UI keeps safe defaults and docs links in one place
Tested: node --test for ACP settings copy and i18n contract; frontend typecheck
Not-tested: Manual browser interaction
EOF
```

### Task 8: Add Advanced Memory Storage Controls To The Memory Settings Page

**Files:**
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/settings-modules.test.ts`

**Step 1: Write the failing tests**

Use a lightweight contract test, since this page already mixes data viewing and settings behavior:

```ts
// frontend/src/components/workspace/settings/memory-settings-page.config.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page exposes storage mode controls", async () => {
  const source = await readFile(new URL("./memory-settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /storage_class/);
  assert.match(source, /customStorageClass/);
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --dir frontend exec node --test \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/core/i18n/locales/settings-modules.test.ts
```

Expected:
- FAIL because the memory settings page has no storage controls
- FAIL because the memory settings locale contract has no storage copy

**Step 3: Write the minimal implementation**

Keep `storage_class` backend-compatible, but present it as a safe mode selector:

```tsx
// frontend/src/components/workspace/settings/memory-settings-page.tsx
const {
  draftConfig,
  onConfigChange,
  ...
} = useConfigEditor();

const memoryConfig = asObject(draftConfig.memory);
const storageClass = asString(memoryConfig.storage_class).trim() ||
  "nion.agents.memory.storage.FileMemoryStorage";

const storageMode = storageClass === "nion.agents.memory.storage.FileMemoryStorage"
  ? "file"
  : "custom";
```

```tsx
<Select
  value={storageMode}
  onValueChange={(value) => {
    onConfigChange({
      ...draftConfig,
      memory: {
        ...memoryConfig,
        storage_class:
          value === "file"
            ? "nion.agents.memory.storage.FileMemoryStorage"
            : storageClass,
      },
    });
  }}
/>
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --dir frontend exec node --test \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/core/i18n/locales/settings-modules.test.ts
pnpm --dir frontend typecheck
```

Expected:
- PASS for both `node --test` files
- PASS for `typecheck`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/settings/memory-settings-page.tsx \
  frontend/src/components/workspace/settings/memory-settings-page.config.test.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/core/i18n/locales/settings-modules.test.ts
git commit -F - <<'EOF'
Expose memory storage selection without leaking raw provider internals

The backend now supports pluggable memory storage, but the product surface
should default to safe choices. This commit adds memory storage controls to the
existing memory page while keeping the backend-compatible storage_class field
behind a mode-based UI.

Constraint: End users should not need to understand Python class paths to keep memory working
Rejected: Add a raw storage_class text field as the primary control | technically correct but poor product design
Confidence: medium
Scope-risk: narrow
Directive: Keep the file-storage path as the default and treat custom storage as an advanced escape hatch
Tested: node --test for memory page config contract and i18n shape; frontend typecheck
Not-tested: Manual save/apply flow in the browser
EOF
```

### Task 9: Update Documentation And Run Final Cross-Layer Verification

**Files:**
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `backend/docs/CONFIGURATION.md`
- Modify: `frontend/README.md`

**Step 1: Write the failing verification additions**

Add one backend smoke test and one frontend source-level contract before changing docs:

```python
# backend/tests/test_gateway_config_api.py
assert "agent_integrations" in schema_payload["order"]
assert "memory" in schema_payload["sections"]
```

```ts
// frontend/src/core/i18n/locales/settings-modules.test.ts
assertSectionShape(
  "enUS.settings.agentIntegrations",
  enUS.settings.agentIntegrations,
  EXPECTED_AGENT_INTEGRATIONS_SHAPE,
);
```

**Step 2: Run verification to make sure the new surface is complete**

Run:

```bash
cd backend && uv run pytest \
  tests/test_acp_config.py \
  tests/test_memory_config.py \
  tests/test_memory_storage.py \
  tests/test_gateway_config_api.py \
  tests/test_invoke_acp_agent_tool.py \
  tests/test_sandbox_tools_security.py \
  tests/test_aio_sandbox_provider.py -q

pnpm --dir frontend exec node --test \
  src/components/workspace/settings/settings-sections.test.ts \
  src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/core/i18n/locales/settings-modules.test.ts

pnpm --dir frontend typecheck
```

Expected:
- PASS for all targeted backend tests
- PASS for all targeted frontend tests
- PASS for frontend typecheck

**Step 3: Write the documentation updates**

Document the new product surfaces explicitly:

```md
## Agent Integrations

NION exposes ACP adapters through Settings → Agent Integrations.
The runtime config lives in Config Center under `acp_agents`; users should not
edit `config.yaml` to enable Codex or Claude Code adapters in normal workflows.
```

```md
## Memory Storage

Memory persistence remains file-backed by default. Advanced users can switch the
provider through Settings → Memory, which maps to `memory.storage_class` in the
stored config payload.
```

**Step 4: Run the verification again**

Run:

```bash
cd backend && uv run pytest \
  tests/test_acp_config.py \
  tests/test_memory_config.py \
  tests/test_memory_storage.py \
  tests/test_gateway_config_api.py \
  tests/test_invoke_acp_agent_tool.py \
  tests/test_sandbox_tools_security.py \
  tests/test_aio_sandbox_provider.py -q

pnpm --dir frontend exec node --test \
  src/components/workspace/settings/settings-sections.test.ts \
  src/components/workspace/settings/agent-integrations-settings-page.copy.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/core/i18n/locales/settings-modules.test.ts

pnpm --dir frontend typecheck
```

Expected:
- PASS on both reruns

**Step 5: Commit**

```bash
git add \
  backend/README.md \
  backend/CLAUDE.md \
  backend/docs/CONFIGURATION.md \
  frontend/README.md \
  backend/tests/test_gateway_config_api.py \
  frontend/src/core/i18n/locales/settings-modules.test.ts
git commit -F - <<'EOF'
Document ACP and memory provider settings as Config Center features

The code changes are only safe if future engineers understand that ACP and
memory provider configuration now belong to Config Center and settings pages,
not to handwritten config.yaml edits. This commit updates the docs and final
verification contracts accordingly.

Constraint: Documentation must steer contributors toward Config Center as the runtime source of truth
Rejected: Leave docs unchanged until after implementation lands everywhere | invites regressions and YAML backsliding
Confidence: high
Scope-risk: narrow
Directive: Any future upstream config sync should map new config semantics into settings pages before reintroducing raw config editing flows
Tested: targeted backend and frontend verification suite listed in the task
Not-tested: Full repository-wide frontend lint because unrelated notebook issues already fail on this branch
EOF
```

## Final Verification Checklist

- Backend config validation accepts `acp_agents` and `memory.storage_class`.
- Memory updater reads and writes through `get_memory_storage()`.
- ACP tool only appears when ACP agents are configured.
- ACP subprocesses receive resolved env values.
- ACP workspace is thread-scoped and read-only from agent tools.
- Settings dialog exposes `agentIntegrations`.
- Agent Integrations page edits `acp_agents` through Config Center.
- Memory page exposes a safe storage mode UI instead of raw provider internals.
- Docs explicitly tell contributors to map config semantics into settings pages instead of reviving `config.yaml`.

## Changed Files Summary

- Backend config: `backend/packages/harness/nion/config/acp_config.py`, `backend/packages/harness/nion/config/memory_config.py`, `backend/packages/harness/nion/config/app_config.py`
- Backend runtime: `backend/packages/harness/nion/agents/memory/storage.py`, `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`, `backend/packages/harness/nion/sandbox/tools.py`, `backend/packages/harness/nion/config/paths.py`
- Frontend settings: `frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx`, `frontend/src/components/workspace/settings/memory-settings-page.tsx`, `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Tests: targeted backend pytest files plus frontend `node:test` contract files listed in each task
- Docs: `backend/README.md`, `backend/CLAUDE.md`, `backend/docs/CONFIGURATION.md`, `frontend/README.md`

## Risks To Watch While Executing

- ACP subprocess execution will be the highest-risk area because it crosses config, tool runtime, sandbox, and path security at once.
- The memory settings page already mixes viewer behavior and configuration; keep the storage controls visually secondary so the page does not collapse into an infrastructure panel.
- Do not let the UI become a generic JSON editor for ACP settings. The known-adapter catalog is the product boundary that keeps this maintainable.
