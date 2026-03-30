# OpenViking Memory OS M3 Memory Console Product Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mixed memory settings page with a product-grade Memory OS surface that separates provider management, memory operations, and agent-core operator functions into clear product sections.

**Architecture:** Keep the existing settings shell, but replace the current card stack in `MemorySettingsPage` with a three-surface structure: `Memory Provider`, `Memory Console`, and `Agent Core`. Reuse the current backend APIs and compatibility hooks wherever possible, but reorganize the UI and frontend state so the page no longer mixes configuration, retrieval, and operator/debug functions in one undifferentiated flow.

**Tech Stack:** React 19, TypeScript, TanStack Query, existing Nion settings components, existing Memory OS APIs, existing memory/openviking/autodream hooks, existing i18n locale system, node:test contract tests

---

## Scope Boundary

This milestone intentionally does **not**:

- redesign the global settings dialog shell
- invent final heartbeat UI
- fully productize identity/soul editing
- replace backend APIs with a new Memory Console-specific backend
- remove the compatibility `/api/memory` route

This milestone is about product surface and information architecture, not another backend migration.

## Information Architecture

The current memory settings page should be split into three product surfaces, in this order:

1. **Memory Provider**
   - what backend is active
   - what mode it runs in
   - what capabilities it exposes

2. **Memory Console**
   - search memory
   - inspect memory
   - manage facts/summaries
   - compact/rebuild entry points later

3. **Agent Core**
   - AutoDream
   - OpenViking operator tools
   - future heartbeat / identity / soul controls

This milestone does not have to turn each surface into a full sub-route. A segmented or tabbed sub-navigation inside the existing memory settings page is sufficient.

## File Structure And Ownership

### Frontend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-panel.tsx`
  - Provider section wrapper built from the existing provider foundation card and richer status presentation.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-console-panel.tsx`
  - Search, overview, facts, and compatibility-memory management panel.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.tsx`
  - AutoDream and OpenViking operator surface wrapper.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.tsx`
  - Internal tab switcher or segmented control for the three surfaces.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-console-panel.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts`

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
  - Replace the monolithic stack with the new surface switcher and panel layout.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
  - Convert it from a temporary card into the main provider panel body.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md`

## Task 1: Lock The New Memory Surface IA In Contract Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`

- [ ] **Step 1: Write the failing contract test for the three-surface switcher**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page exposes provider console and agent core surfaces", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Memory Provider|记忆提供者/);
  assert.match(source, /Memory Console|记忆控制台/);
  assert.match(source, /Agent Core|智能体内核/);
});
```

- [ ] **Step 2: Tighten the existing OpenViking contract test**

Require the page to expose an Agent Core panel rather than leaving OpenViking mixed into the top-level card stack.

- [ ] **Step 3: Run the failing contract tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
```

Expected:
- the new memory-surface test fails because no such surface split exists yet

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts frontend/src/components/workspace/settings/memory-settings-page.config.test.ts frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
git commit -m "test: lock memory console surface architecture"
```

## Task 2: Build The Surface Switcher

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`

- [ ] **Step 1: Create a minimal internal tab switcher**

```tsx
export type MemorySurfaceKey = "provider" | "console" | "agent-core";

export function MemorySurfaceTabs(props: {
  value: MemorySurfaceKey;
  onChange: (value: MemorySurfaceKey) => void;
}) {
  return null;
}
```

- [ ] **Step 2: Mount the switcher at the top of `MemorySettingsPage`**

Create a local state key such as:

```tsx
const [surface, setSurface] = useState<MemorySurfaceKey>("provider");
```

- [ ] **Step 3: Run the contract tests again**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
```

Expected:
- the new surface labels appear in source and the tests pass or narrow to the next missing panel contracts

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/workspace/settings/memory-surface-tabs.tsx frontend/src/components/workspace/settings/memory-settings-page.tsx
git commit -m "feat: add memory surface switcher"
```

