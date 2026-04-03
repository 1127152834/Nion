# Memory OS M1 Substrate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 M0 contract foundation 之上建立 Memory OS 的底座能力，包括 metadata repository 扩展、artifact index、access/provenance/consolidation 事件存储、legacy memory import，以及 automation projection 基础桥接。

**Architecture:** 本阶段仍不切聊天主链，只把新底座做成可独立读写的 substrate。优先扩展 `memory_os/repository.py` 承载更多表和最小 CRUD，再增加 `import_legacy.py`、`access_log.py`、`projections.py` 等桥接层。现有 `memory.json`、automation runtime 继续保留，只新增桥接能力。

**Tech Stack:** Python 3.12, SQLite, Pydantic, pytest, existing Nion backend package layout

---

## File Structure

### New Files

- `backend/packages/harness/nion/memory_os/import_legacy.py`
  - 导入 legacy `memory.json` / agent memory 到新 metadata 结构
- `backend/packages/harness/nion/memory_os/access_log.py`
  - access/provenance/consolidation event 写入 helper
- `backend/packages/harness/nion/memory_os/projections.py`
  - automation projection bridge helpers
- `backend/tests/test_memory_os_import_legacy.py`
  - 验证 legacy memory 导入
- `backend/tests/test_memory_os_access_log.py`
  - 验证 access/consolidation logs 落库
- `backend/tests/test_memory_os_projections.py`
  - 验证 automation projection 转换

### Modified Files

- `backend/packages/harness/nion/memory_os/models.py`
  - 补全 `AccessLogEntry`、`ConsolidationEvent`、`AutomationProjection` 等模型所需字段
- `backend/packages/harness/nion/memory_os/repository.py`
  - 扩展表结构和最小 CRUD
- `backend/packages/harness/nion/memory_os/__init__.py`
  - 导出 M1 可用 surface
- `backend/packages/harness/nion/automation/models.py`
  - 为 future bridge 预留 owner/provenance 字段，保持向后兼容

## Task 1: Expand Repository Schema Beyond M0

**Files:**
- Modify: `backend/packages/harness/nion/memory_os/repository.py`
- Test: `backend/tests/test_memory_os_repository.py`

- [ ] **Step 1: Extend the failing test to require additional tables**

```python
from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_repository_bootstraps_all_m1_tables(tmp_path: Path):
    db_path = tmp_path / "memory-os" / "index.sqlite3"
    repo = MemoryOSRepository(db_path)

    status = repo.healthcheck()

    assert status["ok"] is True
    assert set(status["tables"]) >= {
        "memory_records",
        "candidate_records",
        "memory_artifacts",
        "evidence_links",
        "access_logs",
        "consolidation_events",
        "automation_projections",
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_repository.py -q
```

Expected: FAIL because extra tables are missing

- [ ] **Step 3: Extend repository schema to include M1 tables**

Add to `repository.py` schema:

```python
CREATE TABLE IF NOT EXISTS memory_artifacts (
    artifact_id TEXT PRIMARY KEY,
    artifact_uri TEXT NOT NULL,
    domain TEXT NOT NULL,
    artifact_kind TEXT NOT NULL,
    owner_type TEXT NOT NULL,
    scope TEXT NOT NULL,
    title TEXT,
    format TEXT NOT NULL,
    relative_path TEXT,
    linked_memory_ids_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    checksum TEXT
);

CREATE TABLE IF NOT EXISTS evidence_links (
    link_id TEXT PRIMARY KEY,
    source_ref TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_logs (
    access_id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id TEXT NOT NULL,
    thread_id TEXT,
    session_id TEXT,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consolidation_events (
    event_id TEXT PRIMARY KEY,
    input_candidate_ids_json TEXT NOT NULL,
    affected_memory_ids_json TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_at TEXT NOT NULL,
    executor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_projections (
    job_id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_repository.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/repository.py \
  backend/tests/test_memory_os_repository.py
git commit -m "feat: extend memory os repository schema"
```

