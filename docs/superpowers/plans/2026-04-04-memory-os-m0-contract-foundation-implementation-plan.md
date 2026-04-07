# Memory OS M0 Contract Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Memory OS 的基础 contract 落到代码中，建立统一的 domain/owner/scope/lifecycle 枚举、核心数据模型、基础路径扩展与空仓储骨架，同时不影响现有聊天主链。

**Architecture:** 本阶段只做 contract foundation，不切换运行时主链。优先新增 `memory_os` 模块的静态 contracts、Pydantic models、paths 与 repository skeleton，再通过最小单测保证这些对象稳定可用。对现有 `memory.json`、`recall`、automation 只做桥接预留，不做行为替换。

**Tech Stack:** Python 3.12, Pydantic, SQLite, pytest, existing Nion backend package layout

---

## File Structure

### New Files

- `backend/packages/harness/nion/memory_os/__init__.py`
  - 对外导出 M0 可用的 contract/model/repository/path helper
- `backend/packages/harness/nion/memory_os/contracts.py`
  - 定义 domain/owner/scope/memory_type/status/risk/action-level 等 Literal/Enum
- `backend/packages/harness/nion/memory_os/models.py`
  - 定义 `MemoryRecord`、`MemoryArtifact`、`CandidateRecord`、`EvidenceLink`、`AccessLogEntry`、`ConsolidationEvent`、`LearningTopic`、`ProcedureRecord`、`AutomationProjection`
- `backend/packages/harness/nion/memory_os/paths.py`
  - 定义 Memory OS 目录和文件路径 helper，建立在现有 `Paths` 之上
- `backend/packages/harness/nion/memory_os/repository.py`
  - 空实现/最小实现的 repository skeleton，至少支持初始化 metadata DB 和健康读取
- `backend/tests/test_memory_os_contracts.py`
  - 验证 contracts 和模型枚举/约束
- `backend/tests/test_memory_os_paths.py`
  - 验证路径落位与目录结构
- `backend/tests/test_memory_os_repository.py`
  - 验证 repository 能初始化空库并通过最小读写/健康检查

### Modified Files

- `backend/packages/harness/nion/config/paths.py`
  - 增加 `memory_os_dir`、`memory_os_index_db_file`、`memory_os_access_log_db_file`、`memory_os_artifacts_dir` 等属性

## Task 1: Add Memory OS Contracts

**Files:**
- Create: `backend/packages/harness/nion/memory_os/contracts.py`
- Test: `backend/tests/test_memory_os_contracts.py`

- [ ] **Step 1: Write the failing test for contract enums and literals**

```python
from nion.memory_os.contracts import (
    MEMORY_DOMAINS,
    MEMORY_OWNER_TYPES,
    MEMORY_SCOPES,
    MEMORY_STATUSES,
    MEMORY_TYPES,
    MEMORY_ACTION_LEVELS,
)


def test_memory_os_contract_sets_are_stable():
    assert MEMORY_DOMAINS == (
        "recall",
        "user_model",
        "relationship",
        "knowledge_projection",
        "agent_self",
        "procedure",
        "soul",
        "learning",
        "automation_projection",
    )
    assert MEMORY_OWNER_TYPES == ("user", "agent", "shared", "system")
    assert MEMORY_SCOPES == ("thread", "session", "user", "agent", "workspace", "project")
    assert MEMORY_TYPES == ("working", "episodic", "semantic", "procedural")
    assert MEMORY_STATUSES == (
        "candidate",
        "active",
        "warm",
        "cold",
        "archived",
        "invalidated",
        "purged",
        "superseded",
    )
    assert MEMORY_ACTION_LEVELS == ("AUTO", "SUGGEST", "CONFIRM", "FORBID")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest backend/tests/test_memory_os_contracts.py -q
```

Expected: `ModuleNotFoundError` or import failure for `nion.memory_os.contracts`

- [ ] **Step 3: Implement `contracts.py` with stable exported tuples and type aliases**

```python
from __future__ import annotations

from typing import Literal, TypeAlias

MEMORY_DOMAINS = (
    "recall",
    "user_model",
    "relationship",
    "knowledge_projection",
    "agent_self",
    "procedure",
    "soul",
    "learning",
    "automation_projection",
)
MemoryDomain: TypeAlias = Literal[
    "recall",
    "user_model",
    "relationship",
    "knowledge_projection",
    "agent_self",
    "procedure",
    "soul",
    "learning",
    "automation_projection",
]

MEMORY_OWNER_TYPES = ("user", "agent", "shared", "system")
MemoryOwnerType: TypeAlias = Literal["user", "agent", "shared", "system"]

MEMORY_SCOPES = ("thread", "session", "user", "agent", "workspace", "project")
MemoryScope: TypeAlias = Literal["thread", "session", "user", "agent", "workspace", "project"]

MEMORY_TYPES = ("working", "episodic", "semantic", "procedural")
MemoryType: TypeAlias = Literal["working", "episodic", "semantic", "procedural"]

MEMORY_STATUSES = (
    "candidate",
    "active",
    "warm",
    "cold",
    "archived",
    "invalidated",
    "purged",
    "superseded",
)
MemoryStatus: TypeAlias = Literal[
    "candidate",
    "active",
    "warm",
    "cold",
    "archived",
    "invalidated",
    "purged",
    "superseded",
]

MEMORY_ACTION_LEVELS = ("AUTO", "SUGGEST", "CONFIRM", "FORBID")
MemoryActionLevel: TypeAlias = Literal["AUTO", "SUGGEST", "CONFIRM", "FORBID"]
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest backend/tests/test_memory_os_contracts.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/contracts.py \
  backend/tests/test_memory_os_contracts.py
git commit -m "feat: add memory os contract enums"
```