## Task 3: Split Provider Surface Out Of The Monolith

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`

- [ ] **Step 1: Move provider-specific rendering into `memory-provider-panel.tsx`**

This panel should own:

- active provider badges
- mode labels
- provider description
- storage provider controls that still remain relevant during transition

- [ ] **Step 2: Keep the current storage mode selector only inside the provider panel**

Do not let `storage_class` controls remain visually mixed with search and AutoDream cards.

- [ ] **Step 3: Render the provider panel only when `surface === "provider"`**

- [ ] **Step 4: Run targeted contract tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts
```

Expected:
- provider controls still exist, but now clearly belong to the provider surface

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/settings/memory-provider-panel.tsx frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx frontend/src/components/workspace/settings/memory-settings-page.tsx
git commit -m "refactor: isolate memory provider panel"
```

## Task 4: Build The Memory Console Panel

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-console-panel.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-console-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`

- [ ] **Step 1: Write the failing contract test for the memory console panel**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory console panel owns search overview and fact management", async () => {
  const source = await readFile(
    new URL("./memory-console-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /searchPlaceholder|记忆检索|Memory Search/);
  assert.match(source, /current memory overview|当前记忆概览|overview/i);
  assert.match(source, /useClearMemory|useDeleteMemoryFact/);
});
```

- [ ] **Step 2: Move search, summary overview, and fact management into `MemoryConsolePanel`**

This panel should own:

- memory search
- long-term memory overview
- facts list
- clear/delete actions

- [ ] **Step 3: Render the panel only when `surface === "console"`**

- [ ] **Step 4: Run targeted tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-console-panel.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts
```

Expected:
- console panel contract passes

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/settings/memory-console-panel.tsx frontend/src/components/workspace/settings/memory-console-panel.contract.test.ts frontend/src/components/workspace/settings/memory-settings-page.tsx
git commit -m "refactor: isolate memory console panel"
```

## Task 5: Build The Agent Core Panel

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`

- [ ] **Step 1: Write the failing contract test for agent core**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory agent core panel owns autodream and openviking operator tools", async () => {
  const source = await readFile(
    new URL("./memory-agent-core-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutoDream|梦境日志|runAutoDream/);
  assert.match(source, /OpenViking|重新索引笔记|搜索笔记资源/);
});
```

- [ ] **Step 2: Move AutoDream and OpenViking operator controls into `MemoryAgentCorePanel`**

This panel should own:

- AutoDream trigger and latest result
- OpenViking reindex/search/context-preview
- future extension room for heartbeat / identity / soul

- [ ] **Step 3: Render the panel only when `surface === "agent-core"`**

- [ ] **Step 4: Run targeted tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-agent-core-panel.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
```

Expected:
- agent core panel contract passes
- OpenViking/AutoDream contract is preserved under the new panel boundary

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/settings/memory-agent-core-panel.tsx frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts frontend/src/components/workspace/settings/memory-settings-page.tsx
git commit -m "refactor: isolate memory agent core panel"
```

## Task 6: Product Copy And Milestone Tracking

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md`

- [ ] **Step 1: Add explicit labels for the three memory surfaces**

Add locale copy for:

- Memory Provider / 记忆提供者
- Memory Console / 记忆控制台
- Agent Core / 智能体内核

- [ ] **Step 2: Update the settings test guide**

Record that the memory page is now structured by internal surfaces and that AutoDream/OpenViking live under Agent Core rather than mixed cards.

- [ ] **Step 3: Update the milestone checklist**

Move M2 to complete if appropriate, and set M3 in progress once this panel split is executed.

- [ ] **Step 4: Run the full M3 targeted verification**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts \
  src/components/workspace/settings/memory-console-panel.contract.test.ts \
  src/components/workspace/settings/memory-agent-core-panel.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
```

Expected:
- the page structure is validated by contract tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/types.ts docs/test/05-settings-config-center/README.md docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md
git commit -m "docs: record memory console product surface"
```

## Spec Coverage Check

This milestone covers:

- the product IA split into three surfaces
- moving provider config out of the mixed card stack
- moving memory operations out of the mixed card stack
- moving AutoDream/OpenViking operator surfaces into Agent Core

This milestone intentionally does not cover:

- heartbeat productization
- identity/soul editing productization
- canonical asset sync rules
- richer provider analytics or compaction UI
