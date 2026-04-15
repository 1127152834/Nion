# Guardian Mode Runtime Visibility Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Guardian Mode / Remote Entry 的运行态可见性从“各页面各自拉状态”收口成一套前端可复用、可刷新的 runtime visibility contract，让 settings 与 bridge overview 对同一台电脑的在线状态、远程入口状态和刷新时机保持一致。

**Architecture:** 这份计划建立在前两个切片已经落地的 contract 之上，不再新增 bridge/daemon 的底层字段，也不引入受控本机动作。重点是把 `frontend/src/core/api/desktop-client.ts` 提供的 guardian runtime 信息与 `frontend/src/core/bridge/client.ts` 提供的 bridge runtime overview 统一进一层前端 visibility service / hook，让 settings page 与 bridge page 不再各自维护一套 mount-only 或 focus-only 刷新逻辑，并补上围绕 stale state、fallback 和 refresh trigger 的合同测试。

**Tech Stack:** React/Next.js, TypeScript, Node.js contract tests, desktop preload/runtime bridge, frontend source-level contract tests

---

## Scope Check

这一步仍然不处理：

- 受控本机动作（截图、整理文件等）
- 独立 Web 控制台
- 多用户 / 团队 / 群组
- 深度平台化 bridge section 改造
- chat / notebook / knowledge 产品面

本计划只做一件事：

- **统一并强化 guardian / bridge runtime visibility contract**

也就是：

- 一个前端 owner
- 一套刷新策略
- 一套 fallback 规则
- 两个页面共享

---

## Read This First

- [2026-04-15-nion-guardian-mode-unified-remote-entry-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-nion-guardian-mode-unified-remote-entry-design.md)
- [2026-04-15-guardian-mode-core-and-remote-entry-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-15-guardian-mode-core-and-remote-entry-implementation-plan.md)
- [2026-04-15-guardian-mode-bridge-lifecycle-and-remote-entry-overview-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-15-guardian-mode-bridge-lifecycle-and-remote-entry-overview-implementation-plan.md)
- [frontend/src/core/api/desktop-client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/api/desktop-client.ts)
- [frontend/src/core/bridge/client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/bridge/client.ts)
- [frontend/src/components/workspace/settings/daemon-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/daemon-settings-page.tsx)
- [frontend/src/components/workspace/bridge/BridgeLayout.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/bridge/BridgeLayout.tsx)
- [frontend/src/core/threads/desktop-client.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/desktop-client.test.ts)

---

## File Map

### Shared guardian runtime visibility contract

- Create: `frontend/src/core/runtime/guardian-runtime.ts`
- Create: `frontend/src/core/runtime/guardian-runtime.test.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Modify: `frontend/src/core/bridge/client.ts`

Responsibility:

- define one reusable runtime visibility model for guardian mode + bridge overview
- centralize fallback and merge rules instead of duplicating them in pages

### Shared refresh / subscription hook

- Create: `frontend/src/core/runtime/use-guardian-runtime.ts`
- Create: `frontend/src/core/runtime/use-guardian-runtime.contract.test.ts`

Responsibility:

- own refresh triggers (`mount`, `focus`, `visibilitychange`, manual refresh)
- expose a consistent state machine (`loading`, `ready`, `unavailable`, `error`)

### Settings integration

- Modify: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts`

Responsibility:

- remove page-local runtime fetch logic
- consume the shared guardian runtime hook/service
- preserve settings-specific copy and save flow

### Bridge overview integration

- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Modify: `frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts`

Responsibility:

- remove page-local runtime refresh logic
- consume the shared guardian runtime hook/service
- keep overview semantics and overview-only action boundaries intact

### Docs sync

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

Responsibility:

- document the new frontend runtime visibility owner and verification matrix

---

## Task 1: Freeze one shared guardian runtime model and merge contract

**Files:**
- Create: `frontend/src/core/runtime/guardian-runtime.ts`
- Create: `frontend/src/core/runtime/guardian-runtime.test.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`

