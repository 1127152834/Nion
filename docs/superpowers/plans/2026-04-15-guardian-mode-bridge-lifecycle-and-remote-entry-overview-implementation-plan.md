# Guardian Mode Bridge Lifecycle And Remote Entry Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Nion 值守模式推进到第二个可交付切片：让 bridge 生命周期更接近 daemon-owned standby runtime，并把 `/workspace/bridge` 从“平台配置页集合”继续收口成统一远程入口总览与诊断面。

**Architecture:** 这份计划建立在 `2026-04-15-guardian-mode-core-and-remote-entry-implementation-plan.md` 已落地的 slice 1 之上，不重复处理 bridge surface policy、runtime-info guardian summary、或 settings guardian card。重点是把 bridge 运行态从“Electron main 中的一组操作句柄”提升为具有更清晰 owner contract 的 guardian runtime lane，同时给前端补一个真正的 remote-entry overview/diagnostics 页面骨架，使“同一台电脑 / 同一组任务 / 同一个确认队列”的产品叙事不止停留在页头 copy。

**Tech Stack:** Electron main process, TypeScript, Node.js contract tests, React/Next.js, desktop preload IPC, bridge incidents store, bridge observations store

---

## Scope Check

现有 guardian mode 设计文档还覆盖了更多后续主题：

- 受控本机动作（截图/整理文件）
- 独立 Web 控制台
- 多用户/团队/群组
- richer channel L2/L3 交互

这些都不在本计划内。  
本计划只做 slice 2：

- bridge lifecycle ownership 更清晰
- guardian runtime 与 bridge runtime 状态总览
- `/workspace/bridge` 总览/诊断面

不在本计划内：

- 本机高权限动作
- 独立 Web 控制台
- 多用户与团队协作
- 各平台 section 深度重做
- Chat / Notebook / Knowledge 产品面

---

## Read This First

- [2026-04-15-nion-guardian-mode-unified-remote-entry-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-nion-guardian-mode-unified-remote-entry-design.md)
- [2026-04-15-guardian-mode-core-and-remote-entry-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-15-guardian-mode-core-and-remote-entry-implementation-plan.md)
- [desktop/src/main/index.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/index.ts)
- [desktop/src/main/bridge/bridge-manager.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/bridge/bridge-manager.ts)
- [desktop/src/main/bridge/incident-playbooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/bridge/incident-playbooks.ts)
- [desktop/src/shared/bridge-ipc.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/shared/bridge-ipc.ts)
- [frontend/src/core/bridge/client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/bridge/client.ts)
- [frontend/src/components/workspace/bridge/BridgeLayout.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/bridge/BridgeLayout.tsx)
- [frontend/src/components/workspace/bridge/bridge-shared.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/bridge/bridge-shared.tsx)

---

## File Map

### Desktop bridge lifecycle ownership

- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Create: `desktop/tests/bridge-runtime-lifecycle.contract.test.mjs`

Responsibility:

- define an app-native guardian/bridge lifecycle contract instead of leaving bridge start/stop semantics spread across ad hoc IPC handlers
- expose a product-facing runtime snapshot that can be consumed without inferring behavior from multiple separate calls

### Bridge runtime overview / diagnostics client contract

- Modify: `frontend/src/core/bridge/client.ts`
- Create: `frontend/src/core/bridge/overview.test.ts`

Responsibility:

- add a bridge-overview level client contract for summary + diagnostics data
- keep existing per-platform APIs intact

### Remote entry overview surface

- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Create: `frontend/src/components/workspace/bridge/BridgeOverviewPanel.tsx`
- Create: `frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/bridge/bridge-shared.tsx`

Responsibility:

- add a true overview block that shows runtime status, enabled platforms, active bindings, incidents summary, and pending risk hints before the platform tabs
- keep platform configuration sections available as secondary detail panes

### Docs sync

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

Responsibility:

- document slice 2 lifecycle/overview changes and associated verification matrix

---

## Task 1: Freeze a single bridge runtime snapshot contract in desktop IPC

**Files:**
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Modify: `desktop/src/main/index.ts`
- Create: `desktop/tests/bridge-runtime-lifecycle.contract.test.mjs`

