# Memoh-Style Memory Self-Maintenance M5 Product Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Nion's product surface so `Knowledge Base`, `Memory`, and `Self-Maintenance` become clearly separated user-facing domains, with `OpenViking` demoted to a capability layer and no remaining UI that implies notebook belongs to memory.

**Architecture:** M5 is a product-IA and surface refactor, not a new memory-runtime milestone. Reuse the runtime that now exists after M4, but rearrange the visible shell around it: `Notebook` remains the dedicated Knowledge Base page, `Memory` becomes a focused memory operator/recall surface, and `Self-Maintenance` becomes a first-class operator surface for heartbeat, maintenance logs, and proposals. The settings dialog should stop serving as the long-term home for all these concerns and instead either route or deep-link users into the correct dedicated surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript, existing workspace shell components, settings dialog, desktop route helpers, current notebook pages, current projects pages, existing memory/self-maintenance frontend hooks, node:test contract tests, pnpm typecheck, Electron desktop runtime.

---

## Non-Negotiable Source Rule

Before implementing M5, review the following source of truth and use code plus design docs together:

- [ ] `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/settings-dialog.tsx`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/notebook/page.tsx`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/projects/page.tsx`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/navigation/desktop-routes.ts`

If any existing screen still conflicts with the product domain model, the product domain model wins.

## Scope Boundary

This milestone intentionally does **not**:

- re-implement notebook editing, notebook tree, or notebook assistant features
- redesign Memory OS provider runtime internals
- finish Mem0 parity
- redesign the chat page or project domain business logic
- remove legacy `AutoDream` backend routes
- build a fully new visual design system for all workspace pages

This milestone is specifically about:

- product IA and navigation
- splitting user-facing surfaces cleanly
- reducing the settings dialog from “feature dumping ground” into configuration-only or routing-oriented roles
- making page/page-level ownership match the product model already decided in docs

## File Structure And Ownership

### Frontend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/memory/page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/self-maintenance/page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/self-maintenance/self-maintenance-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/command-palette.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/navigation/desktop-routes.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/README.md`

