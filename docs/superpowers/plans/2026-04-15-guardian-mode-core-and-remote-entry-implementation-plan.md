# Guardian Mode Core And Remote Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Nion 值守模式落成首个可交付切片：让 daemon/bridge 生命周期、bridge 入口合同、远程工作目录语义和值守状态产品面形成一致、可测试、可验证的主链。

**Architecture:** 本计划只做 PRD 的第一个可落地子项目，不试图一次实现全部值守模式。重点是修正当前实现中的三个关键产品缺口：bridge 生命周期与值守状态合同、`bridge` surface 与权限过滤合同、以及 bridge `workingDirectory` 未真正进入执行上下文的问题；同时把桌面产品面从“后台开关”提升为“值守状态 + 统一远程入口”视角。

**Tech Stack:** Python 3.12, FastAPI, pytest, Electron main process, Node.js test runner, React/Next.js, TypeScript

---

## Scope Check

这份 spec 已经跨了多个独立子系统：

- daemon / bridge 生命周期
- thread runtime / host_workdir 合同
- surface policy / 权限边界
- 桌面产品面重命名与状态聚合
- 未来的受控本机动作与 richer channel 交互

按 `writing-plans` 的规则，不应把这些全部塞进单一执行计划。  
本计划只覆盖首个可独立交付、可测试的软件切片：

- guardian mode 基础生命周期
- bridge 统一入口合同修正
- 远程工作目录主链接通
- 桌面值守状态与入口状态页面收口

不在本计划内：

- 多用户/团队
- 独立 Web 控制台
- richer 卡片设计
- 本机高权限动作
- 后续 channel L2/L3 深化

---

## Read This First

- [2026-04-15-nion-guardian-mode-unified-remote-entry-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-nion-guardian-mode-unified-remote-entry-design.md)
- [desktop/src/main/config.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/config.ts)
- [desktop/src/main/daemon-launcher.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/daemon-launcher.ts)
- [desktop/src/main/index.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/index.ts)
- [desktop/src/main/bridge/bridge-manager.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/bridge/bridge-manager.ts)
- [desktop/src/main/bridge/nion-thread-client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/bridge/nion-thread-client.ts)
- [backend/app/daemon/service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py)
- [backend/app/daemon/routers/runtime.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/routers/runtime.py)
- [backend/packages/harness/nion/tools/tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py)
- [backend/packages/harness/nion/threads/service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py)
- [frontend/src/components/workspace/settings/daemon-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/daemon-settings-page.tsx)
- [frontend/src/components/workspace/bridge/BridgeLayout.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/bridge/BridgeLayout.tsx)

---

## File Map

### Daemon runtime and guardian status contract

- Modify: `backend/app/daemon/service.py`
- Modify: `backend/app/daemon/routers/runtime.py`
- Modify: `backend/tests/test_local_daemon_api.py`
- Create: `backend/tests/test_guardian_mode_runtime_info.py`

Responsibility:

- extend daemon runtime info so frontend can render guardian-mode product status instead of a single boolean switch
- expose whether bridge runtime is available/running from desktop shell without inventing a second control plane

### Bridge lifecycle and remote-entry execution contract

- Modify: `desktop/src/main/bridge/nion-thread-client.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Create: `desktop/tests/bridge-thread-client.contract.test.mjs`

Responsibility:

- pass `execution_mode` / `host_workdir` into bridge-triggered thread streams
- ensure guardian/bridge settings are sourced from one place and reflected back into runtime state

### Surface policy and permission boundary contract

- Modify: `backend/packages/harness/nion/config/surface_policy_config.py`
- Modify: `backend/tests/test_surface_policy_config.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Create: `backend/tests/test_bridge_surface_policy.py`

Responsibility:

- make `bridge` a first-class surface contract instead of silently falling through to “unrestricted”
- keep existing `channel` behavior compatible while aligning bridge semantics with the product model

### Desktop product surface