## Task 2: Add Artifact And Access Log Write Helpers

**Files:**
- Create: `backend/packages/harness/nion/memory_os/access_log.py`
- Modify: `backend/packages/harness/nion/memory_os/repository.py`
- Test: `backend/tests/test_memory_os_access_log.py`

- [ ] **Step 1: Write the failing access-log test**

```python
from pathlib import Path

from nion.memory_os.access_log import MemoryOSAccessLogger
from nion.memory_os.models import AccessLogEntry
from nion.memory_os.repository import MemoryOSRepository


def test_access_logger_persists_log_entries(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    logger = MemoryOSAccessLogger(repo)
    entry = AccessLogEntry(
        access_id="acc_01",
        actor_type="runtime",
        actor_id="lead_agent",
        action="context_assembly_read",
        target_kind="memory_record",
        target_id="mem_01",
        created_at="2026-04-04T00:00:00Z",
    )

    logger.record(entry)
    rows = repo.list_access_logs()

    assert len(rows) == 1
    assert rows[0].access_id == "acc_01"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_access_log.py -q
```

Expected: import failure or missing repository methods

- [ ] **Step 3: Implement repository save/list methods and access logger**

Add methods to `repository.py`:

```python
def save_access_log(self, entry: AccessLogEntry) -> AccessLogEntry: ...
def list_access_logs(self) -> list[AccessLogEntry]: ...
```

Create `access_log.py`:

```python
from .models import AccessLogEntry
from .repository import MemoryOSRepository


class MemoryOSAccessLogger:
    def __init__(self, repository: MemoryOSRepository) -> None:
        self._repository = repository

    def record(self, entry: AccessLogEntry) -> AccessLogEntry:
        return self._repository.save_access_log(entry)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_access_log.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/access_log.py \
  backend/packages/harness/nion/memory_os/repository.py \
  backend/tests/test_memory_os_access_log.py
git commit -m "feat: add memory os access log helpers"
```

## Task 3: Add Legacy Memory Import Bridge

**Files:**
- Create: `backend/packages/harness/nion/memory_os/import_legacy.py`
- Test: `backend/tests/test_memory_os_import_legacy.py`

- [ ] **Step 1: Write the failing import test**

```python
from pathlib import Path

from nion.memory_os.import_legacy import import_legacy_memory_payload
from nion.memory_os.repository import MemoryOSRepository


def test_import_legacy_memory_payload_creates_memory_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    payload = {
        "version": "1.0",
        "lastUpdated": "2026-04-04T00:00:00Z",
        "user": {
            "workContext": {"summary": "负责财务汇报", "updatedAt": "2026-04-04T00:00:00Z"},
            "personalContext": {"summary": "偏好中文", "updatedAt": "2026-04-04T00:00:00Z"},
            "topOfMind": {"summary": "正在推进月度复盘", "updatedAt": "2026-04-04T00:00:00Z"},
        },
        "history": {
            "recentMonths": {"summary": "近期频繁处理财务总结", "updatedAt": "2026-04-04T00:00:00Z"},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [
            {
                "id": "fact_1",
                "content": "用户偏好直接表达",
                "category": "preference",
                "confidence": 0.9,
                "createdAt": "2026-04-04T00:00:00Z",
                "source": "manual",
            }
        ],
    }

    imported = import_legacy_memory_payload(repo, payload)

    assert imported["records_created"] >= 2
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_import_legacy.py -q
```

Expected: import failure

- [ ] **Step 3: Implement a minimal legacy importer**

Implement `import_legacy.py` with a function that:

- maps non-empty `user.*` and `history.*` summaries to `MemoryRecord`
- maps each legacy fact to a `MemoryRecord`
- returns a summary dict such as `{"records_created": N}`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_import_legacy.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/import_legacy.py \
  backend/tests/test_memory_os_import_legacy.py
