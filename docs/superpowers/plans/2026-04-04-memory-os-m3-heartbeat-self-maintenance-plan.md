# Memory OS M3 Heartbeat And Self-Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Memory OS 加入 daemon-owned heartbeat、自主候选消费、diary 写入与 consolidation 骨架，使系统开始具备受控的后台自我维护能力，同时不影响聊天热路径。

**Architecture:** 这一阶段只实现 Memory OS 自己的 background maintenance backbone，不恢复旧的 AutoDream 产品面。沿用现有 `memory_middleware -> queue` 的“turn 后异步处理”思路，但把输出从 legacy `memory.json` 转为 `CandidateRecord + diary + consolidation event`，并新增 daemon-owned heartbeat 扫描和批处理服务。

**Tech Stack:** Python 3.12, SQLite, Pydantic, LangGraph middleware, daemon-owned background loops, pytest

---

## File Structure

### New Files

- `backend/packages/harness/nion/memory_os/candidates.py`
  - candidate queue/store and pop/peek helpers
- `backend/packages/harness/nion/memory_os/extractor.py`
  - post-turn extraction into `CandidateRecord`
- `backend/packages/harness/nion/memory_os/diary.py`
  - diary artifact writer
- `backend/packages/harness/nion/memory_os/consolidation.py`
  - minimal consolidation engine
- `backend/packages/harness/nion/memory_os/heartbeat.py`
  - daemon-owned heartbeat service and cadence handlers
- `backend/tests/test_memory_os_candidates.py`
- `backend/tests/test_memory_os_extractor.py`
- `backend/tests/test_memory_os_diary.py`
- `backend/tests/test_memory_os_consolidation.py`
- `backend/tests/test_memory_os_heartbeat.py`

### Modified Files

- `backend/packages/harness/nion/memory_os/repository.py`
  - add candidate CRUD and consolidation event helpers
- `backend/packages/harness/nion/memory_os/__init__.py`
  - export new M3 surface
- `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
  - add Memory OS extraction enqueue bridge while keeping current legacy queue path intact
- `backend/packages/harness/nion/config/paths.py`
  - add diary / candidates / maintenance artifact paths

## Task 1: Add Candidate Queue Store

**Files:**
- Create: `backend/packages/harness/nion/memory_os/candidates.py`
- Modify: `backend/packages/harness/nion/memory_os/repository.py`
- Test: `backend/tests/test_memory_os_candidates.py`

- [ ] **Step 1: Write the failing test**

```python
from pathlib import Path

from nion.memory_os.candidates import MemoryOSCandidateQueue
from nion.memory_os.models import CandidateRecord
from nion.memory_os.repository import MemoryOSRepository


def test_candidate_queue_round_trips_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    queue = MemoryOSCandidateQueue(repo)
    candidate = CandidateRecord(
        candidate_id="cand_01",
        proposed_domain="learning",
        proposed_subtype="topic",
        owner_type="agent",
        scope="user",
        memory_type="semantic",
        summary="用户反复询问财务表达。",
        raw_evidence_refs=["thread:abc#msg_2"],
        confidence=0.6,
        status="candidate",
        created_at="2026-04-04T00:00:00Z",
        expires_at="2026-04-18T00:00:00Z",
        producer="post_turn_extractor",
    )

    queue.push(candidate)
    rows = queue.list_pending()

    assert len(rows) == 1
    assert rows[0].candidate_id == "cand_01"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_candidates.py -q
```

Expected: import failure or missing repository methods

- [ ] **Step 3: Implement candidate queue helpers**

Implement in repository:

- `save_candidate_record()`
- `list_candidate_records()`
- `delete_candidate_record()`

Implement `MemoryOSCandidateQueue` with:

- `push()`
- `list_pending()`
- `remove()`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_candidates.py -q
```

Expected: PASS

## Task 2: Add Post-Turn Extractor

**Files:**
- Create: `backend/packages/harness/nion/memory_os/extractor.py`
- Test: `backend/tests/test_memory_os_extractor.py`

- [ ] **Step 1: Write the failing test**

```python
from langchain_core.messages import AIMessage, HumanMessage

from nion.memory_os.extractor import extract_candidates_from_exchange


def test_extractor_turns_user_preference_signal_into_candidate():
    candidates = extract_candidates_from_exchange(
        messages=[
            HumanMessage(content="以后你直接一点，先给结论。"),
            AIMessage(content="明白。"),
        ],
        thread_id="thread-1",
    )

    assert candidates
    assert any("直接" in candidate.summary for candidate in candidates)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_extractor.py -q
```

Expected: import failure

- [ ] **Step 3: Implement minimal extractor**

Implement a conservative extractor that:

- scans latest human text
- if it sees strong preference phrases, emits `user_model` candidate
- if it sees “不要/可以提醒我”等互动边界 phrases, emits `relationship` candidate

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_extractor.py -q
```

Expected: PASS

## Task 3: Add Diary Writer

**Files:**
- Create: `backend/packages/harness/nion/memory_os/diary.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Test: `backend/tests/test_memory_os_diary.py`

- [ ] **Step 1: Write the failing diary test**

```python
from pathlib import Path

from nion.memory_os.diary import MemoryOSDiaryWriter


def test_diary_writer_creates_markdown_artifact(tmp_path: Path):
    writer = MemoryOSDiaryWriter(base_dir=tmp_path)
    path = writer.write_entry(
        thread_id="thread-1",
        summary="今天用户连续问了财务汇报结构。",
        repeated_needs=["财务汇报结构"],
    )

    body = Path(path).read_text(encoding="utf-8")
    assert "财务汇报结构" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_diary.py -q
```

