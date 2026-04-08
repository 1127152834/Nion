# Memory Soul Dual-Layer M2 Judge And Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the new canonical memory model operational by delivering proposal extraction, Memory Judge, revisions/decisions/user-overrides, and production-grade governance surfaces that preserve current memory-growth and soul mutation contracts.

**Architecture:** M2 promotes the new memory stack from storage backbone to canonical governance engine. Existing memory-growth, user-model, and soul proposal routes stay alive, but they are re-implemented through canonical nodes, revisions, and decisions. The phase also ships user-facing Memory Ledger and Evidence Explorer interactions with direct freeze/delete/rewrite semantics.

**Tech Stack:** Python 3.12, FastAPI, SQLite, Pydantic, LangChain/LangGraph message processing, React 19, TypeScript, TanStack Query, `uv run pytest`, `pnpm --dir frontend test:contracts`

---

## File Structure

### New Backend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/extraction/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/extraction/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/judge/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/judge/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/governance/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_extraction_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_judge_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_governance_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_growth_compat_adapter.py`

### Modified Backend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/repository.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/compat.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_growth.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/learning.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_governance.py`

### New Frontend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-ledger-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-evidence-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-ledger-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-evidence-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/actions.ts`

### Modified Frontend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-page.tsx`

## Task 1: Introduce Structured Proposal And Judge Models

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/extraction/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/judge/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_judge_service.py`

- [ ] **Step 1: Write failing tests for proposal and judge result shapes**

```python
from nion.memory.extraction.models import MemoryProposal
from nion.memory.judge.models import MemoryJudgeDecision


def test_memory_proposal_captures_change_type_and_evidence():
    proposal = MemoryProposal(
        proposal_id="prop_1",
        proposed_domain="user_model",
        proposed_kind="preference",
        candidate_claim="用户偏好结论先行",
        candidate_payload={},
        supporting_evidence_ids=["ev_1"],
        estimated_stability="stable",
        estimated_salience=0.8,
        estimated_confidence=0.9,
        change_type="new",
        judge_hints=["explicit_user_statement"],
    )

    assert proposal.change_type == "new"
    assert proposal.supporting_evidence_ids == ["ev_1"]


def test_memory_judge_decision_can_mark_reinforcement():
    decision = MemoryJudgeDecision(
        action="reinforce_existing",
        target_memory_id="mem_1",
        target_revision_id="rev_1",
        rationale="Repeated explicit preference",
        created_revision=None,
        created_decision_id="dec_1",
    )

    assert decision.action == "reinforce_existing"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_judge_service.py -q
```

Expected: import failure

- [ ] **Step 3: Implement proposal and judge result models**

Implement:

- `MemoryProposal`
- `SoulSignal`
- `MemoryJudgeDecision`
- enums/literals for `change_type`, `estimated_stability`, `action`

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_judge_service.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/extraction/models.py \
  backend/packages/harness/nion/memory/judge/models.py \
  backend/tests/test_memory_judge_service.py
git commit -m "feat: add memory proposal and judge models"
```

### Task 2: Build Extraction Service From Evidence, Not Keyword Demo Logic

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/extraction/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_extraction_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/extractor.py`

- [ ] **Step 1: Write failing tests for evidence-backed extraction**

```python
from nion.memory.extraction.service import extract_memory_candidates
from nion.memory.evidence_vault.models import EvidenceDocument


def test_extract_memory_candidates_generates_structured_preference_proposal():
    evidence = EvidenceDocument(
        evidence_id="ev_1",
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        created_at="2026-04-08T00:00:00Z",
        content_raw="以后跟我汇报时先给结论，再展开细节。",
        content_normalized="以后跟我汇报时先给结论，再展开细节。",
        artifact_uri=None,
        sensitivity="normal",
        retention_class="core",
        durability_scope="durable_user_memory",
        checksum="sha",
        metadata={},
    )

    proposals, soul_signals = extract_memory_candidates([evidence])

    assert proposals
    assert proposals[0].proposed_domain == "user_model"
    assert proposals[0].proposed_kind == "preference"
    assert "结论先行" in proposals[0].candidate_claim
    assert soul_signals == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_extraction_service.py -q
