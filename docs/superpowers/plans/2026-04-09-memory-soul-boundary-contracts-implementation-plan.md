# Memory / Soul Boundary Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 Memory / Soul 的产品边界与合同，让普通用户只看到极简 Memory 内容面和独立的 Soul Settings，同时把 growth / ledger / evidence / runtime-trace 完全移出产品 UI。

**Architecture:** 本计划只实现 `A. 边界与合同重定义`，不处理完整运行时主链重构。先重写合同测试与前端/后端用户合同，再切页面路由和入口，最后删除旧的 UI 壳与错误产品面。内部治理后端能力可暂留，但不得再被普通前端页面或导航消费。

**Tech Stack:** FastAPI gateway routers, React/Next desktop workspace pages, TanStack Query clients, node:test contract tests

---

## Scope Guard

本计划**只覆盖**下面内容：

- `memory user-facing` 合同与页面
- `soul settings` 合同与入口
- `internal governance` 从产品 UI 摘除
- 前端 contract tests 重基线
- 路由、导航、设置入口重排
- 旧 UI 壳和错误页面入口的删除

本计划**不覆盖**：

- `growth -> soul` 主链彻底修复
- `identity_narrative` freshness 语义修复
- `adaptive_overlay` 运行时策略修复
- runtime memory / soul 注入链路统一

这些属于下一份实施计划。

## File Map

### Backend contracts / routers

- Modify: `backend/app/gateway/routers/memory.py`
- Modify: `backend/app/gateway/routers/memory_canonical.py`
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/app/gateway/routers/memory_growth.py`
- Modify: `backend/app/gateway/routers/memory_ledger.py`
- Modify: `backend/app/gateway/routers/memory_evidence.py`
- Modify: `backend/app/gateway/routers/memory_runtime_trace.py`

### Frontend user-facing surfaces

- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-facts-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-search-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-search-results-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-growth-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-growth-panel.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-ledger-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-evidence-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-runtime-trace-page.tsx`
- Replace: `frontend/src/components/workspace/memory/soul-console-page.tsx` with settings-owned Soul surface

### Frontend data clients

- Modify: `frontend/src/core/memory/api.ts`
- Modify: `frontend/src/core/memory/hooks.ts`
- Modify: `frontend/src/core/memory-canonical/api.ts`
- Modify: `frontend/src/core/memory-canonical/hooks.ts`
- Modify: `frontend/src/core/soul-console/api.ts`
- Modify: `frontend/src/core/soul-console/hooks.ts`
- Delete/retire: `frontend/src/core/soul/api.ts`
- Delete/retire: `frontend/src/core/memory-growth-v2/*`

### Navigation / routes

- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Create: `frontend/src/app/workspace/settings/soul/page.tsx` or equivalent settings-owned route if current settings architecture requires it

### Tests / docs

- Modify: `frontend/src/components/workspace/memory/memory-routes.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-route-smoke.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`
- Delete/retire: `frontend/src/components/workspace/memory/memory-growth-panel.contract.test.ts`
- Delete/retire: `frontend/src/components/workspace/memory/soul-proposal-list.contract.test.ts`
- Delete/retire: `frontend/src/components/workspace/memory/soul-growth-timeline.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/soul-console-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/soul-summary-card.contract.test.ts`
- Delete/retire: `frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts`
- Modify: `docs/test/10-memory-soul/README.md`
- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`

## Task 1: Freeze The New Product Contract In Tests

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/soul-console-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/soul-summary-card.contract.test.ts`
- Delete: `frontend/src/components/workspace/memory/memory-growth-panel.contract.test.ts`
- Delete: `frontend/src/components/workspace/memory/soul-proposal-list.contract.test.ts`
- Delete: `frontend/src/components/workspace/memory/soul-growth-timeline.contract.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts`
- Test: `pnpm --dir frontend test:contracts -- <memory/soul files>`

- [ ] **Step 1: Rewrite the failing home-page contract around the new product boundary**

