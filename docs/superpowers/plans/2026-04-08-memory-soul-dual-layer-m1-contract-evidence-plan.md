# Memory Soul Dual-Layer M1 Contract And Evidence Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete production-safe layer of the new memory architecture: canonical v2 contracts, Evidence Vault storage, session-gated durable capture, and initial read-only governance surfaces without cutting the current primary memory product contracts.

**Architecture:** M1 does not make the new stack primary for long-term reasoning yet. It adds a new canonical data backbone beside the existing compatibility layer, captures real evidence into a `Paths`-aligned substrate, enforces `memory_write` durability gates, and exposes initial ledger/evidence/runtime-trace backend surfaces behind adapters. Existing `/api/memory` and `/api/memory/growth*` routes must remain stable.

**Tech Stack:** Python 3.12, FastAPI, SQLite, Pydantic, local filesystem, LangChain/LangGraph runtime context, React 19, TypeScript, TanStack Query, `uv run pytest`, `pnpm --dir frontend test:contracts`

---

## File Structure

### New Backend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/models.py`
  - `EvidenceDocument`, `EvidenceChunk`, `EvidenceTombstone`, durability scope types
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/store.py`
  - durable filesystem + SQLite metadata persistence
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/fts.py`
  - FTS index bootstrap and writes
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_capture/service.py`
  - capture service with session-policy gate
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/session_policy.py`
  - `MemorySessionPolicy`, `resolve_memory_session_policy`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_trace/models.py`
  - runtime trace event payloads
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_trace/store.py`
  - runtime trace persistence
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_ledger.py`
  - read-only v2 ledger endpoints
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_evidence.py`
  - evidence explorer endpoints
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_runtime_trace.py`
  - runtime trace endpoints
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_session_policy.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_evidence_vault_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_evidence_capture_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_ledger_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_evidence_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_runtime_trace_router.py`

### Modified Backend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py`
  - add `memory_os_evidence_dir`, `memory_os_indexes_dir`, `memory_os_fts_dir`, `memory_os_vector_dir`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/models.py`
  - add v2 canonical models or re-export them from a new module with `traceability_state`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/repository.py`
  - add v2 canonical tables, keep old `memory_records` intact
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py`
  - propagate session policy context into runtime
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
  - pass session policy into embedded runtime
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`
  - register new routers

### New Frontend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-evidence/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-evidence/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-evidence/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-runtime-trace/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-runtime-trace/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-runtime-trace/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-ledger-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-evidence-page.contract.test.ts`

### Modified Frontend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
  - prepare room for local embedding + session policy messaging
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`
  - add new ledger/evidence/runtime-trace navigation entry points without removing current pages

## Task 1: Lock Session Policy Durability Contract In Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_session_policy.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/session_policy.py`

- [ ] **Step 1: Write the failing session policy tests**

```python
from nion.memory.session_policy import resolve_memory_session_policy


def test_memory_write_false_disables_durable_capture_and_memory_write():
    policy = resolve_memory_session_policy(
        {
            "session_mode": "temporary_chat",
            "memory_read": True,
            "memory_write": False,
        }
    )

    assert policy.memory_read is True
    assert policy.memory_write is False
    assert policy.allow_durable_evidence is False
    assert policy.allow_memory_write is False


def test_memory_read_false_blocks_long_term_reads():
    policy = resolve_memory_session_policy(
        {
            "session_mode": "workspace",
            "memory_read": False,
            "memory_write": False,
        }
    )

    assert policy.memory_read is False
    assert policy.allow_memory_read is False
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_session_policy.py -q
```

Expected: import failure for `nion.memory.session_policy`

- [ ] **Step 3: Implement `MemorySessionPolicy` and resolver**

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MemorySessionPolicy:
    session_mode: str
    memory_read: bool
    memory_write: bool
    allow_memory_read: bool
    allow_memory_write: bool
    allow_durable_evidence: bool