- [ ] **Step 1: Write the failing contract test for a shared guardian runtime model**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("guardian runtime module defines one shared visibility model and merge rules", async () => {
  const source = await readFile(new URL("./guardian-runtime.ts", import.meta.url), "utf8");

  assert.match(source, /export type GuardianRuntimeSnapshot =/);
  assert.match(source, /export type GuardianRuntimeLoadState =/);
  assert.match(source, /export function mergeGuardianRuntime/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/runtime/guardian-runtime.test.ts
```

Expected:

- FAIL because the shared runtime contract module does not exist yet

- [ ] **Step 3: Add the shared runtime model**

```typescript
export type GuardianRuntimeLoadState = "loading" | "ready" | "unavailable" | "error";

export type GuardianRuntimeSnapshot = {
  loadState: GuardianRuntimeLoadState;
  guardianStatus: "standing_by" | "busy" | "offline";
  bridgeRunning: boolean | null;
  bridgeAutoStartEnabled: boolean | null;
  enabledPlatforms: number | null;
  activeBindings: number | null;
  openIncidents: number | null;
  startedAt: string | null;
};

export function mergeGuardianRuntime(input: {
  desktopRuntime: DesktopRuntimeInfo | null;
  bridgeRuntime: BridgeRuntimeInfo | null;
  error?: "unavailable" | "error" | null;
}): GuardianRuntimeSnapshot {
  if (input.error === "error") {
    return {
      loadState: "error",
      guardianStatus: "offline",
      bridgeRunning: null,
      bridgeAutoStartEnabled: null,
      enabledPlatforms: null,
      activeBindings: null,
      openIncidents: null,
      startedAt: null,
    };
  }

  if (input.error === "unavailable" || (!input.desktopRuntime && !input.bridgeRuntime)) {
    return {
      loadState: "unavailable",
      guardianStatus: "offline",
      bridgeRunning: null,
      bridgeAutoStartEnabled: null,
      enabledPlatforms: null,
      activeBindings: null,
      openIncidents: null,
      startedAt: null,
    };
  }

  return {
    loadState: "ready",
    guardianStatus: input.desktopRuntime?.guardianMode.status ?? "offline",
    bridgeRunning: input.bridgeRuntime?.running ?? input.desktopRuntime?.bridgeRuntime.running ?? null,
    bridgeAutoStartEnabled: input.bridgeRuntime?.autoStartEnabled ?? null,
    enabledPlatforms: input.bridgeRuntime?.enabledPlatforms.length ?? null,
    activeBindings: input.bridgeRuntime?.activeBindings ?? null,
    openIncidents: input.bridgeRuntime?.openIncidents ?? null,
    startedAt: input.bridgeRuntime?.startedAt ?? null,
  };
}
```

- [ ] **Step 4: Repoint `desktop-client.ts` to the shared merge helper**

```typescript
import { mergeGuardianRuntime } from "../runtime/guardian-runtime";

// use mergeGuardianRuntime(...) when composing the final settings-facing runtime object
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/runtime/guardian-runtime.test.ts frontend/src/core/threads/desktop-client.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/core/runtime/guardian-runtime.ts \
  frontend/src/core/runtime/guardian-runtime.test.ts \
  frontend/src/core/api/desktop-client.ts
git commit -m "feat: add a shared guardian runtime visibility contract"
```

---

## Task 2: Add one reusable guardian runtime hook with explicit refresh triggers

**Files:**
- Create: `frontend/src/core/runtime/use-guardian-runtime.ts`
- Create: `frontend/src/core/runtime/use-guardian-runtime.contract.test.ts`

- [ ] **Step 1: Write the failing hook contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("guardian runtime hook owns focus and visibility refresh triggers", async () => {
  const source = await readFile(new URL("./use-guardian-runtime.ts", import.meta.url), "utf8");

  assert.match(source, /window\.addEventListener\("focus"/);
  assert.match(source, /document\.addEventListener\("visibilitychange"/);
  assert.match(source, /refresh\(/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/runtime/use-guardian-runtime.contract.test.ts
```

Expected:

- FAIL because the shared runtime hook does not exist yet

- [ ] **Step 3: Add the hook**

```typescript
export function useGuardianRuntime() {
  const [snapshot, setSnapshot] = useState<GuardianRuntimeSnapshot>({
    loadState: "loading",
    guardianStatus: "offline",
    bridgeRunning: null,
    bridgeAutoStartEnabled: null,
    enabledPlatforms: null,
    activeBindings: null,
    openIncidents: null,
    startedAt: null,
  });

  const refresh = useCallback(async () => {
    try {
      const desktopRuntime = await getDesktopRuntimeInfo();
      const bridgeRuntime = await getBridgeClient()?.getRuntimeInfo().catch(() => null);
      setSnapshot(mergeGuardianRuntime({ desktopRuntime, bridgeRuntime }));
    } catch {
      setSnapshot(mergeGuardianRuntime({ desktopRuntime: null, bridgeRuntime: null, error: "error" }));
    }
  }, []);

  useEffect(() => {
    void refresh();

    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { snapshot, refresh };
}
```

- [ ] **Step 4: Run test to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/runtime/use-guardian-runtime.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/core/runtime/use-guardian-runtime.ts \
  frontend/src/core/runtime/use-guardian-runtime.contract.test.ts
git commit -m "feat: add a shared guardian runtime refresh hook"
```

---

## Task 3: Migrate `Settings > Daemon` to the shared runtime hook

**Files:**
- Modify: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page consumes the shared guardian runtime hook instead of page-local loading logic", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useGuardianRuntime/);
  assert.doesNotMatch(source, /getDesktopRuntimeInfo\(/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts
```

Expected:

- FAIL because page still owns local runtime-loading logic

- [ ] **Step 3: Replace page-local loading with the shared hook**

```tsx
const { snapshot, refresh } = useGuardianRuntime();

<GuardianModeStatusCard
  copy={guardianStatusCopy}
  status={snapshot.guardianStatus}
/>

onSave={() => {
  void onSave().then((saved) => {
    if (saved) {
      void refresh();
    }
  });
}}
```

- [ ] **Step 4: Run test to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/settings/daemon-settings-page.tsx \
  frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts
git commit -m "refactor: move guardian settings to the shared runtime hook"
```

---

## Task 4: Migrate bridge overview to the shared runtime hook

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Modify: `frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge layout consumes the shared guardian runtime hook instead of page-local refresh logic", async () => {
  const source = await readFile(new URL("./BridgeLayout.tsx", import.meta.url), "utf8");

  assert.match(source, /useGuardianRuntime/);
  assert.doesNotMatch(source, /getBridgeClient\(\)\?\.getRuntimeInfo\(\)/);
  assert.doesNotMatch(source, /window\.addEventListener\("focus"/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
```

Expected:

- FAIL because page still owns local refresh logic

- [ ] **Step 3: Replace page-local state loading with the shared hook**

```tsx
const { snapshot } = useGuardianRuntime();

<BridgeOverviewPanel
  runtimeInfo={{
    running: snapshot.bridgeRunning ?? false,
    autoStartEnabled: snapshot.bridgeAutoStartEnabled ?? false,
    enabledPlatforms: snapshot.enabledPlatforms ? Array(snapshot.enabledPlatforms).fill("") : [],
    activeBindings: snapshot.activeBindings ?? 0,
    openIncidents: snapshot.openIncidents ?? 0,
    startedAt: snapshot.startedAt,
  }}
/>
```

- [ ] **Step 4: Adjust contract tests to lock the new owner**

```typescript
assert.match(source, /useGuardianRuntime/);
assert.doesNotMatch(source, /getBridgeClient\(\)\?\.getRuntimeInfo\(\)/);
assert.doesNotMatch(source, /window\.addEventListener\("focus"/);
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/workspace/bridge/BridgeLayout.tsx \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
git commit -m "refactor: move bridge overview to the shared runtime hook"
```

---

## Task 5: Sync slice 3 docs and run focused verification

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update README**

```md
- Guardian Mode slice 3 unifies settings and bridge overview state behind one frontend runtime visibility contract
- Settings and remote-entry overview now refresh from the same focus/visibility/manual refresh owner instead of page-local loaders
```

- [ ] **Step 2: Update backend/desktop guidance**

```md
- frontend guardian / bridge visibility should build on shared runtime hooks instead of re-stitching state in each page
```

- [ ] **Step 3: Update the test index**

```md
- guardian mode / unified remote entry slice 3:
  - frontend/src/core/runtime/guardian-runtime.test.ts
  - frontend/src/core/runtime/use-guardian-runtime.contract.test.ts
  - frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts
  - frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts
  - frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/core/runtime/guardian-runtime.test.ts \
  frontend/src/core/runtime/use-guardian-runtime.contract.test.ts \
  frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts \
  frontend/src/core/threads/desktop-client.test.ts
```

Expected:

- PASS

Run:

```bash
cd frontend && /opt/homebrew/bin/node node_modules/eslint/bin/eslint.js \
  src/core/runtime/guardian-runtime.ts \
  src/core/runtime/guardian-runtime.test.ts \
  src/core/runtime/use-guardian-runtime.ts \
  src/core/runtime/use-guardian-runtime.contract.test.ts \
  src/components/workspace/settings/daemon-settings-page.tsx \
  src/components/workspace/settings/guardian-mode-status-card.contract.test.ts \
  src/components/workspace/bridge/BridgeLayout.tsx \
  src/components/workspace/bridge/BridgeOverviewPanel.tsx \
  src/components/workspace/bridge/bridge-overview-panel.contract.test.ts \
  src/components/workspace/bridge/bridge-overview-actions.contract.test.ts \
  src/core/api/desktop-client.ts \
  src/core/bridge/client.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  README.md \
  backend/CLAUDE.md \
  docs/test/README.md
git commit -m "docs: sync guardian runtime visibility refinement"
```

---

## Spec Coverage Check

This plan covers the next frontier inside the existing guardian-mode spec:

- one frontend owner for guardian / bridge runtime visibility
- one refresh policy
- one fallback model
- both settings and bridge overview consuming the same runtime state

Still intentionally deferred:

- controlled local actions
- standalone web console
- multi-user / team / group semantics
- deeper per-platform actions

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

- `GuardianRuntimeSnapshot`
- `GuardianRuntimeLoadState`
- `mergeGuardianRuntime`
- `useGuardianRuntime`
- `loadState`
- `refresh`

No conflicting names remain across the plan.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-guardian-mode-runtime-visibility-refinement-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