## Task 2: Add Memory OS Pydantic Models

**Files:**
- Create: `backend/packages/harness/nion/memory_os/models.py`
- Modify: `backend/tests/test_memory_os_contracts.py`

- [ ] **Step 1: Extend the failing test to validate `MemoryRecord` and `CandidateRecord` minimal construction**

```python
from nion.memory_os.models import CandidateRecord, MemoryRecord


def test_memory_record_accepts_minimal_required_fields():
    record = MemoryRecord(
        memory_id="mem_01",
        domain="user_model",
        subtype="communication_preference",
        owner_type="agent",
        scope="user",
        memory_type="semantic",
        subject_id="user:default",
        status="active",
        summary="用户偏好直接表达。",
        confidence=0.9,
        source_refs=["thread:abc#msg_1"],
        created_at="2026-04-04T00:00:00Z",
        updated_at="2026-04-04T00:00:00Z",
        provenance={"source_type": "conversation", "generated_by": "test"},
    )
    assert record.domain == "user_model"
    assert record.status == "active"


def test_candidate_record_requires_expiry_and_evidence():
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
    assert candidate.status == "candidate"
    assert candidate.raw_evidence_refs == ["thread:abc#msg_2"]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest backend/tests/test_memory_os_contracts.py -q
```

Expected: import failure for `nion.memory_os.models`

- [ ] **Step 3: Implement `models.py` with the minimal M0 Pydantic models**

```python
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from .contracts import MemoryDomain, MemoryOwnerType, MemoryScope, MemoryStatus, MemoryType


class MemoryRecord(BaseModel):
    memory_id: str
    domain: MemoryDomain
    subtype: str
    owner_type: MemoryOwnerType
    scope: MemoryScope
    memory_type: MemoryType
    subject_id: str
    status: MemoryStatus
    summary: str
    confidence: float
    source_refs: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str
    provenance: dict[str, Any] = Field(default_factory=dict)
    target_id: str | None = None
    title: str | None = None
    language: str | None = None
    salience: float | None = None
    freshness_score: float | None = None
    source_count: int | None = None
    artifact_uri: str | None = None
    structured_payload: dict[str, Any] = Field(default_factory=dict)
    last_used_at: str | None = None
    valid_from: str | None = None
    invalid_at: str | None = None
    archived_at: str | None = None
    purged_at: str | None = None
    supersedes: list[str] = Field(default_factory=list)
    superseded_by: str | None = None


class CandidateRecord(BaseModel):
    candidate_id: str
    proposed_domain: MemoryDomain
    proposed_subtype: str
    owner_type: MemoryOwnerType
    scope: MemoryScope
    memory_type: MemoryType
    summary: str
    raw_evidence_refs: list[str] = Field(default_factory=list)
    confidence: float
    status: MemoryStatus = "candidate"
    created_at: str
    expires_at: str
    producer: str
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest backend/tests/test_memory_os_contracts.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/models.py \
  backend/tests/test_memory_os_contracts.py
git commit -m "feat: add memory os pydantic models"
```

## Task 3: Extend Paths With Memory OS Locations

**Files:**
- Modify: `backend/packages/harness/nion/config/paths.py`
- Create: `backend/packages/harness/nion/memory_os/paths.py`
- Test: `backend/tests/test_memory_os_paths.py`

- [ ] **Step 1: Write the failing paths test**

```python
from pathlib import Path

from nion.config.paths import Paths


def test_memory_os_paths_are_resolved_under_base_dir(tmp_path: Path):
    paths = Paths(base_dir=tmp_path)

    assert paths.memory_os_dir == tmp_path / "memory-os"
    assert paths.memory_os_index_db_file == tmp_path / "memory-os" / "index.sqlite3"
    assert paths.memory_os_access_log_db_file == tmp_path / "memory-os" / "access_logs.sqlite3"
    assert paths.memory_os_artifacts_dir == tmp_path / "memory-os" / "artifacts"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest backend/tests/test_memory_os_paths.py -q
```

Expected: `AttributeError` for missing `memory_os_dir`

- [ ] **Step 3: Add path properties to `Paths` and a thin helper module**

```python
    @property
    def memory_os_dir(self) -> Path:
        return self.base_dir / "memory-os"

    @property
    def memory_os_index_db_file(self) -> Path:
        return self.memory_os_dir / "index.sqlite3"

    @property
    def memory_os_access_log_db_file(self) -> Path:
        return self.memory_os_dir / "access_logs.sqlite3"

    @property
    def memory_os_artifacts_dir(self) -> Path:
        return self.memory_os_dir / "artifacts"
```

