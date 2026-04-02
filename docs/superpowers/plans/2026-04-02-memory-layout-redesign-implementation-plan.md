# Memory Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the memory module into the confirmed A1 left-navigation layout so the page feels ordered, aligned, and desktop-tool-like without changing core behavior.

**Architecture:** Keep `MemoryPage` as the single product entry, but split display responsibilities into overview rail, left memory map, main work surface, and detail inspector. Preserve current search, delete, recall, and clear-flow logic while refactoring the layout into smaller focused components and tightening the visual language to low-radius, border-led surfaces.

**Tech Stack:** Next.js App Router, React 19, TypeScript, existing shadcn UI primitives, existing memory hooks, `node:test`, `pnpm`, `tsc --noEmit`

---

### Task 1: Lock The New Layout Contract

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-page.contract.test.ts`
- Create: `frontend/src/components/workspace/memory/memory-map-nav.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-overview-sections.contract.test.ts`

- [ ] **Step 1: Write the failing contract tests**

```ts
assert.match(source, /MemoryMapNav/);
assert.match(source, /xl:grid-cols-\[190px_minmax\(0,1fr\)_340px\]/);
assert.doesNotMatch(source, /rounded-2xl/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-page.contract.test.ts src/components/workspace/memory/memory-overview-sections.contract.test.ts src/components/workspace/memory/memory-map-nav.contract.test.ts`
Expected: FAIL because `MemoryMapNav` does not exist yet and `rounded-2xl` still exists in memory layout files.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-page.contract.test.ts frontend/src/components/workspace/memory/memory-overview-sections.contract.test.ts frontend/src/components/workspace/memory/memory-map-nav.contract.test.ts
git commit -m "test(memory): lock redesigned layout contracts"
```

### Task 2: Build The Left Memory Map Navigation

**Files:**
- Create: `frontend/src/components/workspace/memory/memory-map-nav.tsx`
- Test: `frontend/src/components/workspace/memory/memory-map-nav.contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```ts
assert.match(source, /Memory map|记忆结构|MemoryMap/);
assert.match(source, /用户上下文/);
assert.match(source, /历史背景/);
assert.match(source, /事实库/);
assert.doesNotMatch(source, /rounded-2xl|rounded-full/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-map-nav.contract.test.ts`
Expected: FAIL because the file does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
export function MemoryMapNav() {
  return <aside>...</aside>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-map-nav.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-map-nav.tsx frontend/src/components/workspace/memory/memory-map-nav.contract.test.ts
git commit -m "feat(memory): add left navigation map"
```

### Task 3: Refactor Overview Rail And Main Card Grid

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-overview-sections.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-overview-sections.contract.test.ts`

- [ ] **Step 1: Write the failing contract updates**

```ts
assert.match(source, /min-h-\[206px\]/);
assert.match(source, /border-t|border-top/);
assert.doesNotMatch(source, /rounded-2xl/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-overview-sections.contract.test.ts src/components/workspace/memory/memory-summary-cards.contract.test.ts`
Expected: FAIL because the current components still use `rounded-2xl` and do not enforce the new card rhythm.

- [ ] **Step 3: Write minimal implementation**

```tsx
<article className="min-h-[206px] rounded-[10px] border ...">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-overview-sections.contract.test.ts src/components/workspace/memory/memory-summary-cards.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-summary-cards.tsx frontend/src/components/workspace/memory/memory-overview-sections.tsx frontend/src/components/workspace/memory/memory-overview-sections.contract.test.ts
git commit -m "refactor(memory): tighten overview rail and card rhythm"
```

### Task 4: Rework The Detail Inspector Visual Language

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-detail-drawer.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-detail-drawer.contract.test.ts`

- [ ] **Step 1: Write the failing contract updates**

```ts
assert.match(source, /Detail inspector|Inspector|detailSummaryTitle/);
assert.doesNotMatch(source, /rounded-2xl/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-detail-drawer.contract.test.ts`
Expected: FAIL because the current inspector still uses large radius blocks.

- [ ] **Step 3: Write minimal implementation**

```tsx
<section className="rounded-[10px] border ...">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-detail-drawer.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-detail-drawer.tsx frontend/src/components/workspace/memory/memory-detail-drawer.contract.test.ts
git commit -m "refactor(memory): restyle detail inspector"
```

### Task 5: Recompose MemoryPage Into The Confirmed Three-Column Workbench

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-page.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-console-panel.tsx`
- Test: `frontend/src/components/workspace/memory/memory-page.contract.test.ts`

- [ ] **Step 1: Write the failing contract updates**

```ts
assert.match(source, /MemoryMapNav/);
assert.match(source, /xl:grid-cols-\[190px_minmax\(0,1fr\)_340px\]/);
assert.doesNotMatch(source, /rounded-2xl/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-page.contract.test.ts src/components/workspace/settings/memory-console-panel.contract.test.ts`
Expected: FAIL because the current page still lacks the left memory map and still uses old radius choices.

- [ ] **Step 3: Write minimal implementation**

```tsx
<div className="grid gap-4 xl:grid-cols-[190px_minmax(0,1fr)_340px]">
  <MemoryMapNav ... />
  <div className="grid gap-4">...</div>
  <MemoryDetailDrawer ... />
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-page.contract.test.ts src/components/workspace/settings/memory-console-panel.contract.test.ts src/components/workspace/memory/memory-map-nav.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-page.tsx frontend/src/components/workspace/settings/memory-console-panel.tsx frontend/src/components/workspace/memory/memory-page.contract.test.ts frontend/src/components/workspace/memory/memory-map-nav.contract.test.ts frontend/src/components/workspace/memory/memory-map-nav.tsx
git commit -m "feat(memory): compose ordered three-column workbench"
```

### Task 6: Verify The Full Slice

**Files:**
- Verify only

- [ ] **Step 1: Run focused contract tests**

Run: `pnpm -C frontend exec node --test src/components/workspace/settings/memory-settings-page.config.test.ts src/components/workspace/settings/memory-console-panel.contract.test.ts src/components/workspace/memory/memory-page.contract.test.ts src/components/workspace/memory/memory-detail-drawer.contract.test.ts src/components/workspace/memory/memory-summary-cards.contract.test.ts src/components/workspace/memory/memory-overview-sections.contract.test.ts src/components/workspace/memory/memory-map-nav.contract.test.ts src/components/workspace/memory/memory-clear-flow.contract.test.ts`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `rm -rf frontend/.next/dev/types && pnpm -C frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit final verification-only state if needed**

```bash
git status --short
```

- [ ] **Step 4: Final self-review**

Check that:

- `MemoryPage` is still readable and not becoming a monolith again
- large radii are removed from the redesigned memory slice
- the layout remains desktop-first and orderly
- search, delete, and clear-flow behavior still exist