Expected: import failure or missing path helper

- [ ] **Step 3: Implement diary writer and path helpers**

Add to `Paths`:

- `memory_os_diary_dir`

Implement `MemoryOSDiaryWriter.write_entry()` to create dated markdown file under that dir.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_diary.py -q
```

Expected: PASS

## Task 4: Add Minimal Consolidation Engine

**Files:**
- Create: `backend/packages/harness/nion/memory_os/consolidation.py`
- Modify: `backend/packages/harness/nion/memory_os/repository.py`
- Test: `backend/tests/test_memory_os_consolidation.py`

- [ ] **Step 1: Write the failing consolidation test**

```python
from pathlib import Path

from nion.memory_os.candidates import MemoryOSCandidateQueue
from nion.memory_os.consolidation import MemoryOSConsolidationEngine
from nion.memory_os.models import CandidateRecord
from nion.memory_os.repository import MemoryOSRepository


def test_consolidation_engine_promotes_candidate_to_memory_record(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    queue = MemoryOSCandidateQueue(repo)
    queue.push(
        CandidateRecord(
            candidate_id="cand_01",
            proposed_domain="user_model",
            proposed_subtype="communication_preference",
            owner_type="agent",
            scope="user",
            memory_type="semantic",
            summary="用户偏好先给结论。",
            raw_evidence_refs=["thread:1#msg_1"],
            confidence=0.8,
            status="candidate",
            created_at="2026-04-04T00:00:00Z",
            expires_at="2026-04-18T00:00:00Z",
            producer="extractor",
        )
    )

    engine = MemoryOSConsolidationEngine(repo)
    result = engine.run_once()

    records = repo.list_memory_records(domain="user_model", status="active")
    assert result["records_created"] == 1
    assert any("先给结论" in record["summary"] for record in records)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_consolidation.py -q
```

Expected: import failure

- [ ] **Step 3: Implement minimal consolidation engine**

Implement a minimal `run_once()` that:

- reads pending candidates
- converts them into `MemoryRecord`
- saves a `ConsolidationEvent`
- removes processed candidates

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_consolidation.py -q
```

Expected: PASS

## Task 5: Add Heartbeat Skeleton

**Files:**
- Create: `backend/packages/harness/nion/memory_os/heartbeat.py`
- Test: `backend/tests/test_memory_os_heartbeat.py`

- [ ] **Step 1: Write the failing heartbeat test**

```python
from pathlib import Path

from nion.memory_os.candidates import MemoryOSCandidateQueue
from nion.memory_os.heartbeat import MemoryOSHeartbeat
from nion.memory_os.models import CandidateRecord
from nion.memory_os.repository import MemoryOSRepository


def test_heartbeat_consumes_candidates_and_writes_diary(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    queue = MemoryOSCandidateQueue(repo)
    queue.push(
        CandidateRecord(
            candidate_id="cand_01",
            proposed_domain="user_model",
            proposed_subtype="communication_preference",
            owner_type="agent",
            scope="user",
            memory_type="semantic",
            summary="用户偏好直接表达。",
            raw_evidence_refs=["thread:1#msg_1"],
            confidence=0.8,
            status="candidate",
            created_at="2026-04-04T00:00:00Z",
            expires_at="2026-04-18T00:00:00Z",
            producer="extractor",
        )
    )

    heartbeat = MemoryOSHeartbeat(base_dir=tmp_path)
    report = heartbeat.run_micro_cycle()

    assert report["candidates_consumed"] == 1
    assert report["records_created"] == 1
    assert report["diary_written"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_heartbeat.py -q
```

Expected: import failure

- [ ] **Step 3: Implement heartbeat skeleton**

Implement `MemoryOSHeartbeat` with:

- repository/queue/diary/consolidation dependencies
- `run_micro_cycle()` only

No cron/scheduler daemon wiring yet; just callable service logic.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_heartbeat.py -q
```

Expected: PASS

## Task 6: Verification Sweep

**Files:**
- Test: all new M3 tests

- [ ] **Step 1: Run focused M3 suite**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_candidates.py \
  tests/test_memory_os_extractor.py \
  tests/test_memory_os_diary.py \
  tests/test_memory_os_consolidation.py \
  tests/test_memory_os_heartbeat.py -q
```

Expected: PASS

- [ ] **Step 2: Run regression suite against prior milestones**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_contracts.py \
  tests/test_memory_os_paths.py \
  tests/test_memory_os_repository.py \
  tests/test_memory_os_access_log.py \
  tests/test_memory_os_import_legacy.py \
  tests/test_memory_os_projections.py \
  tests/test_memory_os_context_pack.py \
  tests/test_memory_os_prompt_integration.py \
  tests/test_memory_os_continuity_bridge.py \
  tests/test_memory_upload_filtering.py -q
```

Expected: PASS

## Self-Review

### Spec coverage

- Covers M3 requirements from `09-memory-os-implementation-plan.md`: candidate queue, extractor bridge, diary writer, consolidation engine, heartbeat micro-cycle.
- Does not yet wire a daemon scheduler loop or UI surfaces.

### Placeholder scan

- No TBD/TODO placeholders.

### Type consistency

- Reuses:
  - `CandidateRecord`
  - `MemoryRecord`
  - `ConsolidationEvent`
  - `MemoryOSHeartbeat`

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/superpowers/plans/2026-04-04-memory-os-m3-heartbeat-self-maintenance-plan.md`.