git commit -m "feat: add legacy memory import bridge"
```

## Task 4: Add Automation Projection Model Bridge

**Files:**
- Modify: `backend/packages/harness/nion/automation/models.py`
- Create: `backend/packages/harness/nion/memory_os/projections.py`
- Test: `backend/tests/test_memory_os_projections.py`

- [ ] **Step 1: Write the failing projection test**

```python
from nion.automation.models import AutomationJob
from nion.memory_os.projections import build_automation_projection


def test_build_automation_projection_uses_owner_and_mutability_fields():
    job = AutomationJob(
        id="job_1",
        name="Review learning topic",
        prompt="review it",
        schedule_kind="cron",
        schedule_value="0 9 * * 1",
        created_at="2026-04-04T00:00:00Z",
        updated_at="2026-04-04T00:00:00Z",
        owner_type="agent",
        owner_id="agent:main",
        mutability="pause_only",
    )

    projection = build_automation_projection(job)

    assert projection.owner_type == "agent"
    assert projection.mutability == "pause_only"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_projections.py -q
```

Expected: validation or import failure because fields/helpers are missing

- [ ] **Step 3: Extend `AutomationJob` compatibly and implement projection helper**

Add optional fields to `AutomationJob`:

```python
    owner_type: Literal["user", "agent"] = "user"
    owner_id: str = "user:default"
    mutability: Literal["editable", "pause_only"] = "editable"
    provenance_memory_id: str | None = None
    provenance_learning_id: str | None = None
    retention_policy: dict[str, Any] = Field(default_factory=dict)
    visible_in_ui: bool = True
    policy_flags: dict[str, Any] = Field(default_factory=dict)
```

Create `projections.py`:

```python
from nion.automation.models import AutomationJob
from .models import AutomationProjection


def build_automation_projection(job: AutomationJob) -> AutomationProjection:
    return AutomationProjection(
        job_id=job.id,
        owner_type=job.owner_type,
        owner_id=job.owner_id,
        mutability=job.mutability,
        provenance_memory_id=job.provenance_memory_id,
        provenance_learning_id=job.provenance_learning_id,
        retention_policy=job.retention_policy,
        visible_in_ui=job.visible_in_ui,
        policy_flags=job.policy_flags,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_projections.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/automation/models.py \
  backend/packages/harness/nion/memory_os/projections.py \
  backend/tests/test_memory_os_projections.py
git commit -m "feat: add automation projection bridge"
```

## Task 5: Verification Sweep

**Files:**
- Test: `backend/tests/test_memory_os_repository.py`
- Test: `backend/tests/test_memory_os_access_log.py`
- Test: `backend/tests/test_memory_os_import_legacy.py`
- Test: `backend/tests/test_memory_os_projections.py`

- [ ] **Step 1: Run the focused M1 test suite**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_contracts.py \
  tests/test_memory_os_paths.py \
  tests/test_memory_os_repository.py \
  tests/test_memory_os_access_log.py \
  tests/test_memory_os_import_legacy.py \
  tests/test_memory_os_projections.py -q
```

Expected: all tests PASS

- [ ] **Step 2: Run legacy smoke tests**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_upload_filtering.py \
  tests/test_automation_router.py -q
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os \
  backend/packages/harness/nion/automation/models.py \
  backend/tests/test_memory_os_* \
  backend/packages/harness/nion/config/paths.py
git commit -m "test: verify memory os substrate foundation"
```

## Self-Review

### Spec coverage

- Covers M1 requirements from [09-memory-os-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/09-memory-os-implementation-plan.md): repository expansion, artifact/access/consolidation support, legacy import bridge, automation projection bridge.
- Does not attempt M2 context cutover or M3 heartbeat.

### Placeholder scan

- No TBD/TODO placeholders.
- All code steps specify exact shapes or code blocks.

### Type consistency

- Uses the same names as the spec package:
  - `MemoryRecord`
  - `MemoryArtifact`
  - `AccessLogEntry`
  - `ConsolidationEvent`
  - `AutomationProjection`

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/superpowers/plans/2026-04-04-memory-os-m1-substrate-implementation-plan.md`.
