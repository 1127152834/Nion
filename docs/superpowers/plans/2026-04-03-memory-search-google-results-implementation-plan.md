# Memory Search Google Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild memory search into a Google-like entry page plus a dedicated results page while moving non-search management actions back into the facts library.

**Architecture:** Keep the existing route-split memory module, but replace the old all-in-one search workbench with two focused surfaces: a minimal search home and a dedicated results page backed by `searchStructuredMemory` and `useRecallSearch`. Preserve import/export/clear capabilities by moving them to `MemoryFactsPage`, and update both Next routes and the desktop renderer contract.

**Tech Stack:** Next.js App Router, React 19, TypeScript, TanStack Query hooks, shadcn UI primitives, `node:test`, `pnpm`, `tsc --noEmit`

---

### Task 1: Lock The New Search Route Contract

**Files:**
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `frontend/src/core/navigation/desktop-routes.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-routes.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-route-smoke.contract.test.ts`
- Modify: `desktop/tests/workspace-contract.test.mjs`

- [ ] **Step 1: Write the failing contract assertions**

```ts
assert.equal(pathOfMemorySearchResults("alpha"), "/workspace/memory/search/results?q=alpha");
assert.match(source, /path="\/workspace\/memory\/search\/results"/);
assert.match(resultsRouteSource, /MemorySearchResultsPage/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/core/navigation/desktop-routes.test.ts src/components/workspace/memory/memory-routes.contract.test.ts src/components/workspace/memory/memory-route-smoke.contract.test.ts && node --test desktop/tests/workspace-contract.test.mjs`
Expected: FAIL because the helper and route do not exist yet.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/core/navigation/desktop-routes.ts frontend/src/core/navigation/desktop-routes.test.ts frontend/src/components/workspace/memory/memory-routes.contract.test.ts frontend/src/components/workspace/memory/memory-route-smoke.contract.test.ts desktop/tests/workspace-contract.test.mjs
git commit -m "test(memory): lock dedicated search results route"
```

### Task 2: Replace The Old Search Workbench With Search Home + Results

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-search-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-search-page.contract.test.ts`
- Create: `frontend/src/components/workspace/memory/memory-search-results-page.tsx`
- Create: `frontend/src/components/workspace/memory/memory-search-results-page.contract.test.ts`
- Create: `frontend/src/app/workspace/memory/search/results/page.tsx`
- Modify: `frontend/src/app/workspace/memory/search/page.tsx`
- Modify: `desktop/src/renderer/renderer-app.tsx`

- [ ] **Step 1: Write the failing page-contract assertions**

```ts
assert.doesNotMatch(searchSource, /MemoryConsolePanel|MemoryDetailInspector|onCreateFact/);
assert.match(searchSource, /router\.push\(pathOfMemorySearchResults/);
assert.match(resultsSource, /useSearchParams/);
assert.match(resultsSource, /useRecallSearch/);
assert.match(resultsSource, /pathOfThread/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-search-page.contract.test.ts src/components/workspace/memory/memory-search-results-page.contract.test.ts`
Expected: FAIL because the old search page still owns management actions and the new results page does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```tsx
export function MemorySearchPage() {
  return <form onSubmit={...}>...</form>;
}

export function MemorySearchResultsPage() {
  const searchParams = useSearchParams();
  const recall = useRecallSearch(query, 8);
  return <main>...</main>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-search-page.contract.test.ts src/components/workspace/memory/memory-search-results-page.contract.test.ts src/components/workspace/memory/memory-routes.contract.test.ts src/components/workspace/memory/memory-route-smoke.contract.test.ts && node --test desktop/tests/workspace-contract.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-search-page.tsx frontend/src/components/workspace/memory/memory-search-page.contract.test.ts frontend/src/components/workspace/memory/memory-search-results-page.tsx frontend/src/components/workspace/memory/memory-search-results-page.contract.test.ts frontend/src/app/workspace/memory/search/page.tsx frontend/src/app/workspace/memory/search/results/page.tsx desktop/src/renderer/renderer-app.tsx
git commit -m "feat(memory): add google-like search home and results page"
```

### Task 3: Move Memory Management Back To Facts Library

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-facts-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-facts-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`

- [ ] **Step 1: Write the failing contract assertions**

```ts
assert.match(source, /useImportMemory|useClearMemory/);
assert.match(source, /MemoryClearFlow/);
assert.match(source, /importAction|exportAction|manageCleanup/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-facts-page.contract.test.ts`
Expected: FAIL because the facts page does not yet own import/export/clear actions.

- [ ] **Step 3: Write minimal implementation**

```tsx
const clearMemory = useClearMemory();
const importMemory = useImportMemory();
<Button onClick={handleExportMemory}>{t.settings.memory.exportAction}</Button>
<MemoryClearFlow ... />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C frontend exec node --test src/components/workspace/memory/memory-facts-page.contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/memory/memory-facts-page.tsx frontend/src/components/workspace/memory/memory-facts-page.contract.test.ts frontend/src/components/workspace/memory/memory-home-page.tsx
git commit -m "refactor(memory): move management actions to facts library"
```

### Task 4: Localize And Verify The Full Slice

**Files:**
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Verify: focused memory and desktop tests

- [ ] **Step 1: Add the required copy keys**

```ts
resultsCount: (count: number) => string;
filterMemory: string;
filterHistory: string;
openThread: string;
backToSearchHome: string;
```

- [ ] **Step 2: Run focused contract tests**

Run: `pnpm -C frontend exec node --test src/core/navigation/desktop-routes.test.ts src/components/workspace/memory/memory-home-page.contract.test.ts src/components/workspace/memory/memory-facts-page.contract.test.ts src/components/workspace/memory/memory-search-page.contract.test.ts src/components/workspace/memory/memory-search-results-page.contract.test.ts src/components/workspace/memory/memory-routes.contract.test.ts src/components/workspace/memory/memory-route-smoke.contract.test.ts`
Expected: PASS

- [ ] **Step 3: Run desktop route test and frontend typecheck**

Run: `node --test desktop/tests/workspace-contract.test.mjs && pnpm -C frontend typecheck`
Expected: PASS

- [ ] **Step 4: Final self-review**

Check that:

- search home no longer contains management or result rendering
- results page only contains search behavior
- facts page preserves the removed management actions
- no new dead search-workbench code remains on the production path