```

Expected: import failure

- [ ] **Step 3: Implement extraction service and downgrade old extractor to compatibility shim**

Implement:

- evidence-backed extraction function
- support at least:
  - explicit preference
  - work context
  - address style
  - initiative boundary
  - learning topic hints
- keep old `memory_os/extractor.py` as a thin compatibility import or wrapper, not as primary logic

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_extraction_service.py tests/test_memory_os_post_turn_capture.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/extraction/service.py \
  backend/packages/harness/nion/memory_os/extractor.py \
  backend/tests/test_memory_extraction_service.py
git commit -m "feat: replace keyword extractor with evidence extraction service"
```

### Task 3: Implement Canonical Memory Judge And Governance Decisions

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/judge/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/governance/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_governance_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/repository.py`

- [ ] **Step 1: Write failing tests for new/reinforce/revise outcomes**

```python
from pathlib import Path

from nion.memory.judge.service import judge_memory_proposals
from nion.memory.extraction.models import MemoryProposal
from nion.memory_os.repository import MemoryOSRepository


def test_judge_creates_new_memory_node_when_no_existing_match(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = MemoryProposal(
        proposal_id="prop_1",
        proposed_domain="user_model",
        proposed_kind="preference",
        candidate_claim="用户偏好结论先行",
        candidate_payload={},
        supporting_evidence_ids=["ev_1"],
        estimated_stability="stable",
        estimated_salience=0.8,
        estimated_confidence=0.9,
        change_type="new",
        judge_hints=[],
    )

    decisions = judge_memory_proposals(repo, [proposal], user_overrides=[])

    assert decisions[0].action == "accept"


def test_judge_respects_frozen_user_override(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    memory_id = repo.create_memory_node_for_test(
        domain="user_model",
        kind="preference",
        claim="用户偏好强提醒",
        status="frozen",
        traceability_state="full",
    )
    proposal = MemoryProposal(
        proposal_id="prop_2",
        proposed_domain="user_model",
        proposed_kind="preference",
        candidate_claim="用户偏好强提醒",
        candidate_payload={},
        supporting_evidence_ids=["ev_2"],
        estimated_stability="stable",
        estimated_salience=0.8,
        estimated_confidence=0.9,
        change_type="reinforce",
        judge_hints=[],
    )

    decisions = judge_memory_proposals(repo, [proposal], user_overrides=[{"memory_id": memory_id, "action": "freeze"}])

    assert decisions[0].action == "defer"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_governance_service.py -q
```

Expected: failures for missing judge implementation / helper methods

- [ ] **Step 3: Implement judge + governance services**

Implement:

- matching existing canonical memory by domain/kind/claim similarity
- actions:
  - `accept`
  - `accept_as_revision`
  - `reinforce_existing`
  - `reject`
  - `defer`
- write `MemoryDecision`
- create or update `MemoryRevision`
- respect user overrides and `frozen` state

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_governance_service.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/judge/service.py \
  backend/packages/harness/nion/memory/governance/service.py \
  backend/packages/harness/nion/memory_os/repository.py \
  backend/tests/test_memory_governance_service.py
git commit -m "feat: add canonical memory judge and governance"
```

### Task 4: Adapt Existing `/api/memory` And Growth/Soul Mutation Contracts To Canonical Store

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/compat.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_growth.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/learning.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_governance.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_growth_compat_adapter.py`

- [ ] **Step 1: Write failing adapter tests**

```python
from fastapi.testclient import TestClient

from app.gateway.app import app


def test_growth_user_model_actions_continue_working_via_canonical_store():
    client = TestClient(app)
    response = client.get("/api/memory/growth/user-model")
    assert response.status_code == 200


def test_soul_proposal_accept_route_still_exists():
    client = TestClient(app)
    response = client.get("/api/memory/growth/soul/proposals")
    assert response.status_code == 200
```

- [ ] **Step 2: Run tests to verify current incompatibilities**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_growth_compat_adapter.py \
  tests/test_memory_router.py \
  tests/test_memory_growth_router.py -q
```

Expected: failures once canonical objects are not yet backing adapter paths

- [ ] **Step 3: Reimplement compatibility adapters on top of canonical store**

Implement:

- `/api/memory` compatibility view built from canonical nodes/revisions
- `/api/memory/growth` reading canonical `learning`, `procedure`, `soul`
- `/api/memory/growth/{id}/*` mutations mapped to canonical actions
- `/api/memory/growth/user-model/{id}/*` mapped to canonical user overrides
- `/api/memory/growth/soul/proposals/*` mapped to canonical soul governance

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_growth_compat_adapter.py \
  tests/test_memory_router.py \
  tests/test_memory_growth_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/compat.py \
  backend/app/gateway/routers/memory.py \
  backend/app/gateway/routers/memory_growth.py \
  backend/packages/harness/nion/memory_os/learning.py \
  backend/packages/harness/nion/memory_os/soul_governance.py \
  backend/tests/test_memory_growth_compat_adapter.py
git commit -m "feat: adapt memory growth routes to canonical store"
```

### Task 5: Ship Memory Ledger And Evidence Explorer Governance UI

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-ledger-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-evidence-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-ledger-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-evidence-page.contract.test.ts`

- [ ] **Step 1: Add failing contract tests for governance semantics**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

void test("memory ledger page exposes freeze delete rewrite revision and evidence actions", async () => {
  const source = await readFile(new URL("./memory-ledger-page.tsx", import.meta.url), "utf8");
  assert.match(source, /冻结/);
  assert.match(source, /删除/);
  assert.match(source, /改写/);
  assert.match(source, /revision/i);
  assert.match(source, /evidence/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  src/components/workspace/memory/memory-evidence-page.contract.test.ts
```

Expected: failures due to missing pages

- [ ] **Step 3: Implement governance pages and hook them up**

Implement:

- Memory Ledger page with:
  - canonical node rows
  - freeze/delete/rewrite action affordances
  - traceability badge
  - revision/evidence entry points
- Evidence Explorer page with:
  - filters by source_type/thread/actor
  - evidence list and summary

Keep current Memory home page and user page intact, but add links and replace direct user-model actions with canonical equivalents where available.

- [ ] **Step 4: Run contract tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  src/components/workspace/memory/memory-evidence-page.contract.test.ts \
  src/components/workspace/memory/memory-home-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/memory/memory-ledger-page.tsx \
  frontend/src/components/workspace/memory/memory-evidence-page.tsx \
  frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/components/workspace/memory/memory-user-page.tsx \
  frontend/src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  frontend/src/components/workspace/memory/memory-evidence-page.contract.test.ts
git commit -m "feat: ship memory governance surfaces"
```

### Task 6: Verify Canonical Governance Milestone And Record Checkpoint

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md`

- [ ] **Step 1: Run backend milestone verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_extraction_service.py \
  tests/test_memory_judge_service.py \
  tests/test_memory_governance_service.py \
  tests/test_memory_growth_compat_adapter.py \
  tests/test_memory_router.py \
  tests/test_memory_growth_router.py -q
```

Expected: PASS

- [ ] **Step 2: Run frontend governance verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  src/components/workspace/memory/memory-evidence-page.contract.test.ts \
  src/components/workspace/memory/memory-home-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 3: Update roadmap/spec checkpoint notes**

Record that M2 completion means:

- canonical judge exists
- compatibility adapters back existing growth/soul routes
- user overrides are real canonical actions
- `learning` remains first-class
- ledger/evidence governance UI exists

- [ ] **Step 4: Commit**

```bash
git add \
  docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md \
  docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md
git commit -m "docs: record m2 dual-layer memory checkpoint"
```