- [ ] **Step 1: Write the failing contract test for bridge runtime snapshot exposure**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("desktop bridge IPC exposes one runtime snapshot contract", async () => {
  const source = await readFile(
    new URL("../src/shared/bridge-ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /bridgeRuntimeInfo:/);
  assert.match(source, /DesktopBridgeRuntimeInfo/);
});
```

- [ ] **Step 2: Write the failing contract test for main-process handler**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("desktop main process serves bridge runtime snapshot through one IPC handler", async () => {
  const source = await readFile(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.bridgeRuntimeInfo/);
  assert.match(source, /getBridgeRuntimeInfo/);
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test desktop/tests/bridge-runtime-lifecycle.contract.test.mjs
```

Expected:

- FAIL because no unified bridge runtime snapshot contract exists yet

- [ ] **Step 4: Add the IPC type and channel**

```typescript
export const DESKTOP_BRIDGE_IPC_CHANNELS = {
  // existing fields...
  bridgeRuntimeInfo: "bridge:get-runtime-info",
} as const;

export type DesktopBridgeRuntimeInfo = {
  running: boolean;
  autoStartEnabled: boolean;
  enabledPlatforms: string[];
  activeBindings: number;
  openIncidents: number;
  startedAt: string | null;
};
```

- [ ] **Step 5: Add one main-process handler that assembles the snapshot**

```typescript
const getBridgeRuntimeInfo = () => ({
  running: bridgeManager.getStatus().running,
  autoStartEnabled: bridgeSettingsCache.bridge_auto_start === "true",
  enabledPlatforms: bridgeManager.getStatus().enabledPlatforms,
  activeBindings: bridgeBindingsStore.listBindings().filter((item) => item.active).length,
  openIncidents: bridgeIncidentsStore
    .listIncidents({ status: "open", limit: 200 })
    .length,
  startedAt: bridgeManager.getStatus().startedAt,
});

ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.bridgeRuntimeInfo, () => {
  return getBridgeRuntimeInfo();
});
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test desktop/tests/bridge-runtime-lifecycle.contract.test.mjs
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add \
  desktop/src/shared/bridge-ipc.ts \
  desktop/src/main/index.ts \
  desktop/tests/bridge-runtime-lifecycle.contract.test.mjs
git commit -m "feat: expose a unified bridge runtime snapshot over desktop IPC"
```

---

## Task 2: Make bridge overview data first-class in the frontend client

**Files:**
- Modify: `frontend/src/core/bridge/client.ts`
- Create: `frontend/src/core/bridge/overview.test.ts`

- [ ] **Step 1: Write the failing client contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge client exposes bridge runtime overview loader", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /export type BridgeRuntimeInfo =/);
  assert.match(source, /getRuntimeInfo\(\): Promise<BridgeRuntimeInfo>/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/bridge/overview.test.ts
```

Expected:

- FAIL because no bridge runtime overview client exists yet

- [ ] **Step 3: Add the bridge overview type and client method**

```typescript
export type BridgeRuntimeInfo = {
  running: boolean;
  autoStartEnabled: boolean;
  enabledPlatforms: string[];
  activeBindings: number;
  openIncidents: number;
  startedAt: string | null;
};

export type BridgeClient = {
  getRuntimeInfo(): Promise<BridgeRuntimeInfo>;
  // existing methods...
};
```

- [ ] **Step 4: Wire the desktop bridge implementation**

```typescript
getRuntimeInfo: () => {
  if (!bridge?.getRuntimeInfo) {
    return Promise.reject(new Error("Bridge runtime info is unavailable"));
  }
  return bridge.getRuntimeInfo();
},
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/bridge/overview.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/core/bridge/client.ts \
  frontend/src/core/bridge/overview.test.ts
git commit -m "feat: add bridge runtime overview client contract"
```

---

## Task 3: Add a bridge overview panel above per-platform tabs

**Files:**
- Create: `frontend/src/components/workspace/bridge/BridgeOverviewPanel.tsx`
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Create: `frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/bridge/bridge-shared.tsx`

- [ ] **Step 1: Write the failing panel contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge overview panel shows guardian runtime, bindings, incidents, and platform counts", async () => {
  const source = await readFile(
    new URL("./BridgeOverviewPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /runtimeInfo/);
  assert.match(source, /activeBindings/);
  assert.match(source, /openIncidents/);
  assert.match(source, /enabledPlatforms/);
});
```

- [ ] **Step 2: Write the failing layout contract for overview-panel integration**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge layout renders overview panel before platform tabs", async () => {
  const source = await readFile(new URL("./BridgeLayout.tsx", import.meta.url), "utf8");

  assert.match(source, /<BridgeOverviewPanel/);
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts
```

Expected:

- FAIL because `BridgeOverviewPanel` does not exist yet

- [ ] **Step 4: Add the overview panel component**

```tsx
type BridgeOverviewPanelProps = {
  runtimeInfo: BridgeRuntimeInfo | null;
};

export function BridgeOverviewPanel({ runtimeInfo }: BridgeOverviewPanelProps) {
  const { t } = useBridgeTranslation();

  return (
    <div className="mb-6 rounded-2xl border border-border/60 bg-background p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {t("bridge.overviewRuntimeLabel")}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {runtimeInfo?.running ? t("bridge.overviewRuntimeRunning") : t("bridge.overviewRuntimeStopped")}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {t("bridge.overviewBindingsLabel")}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {runtimeInfo?.activeBindings ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {t("bridge.overviewIncidentsLabel")}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {runtimeInfo?.openIncidents ?? 0}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {t("bridge.overviewPlatformsLabel")}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {runtimeInfo?.enabledPlatforms.length ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Load overview data in the layout and render the panel**

```tsx
const [runtimeInfo, setRuntimeInfo] = useState<BridgeRuntimeInfo | null>(null);

useEffect(() => {
  let cancelled = false;

  void getBridgeClient()?.getRuntimeInfo().then((payload) => {
    if (!cancelled) {
      setRuntimeInfo(payload);
    }
  }).catch(() => {
    if (!cancelled) {
      setRuntimeInfo(null);
    }
  });

  return () => {
    cancelled = true;
  };
}, []);

<BridgeOverviewPanel runtimeInfo={runtimeInfo} />
```

- [ ] **Step 6: Add minimal translation keys for the overview panel**

```typescript
"bridge.overviewRuntimeLabel": "Runtime",
"bridge.overviewRuntimeRunning": "Running",
"bridge.overviewRuntimeStopped": "Stopped",
"bridge.overviewBindingsLabel": "Active bindings",
"bridge.overviewIncidentsLabel": "Open incidents",
"bridge.overviewPlatformsLabel": "Enabled platforms",
```

- [ ] **Step 7: Run tests to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 8: Commit**

```bash
git add \
  frontend/src/components/workspace/bridge/BridgeOverviewPanel.tsx \
  frontend/src/components/workspace/bridge/BridgeLayout.tsx \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-shared.tsx
git commit -m "feat: add guardian remote-entry overview panel"
```

---

## Task 4: Surface diagnostics-center entrypoints from the overview panel

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeOverviewPanel.tsx`
- Modify: `frontend/src/core/bridge/client.ts`
- Create: `frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts`

- [ ] **Step 1: Write the failing action contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge overview panel exposes diagnostics and restart actions", async () => {
  const source = await readFile(
    new URL("./BridgeOverviewPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /diagnose/);
  assert.match(source, /runAction/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
```

Expected:

- FAIL because overview panel has no action surface yet

- [ ] **Step 3: Add overview-level action affordances**

```tsx
<div className="mt-4 flex flex-wrap gap-2">
  <Button
    type="button"
    variant="outline"
    onClick={() => void onDiagnose()}
  >
    {t("bridge.overviewDiagnoseAction")}
  </Button>
  <Button
    type="button"
    variant="outline"
    onClick={() => void onRestart()}
  >
    {t("bridge.overviewRestartAction")}
  </Button>
</div>
```

- [ ] **Step 4: Implement `onDiagnose` and `onRestart` using existing bridge client methods**

```typescript
const client = getBridgeClient();

const onDiagnose = async () => {
  if (!client) return;
  await client.diagnose({ source: "bridge_page" });
};

const onRestart = async () => {
  if (!client) return;
  await client.start();
};
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/workspace/bridge/BridgeOverviewPanel.tsx \
  frontend/src/core/bridge/client.ts \
  frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
git commit -m "feat: add overview-level bridge diagnostics actions"
```

---

## Task 5: Sync slice 2 docs and run focused verification

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update README for guardian bridge lifecycle and overview**

```md
- Guardian Mode slice 2 introduces a unified bridge runtime snapshot for desktop IPC consumers
- `/workspace/bridge` now starts with a runtime/incident overview before per-platform configuration
- bridge runtime state is now treated as guardian remote-entry state, not just a page-local settings concern
```

- [ ] **Step 2: Update backend/desktop contract notes**

```md
- desktop bridge IPC now exposes one runtime snapshot contract for guardian remote-entry overview
- bridge page framing must remain overview-first while leaving platform sections intact
```

- [ ] **Step 3: Update test index**

```md
- guardian mode / unified remote entry slice 2:
  - desktop/tests/bridge-runtime-lifecycle.contract.test.mjs
  - frontend/src/core/bridge/overview.test.ts
  - frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts
  - frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/bridge-runtime-lifecycle.contract.test.mjs \
  frontend/src/core/bridge/overview.test.ts \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
```

Expected:

- PASS

Run:

```bash
frontend/node_modules/.bin/eslint \
  src/components/workspace/bridge/BridgeLayout.tsx \
  src/components/workspace/bridge/BridgeOverviewPanel.tsx \
  src/components/workspace/bridge/bridge-shared.tsx \
  src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts \
  src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  src/components/workspace/bridge/bridge-overview-actions.contract.test.ts \
  src/core/bridge/client.ts \
  src/core/bridge/overview.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  README.md \
  backend/CLAUDE.md \
  docs/test/README.md
git commit -m "docs: sync guardian bridge lifecycle and remote-entry overview"
```

---

## Spec Coverage Check

This plan covers the next slice of the guardian mode spec:

- bridge lifecycle becomes a clearer guardian runtime concept
- bridge page becomes a real overview/diagnostics surface instead of only a settings hub
- per-platform sections remain intact and secondary

Still intentionally deferred:

- controlled local actions
- standalone web console
- multi-user / team / group semantics
- deep per-platform UX redesign

## Placeholder Scan

Checked for:

- `TBD`
- `TODO`
- vague “handle appropriately”
- missing commands
- missing code blocks

No placeholders remain in this plan.

## Type Consistency Check

Verified consistent naming across tasks:

- `BridgeRuntimeInfo`
- `bridgeRuntimeInfo`
- `BridgeOverviewPanel`
- `overviewRuntime*`
- `overviewBindingsLabel`
- `overviewIncidentsLabel`
- `overviewPlatformsLabel`

No conflicting names remain across the plan.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-guardian-mode-bridge-lifecycle-and-remote-entry-overview-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