```ts
void test("memory home page only exposes user-facing memory content groups", async () => {
  const source = await readFile(new URL("./memory-home-page.tsx", import.meta.url), "utf8");

  assert.match(source, /用户画像|长期背景|事实记忆/);
  assert.doesNotMatch(source, /Agent Growth/);
  assert.doesNotMatch(source, /Memory ledger/);
  assert.doesNotMatch(source, /Memory evidence/);
  assert.doesNotMatch(source, /Runtime trace/);
  assert.doesNotMatch(source, /检索控制台/);
});
```

- [ ] **Step 2: Rewrite the failing user-page contract to enforce read-only behavior**

```ts
void test("memory user page is read-only and uses conversation-based correction", async () => {
  const source = await readFile(new URL("./memory-user-page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /修正/);
  assert.doesNotMatch(source, /冻结/);
  assert.doesNotMatch(source, /申请遗忘/);
  assert.doesNotMatch(source, /拒绝/);
  assert.match(source, /这条记错了|别再记这个/);
});
```

- [ ] **Step 3: Rewrite the soul contract to enforce settings semantics instead of console semantics**

```ts
void test("soul page exposes stable settings instead of governance console metadata", async () => {
  const source = await readFile(new URL("./soul-console-page.tsx", import.meta.url), "utf8");

  assert.match(source, /核心人格|说话方式|价值观|关系基调/);
  assert.match(source, /草稿|应用/);
  assert.doesNotMatch(source, /revision/i);
  assert.doesNotMatch(source, /evidence_ref/i);
  assert.doesNotMatch(source, /rollback/i);
  assert.doesNotMatch(source, /冻结自动演化/);
});
```

- [ ] **Step 4: Delete or retire the contracts that lock the wrong product shape**

```text
Remove contracts that require:
- growth controls
- proposal accept/reject
- memory surface tabs null-shell retention
```

- [ ] **Step 5: Run the contract subset and verify the new tests fail for the right reasons**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/memory/memory-user-page.contract.test.ts \
  src/components/workspace/memory/soul-console-page.contract.test.ts \
  src/components/workspace/memory/soul-summary-card.contract.test.ts