## Task 1: Lock M5 IA Boundaries In Contract Tests

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts`

- [ ] **Step 1: Add failing contract test for dedicated Memory page**

```ts
void test("memory page excludes notebook semantics and focuses on memory operations", async () => {
  const source = await readFile(
    new URL("./memory-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Memory Provider|Memory Console|Recall|Compaction|Rebuild/);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|reindex notebook/i);
});
```

- [ ] **Step 2: Add failing contract test for dedicated Self-Maintenance page**

```ts
void test("self-maintenance page owns heartbeat and proposal surfaces", async () => {
  const source = await readFile(
    new URL("./self-maintenance-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Self-Maintenance|Heartbeat|proposal|maintenance/i);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|OpenViking Notebook Resources/);
});
```

- [ ] **Step 3: Add failing nav contract test**

```ts
void test("workspace navigation exposes separate notebook memory and self-maintenance entry points", async () => {
  const source = await readFile(
    new URL("./workspace-nav-menu.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /pathOfNotebook/);
  assert.match(source, /pathOfMemory/);
  assert.match(source, /pathOfSelfMaintenance/);
});
```

- [ ] **Step 4: Tighten existing settings contracts**

Update current settings contracts so they now assert:

- settings no longer pretends to be the final home for notebook + memory + self-maintenance together
- `memory-surface-tabs` are no longer the long-term primary IA if page-level surfaces replace them

- [ ] **Step 5: Run contract tests to verify RED**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-page.contract.test.ts \
  src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts
```

Expected:

- tests fail because dedicated Memory / Self-Maintenance pages and nav links do not exist yet

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/workspace/memory/memory-page.contract.test.ts \
  frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts \
  frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts \
  frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts
git commit -m "test: lock m5 product surface contracts"
```

## Task 2: Add Dedicated Workspace Routes For Memory And Self-Maintenance

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/memory/page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/self-maintenance/page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/navigation/desktop-routes.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`

- [ ] **Step 1: Add route helpers**

Add:

```ts
export function pathOfMemory() {
  return "/workspace/memory";
}

export function pathOfSelfMaintenance() {
  return "/workspace/self-maintenance";
}
```

- [ ] **Step 2: Add page shells**

Each page should stay minimal:

```tsx
export default function WorkspaceMemoryPage() {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden bg-background">
      <MemoryPage />
    </main>
  );
}
```

```tsx
export default function WorkspaceSelfMaintenancePage() {
  return (
    <main className="flex size-full min-h-0 flex-col overflow-hidden bg-background">
      <SelfMaintenancePage />
    </main>
  );
}
```

- [ ] **Step 3: Run focused route contract test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts
```

Expected:

- pass

- [ ] **Step 4: Commit**

```bash
git add \
  frontend/src/app/workspace/memory/page.tsx \
  frontend/src/app/workspace/self-maintenance/page.tsx \
  frontend/src/core/navigation/desktop-routes.ts \
  frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts
git commit -m "feat: add dedicated memory and self-maintenance routes"
```

## Task 3: Build Dedicated Memory Page Surface

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-surface-tabs.tsx`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-page.contract.test.ts`

- [ ] **Step 1: Extract Memory-only content out of settings**

The dedicated Memory page should own:

- memory provider view
- memory console / recall
- compaction / rebuild controls if they are currently memory-domain operator actions

The dedicated Memory page should not render:

- notebook resource search
- notebook operator copy
- self-maintenance proposals

- [ ] **Step 2: Reduce settings page to configuration/deep-link role**

`memory-settings-page.tsx` should stop being the only product surface.

Allowed after this step:

- keep light config widgets or route/deep-link cards in settings

Not allowed after this step:

- settings page still acting as the primary end-user memory product page

- [ ] **Step 3: Remove outdated tab logic if dedicated pages replace it**

If page-level IA makes `MemorySurfaceTabs` redundant, simplify or retire it rather than keeping two competing navigation systems.

- [ ] **Step 4: Run contract test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-page.contract.test.ts \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts
```

Expected:

- pass

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/memory/memory-page.tsx \
  frontend/src/components/workspace/settings/memory-settings-page.tsx \
  frontend/src/components/workspace/settings/memory-surface-tabs.tsx \
  frontend/src/components/workspace/memory/memory-page.contract.test.ts \
  frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts
git commit -m "feat: extract dedicated memory product surface"
```

## Task 4: Build Dedicated Self-Maintenance Page Surface

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/self-maintenance/self-maintenance-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts`

- [ ] **Step 1: Move heartbeat + maintenance proposals into a dedicated page**

The dedicated Self-Maintenance page should own:

- heartbeat status
- maintenance status
- reflective logs summary
- maintenance proposals
- legacy autodream compatibility note if needed

- [ ] **Step 2: Downgrade settings panel to supporting role**

The current agent-core panel should either:

- become a smaller summary card with “Open page” navigation

or

- be removed from settings if the dedicated page fully replaces it

- [ ] **Step 3: Keep Notebook and OpenViking operator semantics out**

Self-Maintenance page must not present:

- notebook resource management
- notebook indexing
- notebook editing
- notebook assistant actions

- [ ] **Step 4: Run contract tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts \
  src/components/workspace/settings/memory-agent-core-panel.contract.test.ts
```

Expected:

- pass

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/self-maintenance/self-maintenance-page.tsx \
  frontend/src/components/workspace/settings/memory-agent-core-panel.tsx \
  frontend/src/components/workspace/settings/memory-settings-page.tsx \
  frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts \
  frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts
git commit -m "feat: extract dedicated self-maintenance product surface"
```

## Task 5: Update Workspace Navigation, Command Entry, And Copy

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/command-palette.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`

- [ ] **Step 1: Add top-level entry points**

Navigation and palette should now expose separate paths for:

- Notebook / Knowledge Base
- Memory
- Self-Maintenance
- Projects

Do not keep “memory” hidden only behind settings if it is now a product surface.

- [ ] **Step 2: Update copy**

Required copy direction:

- “Notebook” or “Knowledge Base” must not be described as memory
- “Memory” must not mention notebook ownership
- “Self-Maintenance” must clearly describe agent-owned maintenance
- “OpenViking” must be described as an embedded capability or backend mode, not a top-level product tab

- [ ] **Step 3: Run focused nav contracts**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts
```

Expected:

- pass

- [ ] **Step 4: Commit**

```bash
git add \
  frontend/src/components/workspace/workspace-nav-menu.tsx \
  frontend/src/components/workspace/command-palette.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts
git commit -m "feat: align workspace navigation with memory product domains"
```

## Task 6: Update Docs And Run End-to-End Verification

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/README.md`

- [ ] **Step 1: Update roadmap and parity docs**

Record that after M5:

- product IA is split across `Knowledge Base / Memory / Self-Maintenance / Projects`
- notebook is no longer presented inside memory
- self-maintenance is no longer hidden inside settings as the primary home

- [ ] **Step 2: Update test handoff docs**

Add QA guidance for:

- dedicated Memory page smoke
- dedicated Self-Maintenance page smoke
- nav routing between Notebook / Memory / Self-Maintenance / Projects

- [ ] **Step 3: Run end-to-end verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-page.contract.test.ts \
  src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  src/components/workspace/settings/memory-agent-core-panel.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts \
  src/components/workspace/settings/memory-surface-tabs.contract.test.ts
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && make desktop-dev
```

Minimum manual smoke after desktop boot:

- open `/workspace/notebook`
- open `/workspace/memory`
- open `/workspace/self-maintenance`
- confirm each page renders the correct domain and no longer borrows the wrong mental model

- [ ] **Step 4: Re-review for patch-on-patch IA drift**

Explicit questions:

- Did settings remain a dumping ground after this milestone?
- Does any memory page still mention notebook ownership?
- Does any self-maintenance page still expose notebook operator controls?
- Is OpenViking still acting like a product category instead of a capability?

If any answer is yes, refactor before finalizing M5.

- [ ] **Step 5: Commit**

```bash
git add \
  docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md \
  docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md \
  docs/test/05-settings-config-center/README.md \
  docs/test/README.md
git commit -m "docs: record memory product surface milestone"
```

## Self-Review Checklist

- [ ] M5 stays focused on product surface and IA, not provider runtime parity
- [ ] Notebook remains a dedicated user knowledge-base domain
- [ ] Memory remains a distinct structured-memory domain
- [ ] Self-Maintenance remains a distinct agent-owned domain
- [ ] OpenViking is demoted to capability-layer wording
- [ ] Settings becomes lighter and no longer serves as the primary end-user product home for everything
- [ ] Verification includes both contract tests and desktop smoke

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m5-product-surface/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-m5-product-surface-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