And create:

```python
from __future__ import annotations

from nion.config.paths import Paths, get_paths


def get_memory_os_paths(base_dir: str | None = None) -> Paths:
    return Paths(base_dir=base_dir) if base_dir else get_paths()
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest backend/tests/test_memory_os_paths.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/memory_os/paths.py \
  backend/tests/test_memory_os_paths.py
git commit -m "feat: add memory os path helpers"
```

## Task 4: Add Repository Skeleton And DB Bootstrap

**Files:**
- Create: `backend/packages/harness/nion/memory_os/repository.py`
- Test: `backend/tests/test_memory_os_repository.py`

- [ ] **Step 1: Write the failing repository bootstrap test**

```python
from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_repository_bootstraps_metadata_database(tmp_path: Path):
    db_path = tmp_path / "memory-os" / "index.sqlite3"
    repo = MemoryOSRepository(db_path)

    status = repo.healthcheck()

    assert db_path.exists()
    assert status["ok"] is True
    assert "memory_records" in status["tables"]
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest backend/tests/test_memory_os_repository.py -q
```

Expected: import failure for `MemoryOSRepository`

- [ ] **Step 3: Implement minimal repository bootstrap**

```python
from __future__ import annotations

import sqlite3
from pathlib import Path


class MemoryOSRepository:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                '''
                CREATE TABLE IF NOT EXISTS memory_records (
                    memory_id TEXT PRIMARY KEY,
                    domain TEXT NOT NULL,
                    subtype TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    subject_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    provenance_json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS candidate_records (
                    candidate_id TEXT PRIMARY KEY,
                    proposed_domain TEXT NOT NULL,
                    proposed_subtype TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    producer TEXT NOT NULL
                );
                '''
            )

    def healthcheck(self) -> dict[str, object]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()
        return {"ok": True, "tables": [row["name"] for row in rows]}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest backend/tests/test_memory_os_repository.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/repository.py \
  backend/tests/test_memory_os_repository.py
git commit -m "feat: bootstrap memory os repository"
```

## Task 5: Export M0 Surface From `memory_os`

**Files:**
- Create: `backend/packages/harness/nion/memory_os/__init__.py`
- Modify: `backend/tests/test_memory_os_contracts.py`

- [ ] **Step 1: Extend failing test to verify public exports**

```python
from nion.memory_os import MemoryOSRepository, MemoryRecord, get_memory_os_paths


def test_memory_os_public_api_exports_m0_surface():
    assert MemoryOSRepository is not None
    assert MemoryRecord is not None
    assert get_memory_os_paths is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pytest backend/tests/test_memory_os_contracts.py -q
```

Expected: import failure from `nion.memory_os`

- [ ] **Step 3: Implement `__init__.py` exports**

```python
from .contracts import *
from .models import CandidateRecord, MemoryRecord
from .paths import get_memory_os_paths
from .repository import MemoryOSRepository

__all__ = [
    "CandidateRecord",
    "MemoryOSRepository",
    "MemoryRecord",
    "get_memory_os_paths",
]
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pytest backend/tests/test_memory_os_contracts.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/__init__.py \
  backend/tests/test_memory_os_contracts.py
git commit -m "feat: export memory os m0 public api"
```

## Task 6: Verification Sweep

**Files:**
- Test: `backend/tests/test_memory_os_contracts.py`
- Test: `backend/tests/test_memory_os_paths.py`
- Test: `backend/tests/test_memory_os_repository.py`

- [ ] **Step 1: Run the focused M0 test suite**

Run:

```bash
pytest \
  backend/tests/test_memory_os_contracts.py \
  backend/tests/test_memory_os_paths.py \
  backend/tests/test_memory_os_repository.py -q
```

Expected: all tests PASS

- [ ] **Step 2: Run one legacy smoke test to ensure no existing memory path broke**

Run:

```bash
pytest backend/tests/test_memory_upload_filtering.py -q
```

Expected: PASS

- [ ] **Step 3: Commit the verification checkpoint**

```bash
git add \
  backend/packages/harness/nion/memory_os \
  backend/packages/harness/nion/config/paths.py \
  backend/tests/test_memory_os_contracts.py \
  backend/tests/test_memory_os_paths.py \
  backend/tests/test_memory_os_repository.py
git commit -m "test: verify memory os m0 foundation"
```

## Self-Review

### Spec coverage

- Covers M0 requirements from [09-memory-os-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/09-memory-os-implementation-plan.md): contracts, models, paths, repository skeleton.
- Does not attempt M1 import bridge, context assembly, heartbeat, or growth logic.

### Placeholder scan

- No TBD/TODO placeholders.
- Every code-touching step includes exact code or exact expected shape.

### Type consistency

- Uses the same contract names throughout:
  - `MemoryRecord`
  - `CandidateRecord`
  - `MemoryOSRepository`
  - `get_memory_os_paths`

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-04-memory-os-m0-contract-foundation-implementation-plan.md`.