```

Expected:
- FAIL on current implementation because old UI affordances still exist

- [ ] **Step 6: Commit the contract baseline rewrite**

```bash
git add frontend/src/components/workspace/memory/*.contract.test.ts \
  frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts
git commit -m "test: redefine memory and soul product contracts"
```

## Task 2: Introduce The Canonical User-Facing Memory Contract

**Files:**
- Modify: `backend/app/gateway/routers/memory.py`
- Modify: `backend/app/gateway/routers/memory_canonical.py`
- Modify: `frontend/src/core/memory/api.ts`
- Modify: `frontend/src/core/memory/hooks.ts`
- Modify: `frontend/src/core/memory-canonical/api.ts`
- Test: `backend/tests/test_memory_router.py`, `backend/tests/test_memory_canonical_router.py`, targeted frontend contract tests

- [ ] **Step 1: Define the backend response model around grouped user-facing memory**

```python
class MemoryUserFacingItem(BaseModel):
    id: str
    content: str
    source_label: str
    updated_at: str
    reason: str
    related_refs: list[str] = Field(default_factory=list)

class MemoryUserFacingResponse(BaseModel):
    user_profile: list[MemoryUserFacingItem]
    long_term_background: list[MemoryUserFacingItem]
    fact_memories: list[MemoryUserFacingItem]
```

- [ ] **Step 2: Make `/api/memory` return the user-facing DTO instead of the old mixed payload**

```python
@router.get("/memory", response_model=MemoryUserFacingResponse)
async def get_memory() -> MemoryUserFacingResponse:
    return MemoryUserFacingResponse(**build_memory_user_facing_payload())
```

- [ ] **Step 3: Keep canonical helper functions but make the frontend primary path consume the new contract**

```ts
export async function loadMemory(): Promise<MemoryUserFacingResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory`);
  // validate grouped user-facing payload here
}
```

- [ ] **Step 4: Run router tests and confirm the old payload shape is no longer assumed**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_router.py \
  backend/tests/test_memory_canonical_router.py -q
```

Expected:
- FAIL where tests still expect the legacy payload shape

- [ ] **Step 5: Commit the new memory contract layer**

```bash
git add backend/app/gateway/routers/memory.py \
  backend/app/gateway/routers/memory_canonical.py \
  frontend/src/core/memory/api.ts \
  frontend/src/core/memory/hooks.ts \
  frontend/src/core/memory-canonical/api.ts
git commit -m "feat: add canonical user-facing memory contract"
```

## Task 3: Introduce The Soul Settings Contract

**Files:**
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `frontend/src/core/soul-console/api.ts`
- Modify: `frontend/src/core/soul-console/types.ts`
- Delete/retire: `frontend/src/core/soul/api.ts`
- Test: `backend/tests/test_memory_growth_router.py`, soul contract tests

- [ ] **Step 1: Replace console-style payload fields with settings-style payload fields**

```python
class SoulSettingsResponse(BaseModel):
    core_identity: str
    speech_style: str
    values_and_boundaries: str
    relationship_stance: str
    has_active_overlay: bool
    adaptive_overlay_summary: str | None = None
```

- [ ] **Step 2: Remove proposal/governance semantics from the frontend soul client**

```ts
export async function loadSoulSettings(): Promise<SoulSettingsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/soul`);
  // validate settings-shaped payload
}
```

- [ ] **Step 3: Delete the growth-backed soul proposal client**

```text
Retire:
- useSoulProposals
- acceptSoulProposal
- rejectSoulProposal
- soul events as product UI dependencies
```

- [ ] **Step 4: Run the soul-focused tests and verify current console assumptions fail**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/soul-console-page.contract.test.ts \
  src/components/workspace/memory/soul-summary-card.contract.test.ts
```

Expected:
- FAIL until the UI and types are updated to the settings contract

- [ ] **Step 5: Commit the soul settings contract work**

```bash
git add backend/app/gateway/routers/memory_soul.py \
  backend/packages/harness/nion/memory/soul/console_service.py \
  frontend/src/core/soul-console/api.ts \
  frontend/src/core/soul-console/types.ts \
  frontend/src/core/soul/api.ts
git commit -m "feat: introduce soul settings contract"
```

## Task 4: Remove Internal Governance From The Product IA

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Test: route contract tests

- [ ] **Step 1: Strip growth, ledger, evidence, runtime-trace, search, and facts from the Memory home IA**

```tsx
const entries = [
  { key: "user_profile", title: "用户画像" },
  { key: "long_term_background", title: "长期背景" },
  { key: "fact_memories", title: "事实记忆" },
];
```

- [ ] **Step 2: Remove public desktop routes for growth and runtime trace**

```tsx
// delete route registrations for:
// /workspace/memory/growth
// /workspace/memory/runtime-trace
// and the current memory/soul coupling route shape
```

- [ ] **Step 3: Keep only product-level navigation entries**

```tsx
// nav and command palette keep:
// - Memory
// - Settings
// Soul enters through Settings, not top-level workspace navigation
```

- [ ] **Step 4: Run route tests and verify the old split-surface assumptions fail**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-routes.contract.test.ts \
  src/components/workspace/memory/memory-route-smoke.contract.test.ts
```

Expected:
- FAIL until route expectations are rewritten to match the new IA

- [ ] **Step 5: Commit the IA boundary cut**

```bash
git add frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/core/navigation/desktop-routes.ts \
  desktop/src/renderer/renderer-app.tsx \
  frontend/src/components/workspace/workspace-nav-menu.tsx \
  frontend/src/components/workspace/command-palette.tsx \
  frontend/src/components/workspace/settings/memory-settings-page.tsx
git commit -m "feat: remove internal governance from product navigation"
```

## Task 5: Rebuild Memory Into A Single Read-Only Content Surface

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-facts-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-search-page.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-search-results-page.tsx`
- Test: memory page contract tests

- [ ] **Step 1: Convert Memory home into the single grouped content page**

```tsx
<section>
  <MemoryGroup title="用户画像" items={memory.user_profile} />
  <MemoryGroup title="长期背景" items={memory.long_term_background} />
  <MemoryGroup title="事实记忆" items={memory.fact_memories} />
</section>
```

- [ ] **Step 2: Remove write actions and replace them with conversation guidance**

```tsx
<p className="text-xs text-muted-foreground">
  如果这条记忆有误，直接告诉我：这条记错了，或别再记这个。
</p>
```

- [ ] **Step 3: Delete the standalone Facts/Search product pages and their route usage**

```text
Retire:
- MemoryFactsPage
- MemorySearchPage
- MemorySearchResultsPage
```

- [ ] **Step 4: Run the page contracts and make sure the UI now matches the read-only model**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/memory/memory-user-page.contract.test.ts
```

Expected:
- PASS once write affordances and split pages are removed

- [ ] **Step 5: Commit the new Memory surface**

```bash
git add frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/components/workspace/memory/memory-user-page.tsx \
  frontend/src/components/workspace/memory/memory-summary-cards.tsx \
  frontend/src/components/workspace/memory/memory-facts-page.tsx \
  frontend/src/components/workspace/memory/memory-search-page.tsx \
  frontend/src/components/workspace/memory/memory-search-results-page.tsx
git commit -m "feat: rebuild memory as a single read-only surface"
```

## Task 6: Move Soul Into Settings And Remove Console Semantics

**Files:**
- Create: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/memory/soul-console-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/soul-console/hooks.ts`
- Test: soul contract tests

- [ ] **Step 1: Create the settings-owned Soul surface**

```tsx
export function SoulSettingsPage() {
  return (
    <section>
      <h2>Soul</h2>
      <SoulDraftForm />
      <Button>应用</Button>
    </section>
  );
}
```

- [ ] **Step 2: Remove console-only metadata and governance buttons**

```tsx
// delete:
// revision labels
// evidence ref
// rollback buttons
// freeze auto evolution buttons
```

- [ ] **Step 3: Keep only weak adaptive overlay visibility**

```tsx
{hasActiveOverlay ? (
  <p className="text-sm text-muted-foreground">
    当前存在临时表达模式：{adaptiveOverlaySummary}
  </p>
) : null}
```

- [ ] **Step 4: Run soul contract tests**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/soul-console-page.contract.test.ts \
  src/components/workspace/memory/soul-summary-card.contract.test.ts
```

Expected:
- PASS once the soul page behaves like settings, not a governance console

- [ ] **Step 5: Commit the Soul settings migration**

```bash
git add frontend/src/components/workspace/settings/soul-settings-page.tsx \
  frontend/src/components/workspace/memory/soul-console-page.tsx \
  frontend/src/components/workspace/settings/settings-dialog.tsx \
  frontend/src/core/soul-console/hooks.ts
git commit -m "feat: move soul into settings"
```

## Task 7: Retire Product-Surface Shells And Stranded Components

**Files:**
- Delete/retire: `frontend/src/core/memory-growth-v2/*`
- Delete/retire: `frontend/src/components/workspace/settings/memory-surface-tabs.tsx`
- Delete/retire: `frontend/src/components/workspace/settings/memory-console-panel.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/memory-growth-panel.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/soul-proposal-list.tsx`
- Delete/retire: `frontend/src/components/workspace/memory/soul-growth-timeline.tsx`
- Test: contract/test references

- [ ] **Step 1: Remove the forwarding shell layer**

```text
Delete:
- frontend/src/core/memory-growth-v2/api.ts
- frontend/src/core/memory-growth-v2/hooks.ts
- frontend/src/core/memory-growth-v2/types.ts
```

- [ ] **Step 2: Remove null-shell and unused settings components**

```text
Delete:
- MemorySurfaceTabs
- MemoryConsolePanel
```

- [ ] **Step 3: Remove Growth/Soul proposal UI components that no longer exist in product semantics**

```text
Delete:
- MemoryGrowthPanel
- SoulProposalList
- SoulGrowthTimeline
```

- [ ] **Step 4: Run a repository grep to ensure no production references remain**

Run:

```bash
rg -n "memory-growth-v2|MemorySurfaceTabs|MemoryConsolePanel|SoulProposalList|SoulGrowthTimeline|MemoryGrowthPanel" frontend/src desktop/src
```

Expected:
- No production references remain

- [ ] **Step 5: Commit the shell cleanup**

```bash
git add -A frontend/src/core/memory-growth-v2 \
  frontend/src/components/workspace/settings/memory-surface-tabs.tsx \
  frontend/src/components/workspace/settings/memory-console-panel.tsx \
  frontend/src/components/workspace/memory/memory-growth-panel.tsx \
  frontend/src/components/workspace/memory/soul-proposal-list.tsx \
  frontend/src/components/workspace/memory/soul-growth-timeline.tsx
git commit -m "refactor: remove retired memory and soul UI shells"
```

## Task 8: Update Behavioral Docs To Match The New Boundary

**Files:**
- Modify: `docs/test/10-memory-soul/README.md`
- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`
- Test: doc sanity via grep

- [ ] **Step 1: Remove references to proposal/governance console concepts**

```md
- remove proposal language
- remove accept/reject language
- remove growth console assumptions
```

- [ ] **Step 2: Rewrite the behavioral questions around the new model**

```md
- Memory asks: what do you remember about me?
- Soul asks: what is your long-term way of speaking to me?
- Correction asks: if I say this memory is wrong, can you update it through conversation?
```

- [ ] **Step 3: Run a grep check for banned concepts**

Run:

```bash
rg -n "proposal|accept|reject|growth console|rollback|freeze auto evolution" docs/test/10-memory-soul
```

Expected:
- No matches for removed product concepts

- [ ] **Step 4: Commit the updated acceptance baseline**

```bash
git add docs/test/10-memory-soul/README.md \
  docs/test/10-memory-soul/behavioral-acceptance-questions.md
git commit -m "docs: update memory and soul behavioral baseline"
```

## Task 9: Final Verification And Release Gate For Subproject A

**Files:**
- Modify: `docs/reviews/2026-04-09-memory-soul-analysis-process.md` (optional evidence append)
- Test: backend router tests, frontend contract tests, grep checks

- [ ] **Step 1: Run the backend router-focused verification**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_router.py \
  backend/tests/test_memory_canonical_router.py \
  backend/tests/test_memory_growth_router.py -q
```

Expected:
- PASS with growth routes either removed from product assumptions or explicitly internalized

- [ ] **Step 2: Run the frontend contract verification for the new product boundary**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/memory/memory-user-page.contract.test.ts \
  src/components/workspace/memory/soul-console-page.contract.test.ts \
  src/components/workspace/memory/soul-summary-card.contract.test.ts \
  src/components/workspace/memory/memory-routes.contract.test.ts \
  src/components/workspace/memory/memory-route-smoke.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 3: Run the cleanup grep checks**

Run:

```bash
rg -n "proposal|accept|reject|MemoryGrowthPanel|SoulProposalList|SoulGrowthTimeline|memory-growth-v2" frontend/src docs/test/10-memory-soul
```

Expected:
- No product-surface references remain

- [ ] **Step 4: Commit the verification evidence**

```bash
git add docs/reviews/2026-04-09-memory-soul-analysis-process.md
git commit -m "test: verify memory and soul boundary-contract rollout"
```

## Spec Coverage Check

- Covers the Memory user-facing contract
- Covers the Soul settings contract
- Covers removal of internal governance from product UI
- Covers route and navigation migration
- Covers contract test rewrite and deletion
- Leaves runtime-chain semantics for the next plan intentionally

## Type / Naming Consistency Check

- `memory user-facing`
- `soul settings`
- `internal governance`

These names are used consistently across tasks and should remain the only three top-level contract names in this plan.

## Execution Note

This plan intentionally does **not** touch:
- `growth -> soul` full runtime semantics
- `identity_narrative` long-term freshness removal in runtime behavior
- full internal backend capability retirement

Those belong in the next implementation plan after Subproject A lands.