- Modify: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Modify: `frontend/src/core/bridge/client.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Create: `frontend/src/components/workspace/settings/guardian-mode-status-card.tsx`
- Create: `frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.tsx`
- Create: `frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.tsx`

Responsibility:

- rename/reframe daemon settings into guardian mode language
- surface unified remote entry and runtime health without introducing a separate control console

### Docs sync

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

Responsibility:

- keep user-facing and developer-facing docs aligned with the new guardian-mode contract

---

## Task 1: Freeze bridge surface policy as an explicit runtime contract

**Files:**
- Modify: `backend/tests/test_surface_policy_config.py`
- Create: `backend/tests/test_bridge_surface_policy.py`
- Modify: `backend/packages/harness/nion/config/surface_policy_config.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`

- [ ] **Step 1: Write the failing config test for bridge surface aliasing**

```python
from nion.config.surface_policy_config import SurfacePolicyConfig, SurfaceRule


def test_surface_policy_can_alias_bridge_to_channel_rule():
    cfg = SurfacePolicyConfig(
        rules={
            "channel": SurfaceRule(
                allowed_groups=["web", "file:read"],
                denied_tools=["bash", "write_file", "str_replace"],
            )
        }
    )

    rule = cfg.get_rule("bridge")

    assert rule.allowed_groups == ["web", "file:read"]
    assert rule.denied_tools == ["bash", "write_file", "str_replace"]
```

- [ ] **Step 2: Write the failing tool filtering test for bridge surface**

```python
from types import SimpleNamespace

from nion.config.surface_policy_config import SurfacePolicyConfig, SurfaceRule
from nion.tools.tools import _apply_surface_policy


def test_bridge_surface_uses_channel_policy_for_configured_tools():
    config = SimpleNamespace(
        surface_policy=SurfacePolicyConfig(
            rules={
                "channel": SurfaceRule(
                    allowed_groups=["web", "file:read"],
                    denied_tools=["bash", "write_file", "str_replace"],
                )
            }
        )
    )

    web_tool = SimpleNamespace(name="web_search")
    write_tool = SimpleNamespace(name="write_file")
    catalog = {
        "web_search": SimpleNamespace(group="web", policy_managed=True),
        "write_file": SimpleNamespace(group="file:write", policy_managed=True),
    }

    filtered = _apply_surface_policy(config, "bridge", [web_tool, write_tool], catalog)

    assert [tool.name for tool in filtered] == ["web_search"]
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
python3 -m pytest \
  backend/tests/test_surface_policy_config.py \
  backend/tests/test_bridge_surface_policy.py -q
```

Expected:

- FAIL because `bridge` currently resolves to an empty rule and `_apply_surface_policy()` therefore does not enforce the intended boundary

- [ ] **Step 4: Implement bridge-aware rule lookup**

```python
from pydantic import BaseModel, Field


class SurfaceRule(BaseModel):
    allowed_groups: list[str] | None = Field(default=None)
    denied_groups: list[str] = Field(default_factory=list)
    allowed_tools: list[str] | None = Field(default=None)
    denied_tools: list[str] = Field(default_factory=list)


class SurfacePolicyConfig(BaseModel):
    rules: dict[str, SurfaceRule] = Field(default_factory=dict)

    def get_rule(self, surface: str) -> SurfaceRule:
        if surface in self.rules:
            return self.rules[surface]
        if surface == "bridge" and "channel" in self.rules:
            return self.rules["channel"]
        return SurfaceRule()
```

- [ ] **Step 5: Keep `_apply_surface_policy()` strict and unchanged except for bridge-aware tests**

```python
def _apply_surface_policy(
    config,
    surface: str,
    loaded_tools: list[BaseTool],
    catalog: dict[str, ToolCatalogEntry],
) -> list[BaseTool]:
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
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
python3 -m pytest \
  backend/tests/test_surface_policy_config.py \
  backend/tests/test_bridge_surface_policy.py -q
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add \
  backend/packages/harness/nion/config/surface_policy_config.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/tests/test_surface_policy_config.py \
  backend/tests/test_bridge_surface_policy.py
git commit -m "fix: align bridge surface policy with channel rules"
```

---

## Task 2: Pass bridge working directory and execution mode into the runtime mainline

**Files:**
- Modify: `desktop/src/main/bridge/nion-thread-client.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Create: `desktop/tests/bridge-thread-client.contract.test.mjs`