def resolve_memory_session_policy(context: dict[str, Any] | None) -> MemorySessionPolicy:
    ctx = context or {}
    session_mode = str(ctx.get("session_mode") or "workspace")
    memory_read = bool(ctx.get("memory_read", True))
    memory_write = bool(ctx.get("memory_write", session_mode != "temporary_chat"))
    allow_memory_read = memory_read
    allow_memory_write = memory_write
    allow_durable_evidence = memory_write
    return MemorySessionPolicy(
        session_mode=session_mode,
        memory_read=memory_read,
        memory_write=memory_write,
        allow_memory_read=allow_memory_read,
        allow_memory_write=allow_memory_write,
        allow_durable_evidence=allow_durable_evidence,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_session_policy.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/session_policy.py \
  backend/tests/test_memory_session_policy.py
git commit -m "feat: add memory session policy gate"
```

### Task 2: Extend Paths And Canonical Memory V2 Tables

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/repository.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_v2_repository.py`

- [ ] **Step 1: Write failing repository tests for new canonical and evidence directories**

```python
from pathlib import Path

from nion.config.paths import Paths
from nion.memory_os.repository import MemoryOSRepository


def test_paths_expose_memory_os_evidence_and_index_dirs(tmp_path: Path):
    paths = Paths(tmp_path)

    assert paths.memory_os_evidence_dir == tmp_path / "memory-os" / "evidence"
    assert paths.memory_os_fts_dir == tmp_path / "memory-os" / "indexes" / "fts"
    assert paths.memory_os_vector_dir == tmp_path / "memory-os" / "indexes" / "vector"


def test_repository_bootstraps_v2_tables(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    status = repo.healthcheck()

    assert "memory_nodes" in status["tables"]
    assert "memory_revisions" in status["tables"]
    assert "memory_decisions" in status["tables"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_v2_repository.py -q
```

Expected: missing path properties and missing tables

- [ ] **Step 3: Extend `Paths` and bootstrap v2 tables**

Implement:

- new `Paths` properties:
  - `memory_os_evidence_dir`
  - `memory_os_indexes_dir`
  - `memory_os_fts_dir`
  - `memory_os_vector_dir`
- new canonical tables in `MemoryOSRepository`:
  - `memory_nodes`
  - `memory_revisions`
  - `memory_decisions`
  - `memory_links`
  - `user_overrides`

Keep old `memory_records` and `candidate_records` intact.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_v2_repository.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/memory_os/models.py \
  backend/packages/harness/nion/memory_os/repository.py \
  backend/tests/test_memory_os_v2_repository.py
git commit -m "feat: add memory v2 canonical storage foundation"
```

### Task 3: Build Evidence Vault Store And FTS Layer

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/fts.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_evidence_vault_store.py`

- [ ] **Step 1: Write failing tests for durable evidence, ephemeral evidence, and tombstones**

```python
from pathlib import Path

from nion.memory.evidence_vault.store import EvidenceVaultStore


def test_store_persists_durable_evidence_and_chunks(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")

    result = store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="用户说月底高压期需要低刺激支持。",
        durability_scope="durable_user_memory",
    )

    assert result.document.evidence_id
    assert result.chunks
    assert result.document_path.exists()


def test_store_keeps_tombstone_after_purge(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")
    result = store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="需要删除的原始证据",
        durability_scope="durable_user_memory",
    )

    tombstone = store.purge_document(result.document.evidence_id, deleted_by="user")

    assert tombstone.evidence_id == result.document.evidence_id
    assert tombstone.deleted_by == "user"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_evidence_vault_store.py -q
```

Expected: import failure

- [ ] **Step 3: Implement Evidence Vault models and store**

Implement:

- `EvidenceDocument`
- `EvidenceChunk`
- `EvidenceTombstone`
- file-backed document persistence in `{memory_os_dir}/evidence`
- SQLite metadata persistence
- simple chunking by paragraph with fallback
- purge preserving tombstone metadata and digest

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_evidence_vault_store.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/evidence_vault/models.py \
  backend/packages/harness/nion/memory/evidence_vault/store.py \
  backend/packages/harness/nion/memory/evidence_vault/fts.py \
  backend/tests/test_evidence_vault_store.py
git commit -m "feat: add evidence vault durable store"
```

### Task 4: Add Session-Gated Evidence Capture Service

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_capture/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_evidence_capture_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`

- [ ] **Step 1: Write failing tests for durable vs ephemeral capture**

```python
from nion.memory.evidence_capture.service import capture_turn_evidence
from nion.memory.session_policy import MemorySessionPolicy


def test_capture_turn_evidence_skips_durable_store_when_memory_write_is_false(tmp_path):
    policy = MemorySessionPolicy(
        session_mode="temporary_chat",
        memory_read=True,
        memory_write=False,
        allow_memory_read=True,
        allow_memory_write=False,
        allow_durable_evidence=False,
    )

    result = capture_turn_evidence(
        base_dir=tmp_path,
        policy=policy,
        thread_id="thread-1",
        turn_id="turn-1",
        user_text="hello",
        assistant_text="world",
    )

    assert result.durable_documents == []
    assert result.ephemeral_documents
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_evidence_capture_service.py -q
```

Expected: import failure

- [ ] **Step 3: Implement capture service and propagate policy context**

Implement:

- `capture_turn_evidence(...)`
- durable path when `allow_durable_evidence`
- session-local only result when not allowed
- `ThreadService.stream()` and `NionClient` forwarding of `session_mode / memory_read / memory_write`

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_evidence_capture_service.py tests/test_memory_session_policy.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/evidence_capture/service.py \
  backend/packages/harness/nion/client.py \
  backend/packages/harness/nion/threads/service.py \
  backend/tests/test_evidence_capture_service.py
git commit -m "feat: add session-gated evidence capture"
```

### Task 5: Expose Read-Only Ledger, Evidence, And Runtime Trace Backend Surfaces

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_trace/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_trace/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_ledger.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_evidence.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_runtime_trace.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_ledger_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_evidence_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_runtime_trace_router.py`

- [ ] **Step 1: Write failing router tests**

```python
from fastapi.testclient import TestClient

from app.gateway.app import app


def test_memory_ledger_router_exists():
    client = TestClient(app)
    response = client.get("/api/memory/ledger")
    assert response.status_code == 200


def test_memory_evidence_router_exists():
    client = TestClient(app)
    response = client.get("/api/memory/evidence")
    assert response.status_code == 200


def test_memory_runtime_trace_router_exists():
    client = TestClient(app)
    response = client.get("/api/memory/runtime-trace")
    assert response.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_ledger_router.py \
  tests/test_memory_evidence_router.py \
  tests/test_memory_runtime_trace_router.py -q
```

Expected: 404 or import failure

- [ ] **Step 3: Implement read-only routers and trace store**

Implement minimal stable payloads:

- `/api/memory/ledger`
  - list of canonical nodes and current revisions
- `/api/memory/evidence`
  - paginated evidence list + optional filter query params
- `/api/memory/runtime-trace`
  - paginated trace events

Keep these read-only in M1.

- [ ] **Step 4: Run router tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_ledger_router.py \
  tests/test_memory_evidence_router.py \
  tests/test_memory_runtime_trace_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/runtime_trace/models.py \
  backend/packages/harness/nion/memory/runtime_trace/store.py \
  backend/app/gateway/routers/memory_ledger.py \
  backend/app/gateway/routers/memory_evidence.py \
  backend/app/gateway/routers/memory_runtime_trace.py \
  backend/app/gateway/app.py \
  backend/tests/test_memory_ledger_router.py \
  backend/tests/test_memory_evidence_router.py \
  backend/tests/test_memory_runtime_trace_router.py
git commit -m "feat: add read-only memory governance routers"
```

### Task 6: Add Frontend Data Hooks And Navigation Entry Points For New Read Surfaces

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-ledger/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-evidence/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-evidence/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-evidence/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-runtime-trace/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-runtime-trace/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-runtime-trace/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-ledger-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-evidence-page.contract.test.ts`

- [ ] **Step 1: Write failing frontend contract tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

void test("memory home links to ledger and evidence surfaces", async () => {
  const source = await readFile(
    new URL("./memory-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Memory Ledger/);
  assert.match(source, /Evidence Explorer/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  src/components/workspace/memory/memory-evidence-page.contract.test.ts
```

Expected: file or string assertions fail

- [ ] **Step 3: Implement frontend API hooks and add home-page entry points**

Implement:

- typed `fetch` wrappers for new endpoints
- TanStack Query hooks
- new cards or nav entries on Memory home page

Do not replace existing pages yet.

- [ ] **Step 4: Run contract tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  src/components/workspace/memory/memory-evidence-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/core/memory-ledger/api.ts \
  frontend/src/core/memory-ledger/types.ts \
  frontend/src/core/memory-ledger/hooks.ts \
  frontend/src/core/memory-evidence/api.ts \
  frontend/src/core/memory-evidence/types.ts \
  frontend/src/core/memory-evidence/hooks.ts \
  frontend/src/core/memory-runtime-trace/api.ts \
  frontend/src/core/memory-runtime-trace/types.ts \
  frontend/src/core/memory-runtime-trace/hooks.ts \
  frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  frontend/src/components/workspace/memory/memory-evidence-page.contract.test.ts
git commit -m "feat: add memory governance read surface hooks"
```

### Task 7: Full Milestone Verification And Compatibility Check

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md`

- [ ] **Step 1: Run backend verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_session_policy.py \
  tests/test_memory_os_v2_repository.py \
  tests/test_evidence_vault_store.py \
  tests/test_evidence_capture_service.py \
  tests/test_memory_ledger_router.py \
  tests/test_memory_evidence_router.py \
  tests/test_memory_runtime_trace_router.py \
  tests/test_memory_router.py \
  tests/test_memory_growth_router.py -q
```

Expected: PASS

- [ ] **Step 2: Run frontend contract verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/memory/memory-ledger-page.contract.test.ts \
  src/components/workspace/memory/memory-evidence-page.contract.test.ts \
  src/components/workspace/memory/memory-home-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 3: Update roadmap/spec checkpoint notes**

Add an M1 checkpoint section summarizing:

- canonical v2 tables landed
- Evidence Vault exists
- session durability gates enforced
- ledger/evidence/runtime-trace read surfaces exist
- no primary read/write cutover yet

- [ ] **Step 4: Commit**

```bash
git add \
  docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md \
  docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md
git commit -m "docs: record m1 dual-layer memory checkpoint"
```