- [ ] **Step 1: Write the failing contract test for bridge stream payload**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge thread client includes execution mode and host workdir in stream context", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/nion-thread-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /execution_mode:\s*options\?\.executionMode/);
  assert.match(source, /host_workdir:\s*options\?\.hostWorkdir/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test desktop/tests/bridge-thread-client.contract.test.mjs
```

Expected:

- FAIL because the current stream context only includes `surface`, `model_name`, and `is_plan_mode`

- [ ] **Step 3: Extend thread client options and stream payload**

```typescript
type ThreadStreamOptions = {
  modelName?: string;
  planMode?: boolean;
  executionMode?: "sandbox" | "host";
  hostWorkdir?: string | null;
  signal?: AbortSignal;
};

const streamMessage = async (
  threadId: string,
  text: string,
  callbacks?: ThreadStreamCallbacks,
  options?: ThreadStreamOptions,
): Promise<ThreadStreamResult> => {
  const response = await fetch(`${threadsBaseUrl}/${threadId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: text }],
      context: {
        surface: "bridge",
        model_name: options?.modelName,
        is_plan_mode: options?.planMode ?? false,
        execution_mode: options?.executionMode,
        host_workdir: options?.hostWorkdir ?? undefined,
      },
      config: {},
    }),
  });
  if (!response.ok) {
    throw new Error(`Thread stream failed with status ${response.status}`);
  }
  return consumeSSE(response, callbacks);
};
```

- [ ] **Step 4: Thread binding working directory through bridge manager**

```typescript
const result = await threadClient.streamMessage(
  binding.threadId,
  sanitized.text,
  streamCallbacks,
  {
    modelName: binding.model || undefined,
    planMode: binding.mode === "plan",
    executionMode: binding.workingDirectory ? "host" : "sandbox",
    hostWorkdir: binding.workingDirectory || null,
    signal: taskAbort.signal,
  },
);
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
node --test desktop/tests/bridge-thread-client.contract.test.mjs
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  desktop/src/main/bridge/nion-thread-client.ts \
  desktop/src/main/bridge/bridge-manager.ts \
  desktop/tests/bridge-thread-client.contract.test.mjs
git commit -m "feat: carry bridge workdir into runtime context"
```

---

## Task 3: Expose guardian-mode runtime info instead of a single background-running boolean

**Files:**
- Modify: `backend/app/daemon/service.py`
- Modify: `backend/app/daemon/routers/runtime.py`
- Create: `backend/tests/test_guardian_mode_runtime_info.py`
- Modify: `backend/tests/test_local_daemon_api.py`

- [ ] **Step 1: Write the failing API test for guardian runtime info fields**

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_runtime_info_exposes_guardian_status_fields() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/runtime-info")

    assert response.status_code == 200
    payload = response.json()
    assert payload["guardian_mode"]["enabled"] is True
    assert payload["guardian_mode"]["window_required"] is False
    assert "bridge_runtime" in payload
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m pytest \
  backend/tests/test_local_daemon_api.py \
  backend/tests/test_guardian_mode_runtime_info.py -q
```

Expected:

- FAIL because the current response does not include `guardian_mode` or `bridge_runtime`

- [ ] **Step 3: Extend daemon runtime payload**

```python
def runtime_info(self) -> dict[str, Any]:
    counts = self.registry.snapshot()
    return {
        "mode": "local-daemon",
        "host": self.host,
        "port": self.port,
        "base_url": self.base_url,
        "health_url": self.health_url,
        "working_directory": os.getcwd(),
        "allow_background_running": self.allow_background_running,
        "shutdown_grace_period_seconds": self.shutdown_grace_period_seconds,
        "clients": counts,
        "guardian_mode": {
            "enabled": bool(self.allow_background_running),
            "window_required": False,
            "status": "busy" if self.has_active_runtime_work() else "standing_by",
        },
        "bridge_runtime": {
            "available": True,
            "running": None,
        },
    }
```

- [ ] **Step 4: Update response model to match**

```python
class GuardianModeRuntimeInfo(BaseModel):
    enabled: bool
    window_required: bool
    status: str


class BridgeRuntimeInfo(BaseModel):
    available: bool
    running: bool | None = None


class DaemonRuntimeInfoResponse(BaseModel):
    mode: str
    host: str
    port: int
    base_url: str
    health_url: str
    working_directory: str
    allow_background_running: bool
    shutdown_grace_period_seconds: int = Field(ge=1, le=10)
    clients: RuntimeClientCounts = Field(default_factory=RuntimeClientCounts)
    guardian_mode: GuardianModeRuntimeInfo
    bridge_runtime: BridgeRuntimeInfo
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
python3 -m pytest \
  backend/tests/test_local_daemon_api.py \
  backend/tests/test_guardian_mode_runtime_info.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/app/daemon/service.py \
  backend/app/daemon/routers/runtime.py \
  backend/tests/test_local_daemon_api.py \
  backend/tests/test_guardian_mode_runtime_info.py
git commit -m "feat: expose guardian mode runtime status"
```

---

## Task 4: Reframe daemon settings as guardian mode in the desktop product surface

**Files:**
- Modify: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/guardian-mode-status-card.tsx`
- Create: `frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.tsx`
- Modify: `frontend/src/core/bridge/client.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`

- [ ] **Step 1: Write the failing contract test for guardian copy and status card**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("guardian mode settings page uses guardian terminology and renders status card", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /GuardianModeStatusCard/);
  assert.match(source, /guardian/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.tsx
```

Expected:

- FAIL because the page currently only renders a switch card

- [ ] **Step 3: Add a focused guardian status card component**

```tsx
type GuardianModeStatusCardProps = {
  enabled: boolean;
  status: "standing_by" | "busy" | "offline";
  description: string;
};

export function GuardianModeStatusCard({
  enabled,
  status,
  description,
}: GuardianModeStatusCardProps) {
  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="text-sm font-medium">Guardian Mode</div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <div className="mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
        {enabled ? status : "disabled"}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add a desktop runtime info helper that reads the real guardian runtime**

```typescript
export type DesktopGuardianRuntimeInfo = {
  mode: "local-daemon";
  baseUrl: string;
  healthUrl: string;
  workingDirectory: string | null;
  clientId: string | null;
  allowBackgroundRunning: boolean;
  guardianMode?: {
    enabled: boolean;
    window_required: boolean;
    status: string;
  };
  bridgeRuntime?: {
    available: boolean;
    running: boolean | null;
  };
};

export async function getDesktopRuntimeInfo(): Promise<DesktopGuardianRuntimeInfo | null> {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge?.getRuntimeInfo) {
    return null;
  }
  return desktopBridge.getRuntimeInfo() as Promise<DesktopGuardianRuntimeInfo>;
}
```

- [ ] **Step 5: Consume real runtime info on the daemon settings page**

```tsx
const [runtimeStatus, setRuntimeStatus] = useState<"standing_by" | "busy" | "offline">("offline");

useEffect(() => {
  let mounted = true;
  void getDesktopRuntimeInfo().then((runtimeInfo) => {
    if (!mounted || !runtimeInfo?.guardianMode?.enabled) {
      return;
    }
    setRuntimeStatus(
      runtimeInfo.guardianMode.status === "busy" ? "busy" : "standing_by",
    );
  });
  return () => {
    mounted = false;
  };
}, []);

<SettingsSection
  title={t.settings.daemon.title}
  description={t.settings.daemon.description}
>
  <GuardianModeStatusCard
    enabled={allowBackgroundRunning}
    status={allowBackgroundRunning ? runtimeStatus : "offline"}
    description={t.settings.daemon.allowBackgroundRunningHint}
  />
  <div className="flex items-center justify-between rounded-xl border bg-background/80 p-4 shadow-sm">
    <div className="space-y-1">
      <div className="text-sm font-medium">
        {t.settings.daemon.allowBackgroundRunningLabel}
      </div>
      <div className="text-muted-foreground text-sm">
        {t.settings.daemon.allowBackgroundRunningHint}
      </div>
    </div>
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
  </div>
</SettingsSection>
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
node --test frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.tsx
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add \
  frontend/src/components/workspace/settings/daemon-settings-page.tsx \
  frontend/src/components/workspace/settings/guardian-mode-status-card.tsx \
  frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.tsx \
  frontend/src/core/bridge/client.ts \
  frontend/src/core/api/desktop-client.ts
git commit -m "feat: present daemon settings as guardian mode"
```

---

## Task 5: Reframe bridge page as a unified remote entry surface

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Create: `frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.tsx`
- Modify: `frontend/src/app/workspace/bridge/page.tsx`

- [ ] **Step 1: Write the failing copy contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("bridge layout uses unified remote entry language", async () => {
  const source = await readFile(
    new URL("./BridgeLayout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Remote Entry|Unified Remote Entry|Guardian/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.tsx
```

Expected:

- FAIL because the current bridge page is platform-first navigation with no unified guardian framing

- [ ] **Step 3: Add guardian-oriented page header and entrance summary**

```tsx
<WorkspacePageHeader
  title="Remote Entry"
  description="Manage the channels that can reach this guardian-mode computer."
/>

<div className="mb-6 rounded-2xl border border-border/60 bg-background px-5 py-4">
  <h2 className="text-sm font-semibold">Unified Remote Entry</h2>
  <p className="mt-1 text-sm text-muted-foreground">
    Every connected channel reaches the same computer, tasks, and confirmation queue.
  </p>
</div>
```

- [ ] **Step 4: Keep the per-platform sections, but make them secondary**

```tsx
<div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background">
  <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border/50 p-3">
    {/* existing platform tabs remain */}
  </nav>

  <div className="flex-1 overflow-auto p-6">
    {/* existing platform sections remain */}
  </div>
</div>
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
node --test frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/workspace/bridge/BridgeLayout.tsx \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.tsx \
  frontend/src/app/workspace/bridge/page.tsx
git commit -m "feat: frame bridge settings as unified remote entry"
```

---

## Task 6: Sync docs and run focused verification

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update user-facing docs for guardian mode positioning**

```md
- Guardian Mode is the user-facing product surface for the local daemon
- Closing the desktop window no longer implies that remote entry or scheduled work stops
- Connected channels are unified remote entry points into the same computer and task system
```

- [ ] **Step 2: Update backend/dev docs for new runtime contract**

```md
- `bridge` is a first-class runtime surface and inherits `channel` surface policy unless explicitly overridden
- bridge-triggered runs may now carry `execution_mode` and `host_workdir` from the binding contract
- daemon runtime info publishes guardian-mode product status fields for desktop UI consumers
```

- [ ] **Step 3: Run focused verification**

Run:

```bash
python3 -m pytest \
  backend/tests/test_surface_policy_config.py \
  backend/tests/test_bridge_surface_policy.py \
  backend/tests/test_local_daemon_api.py \
  backend/tests/test_guardian_mode_runtime_info.py -q
```

Expected:

- PASS

Run:

```bash
node --test \
  desktop/tests/daemon-launcher.test.mjs \
  desktop/tests/bridge-thread-client.contract.test.mjs \
  frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.tsx \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.tsx
```

Expected:

- PASS

- [ ] **Step 4: Commit**

```bash
git add \
  README.md \
  backend/CLAUDE.md \
  docs/test/README.md
git commit -m "docs: align guardian mode and remote entry contracts"
```

---

## Spec Coverage Check

This plan covers these spec requirements:

- guardian mode is the product surface instead of raw daemon language
- bridge and channel semantics unify under one remote-entry contract
- bridge workdir becomes real runtime context instead of a dead binding field
- guardian/bridge state becomes visible in the desktop product surface
- first implementation slice favors “value + trust” over rich remote-control features

Intentionally deferred from the spec:

- independent Web control console
- multi-user or team semantics
- L2/L3 richer channel UX rollout
- controlled local actions like screenshots or file organization
- tray/menubar shell work

These should be planned in follow-up implementation plans after this slice lands.

## Placeholder Scan

Checked for:

- `TBD`
- `TODO`
- vague “handle appropriately” steps
- missing commands
- missing code blocks

No placeholders remain in this plan.

## Type Consistency Check

Verified consistent naming across tasks:

- `bridge` surface aliases to `channel`
- `execution_mode`
- `host_workdir`
- `guardian_mode`
- `bridge_runtime`

No conflicting function or field names remain across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-guardian-mode-core-and-remote-entry-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
