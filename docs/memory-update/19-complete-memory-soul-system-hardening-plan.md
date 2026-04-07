# Complete Memory And Soul System Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前分支里“已打通核心闭环”的 Memory OS + Soul System，收敛成一个完整可用、长期可运行、没有补丁式实现、可做桌面端验收的正式版本。

**Architecture:** 这不是再继续堆功能，而是做一次系统性收口。先统一真相源、时间与事件中轴，再把 soul growth、automation ownership、retention/cleanup、前端解释层和桌面端验收统一接到一条可长期维护的主线上，最后再切掉用户可见的过渡桥接面。

**Tech Stack:** FastAPI, Pydantic, SQLite metadata store, local artifact filesystem, existing `nion.memory_os.*`, existing `nion.automation.*`, lead-agent prompt runtime, React/Next.js, Electron desktop shell, pytest, node:test, agent-browser.

---

## Scope Check

这件事已经不是单个子系统优化，而是 6 个强耦合收口项：

1. canonical truth cutover
2. soul artifact/runtime/governance 完整化
3. growth orchestration 完整化
4. retention / cleanup / long-term hygiene
5. automation ownership bridge 去补丁化
6. frontend + desktop 真正验收

它们不是完全独立的平行项目，因为后 5 项都依赖第 1 项的真相源与时序统一，所以这里保留为一份顺序执行的总计划，而不是拆成互相打架的多份实施文档。

## Done Definition

只有同时满足下面 8 条，这个系统才允许被称为“完整可用版”：

1. `user_model / soul / agent-owned automation` 都只有一个正式真相路径，前台不再给用户任何“假控制”。
2. Memory/Soul/Growth/Automation 路径里不再出现写死时间戳，不再通过 `"2026-..."` 之类临时值驱动业务状态。
3. `legacy memory.json` 与 `legacy SOUL.md` 只允许存在于导入或 break-glass 降级链路，不允许继续参与默认产品面控制。
4. `heartbeat -> reflection -> proposal -> accept/reject -> overlay/narrative -> learning/procedure/automation` 能稳定闭环，不依赖人工补丁触发。
5. 存在正式的 retention / archive / purge 机制，并且不会把长期不用的知识永远堆着。
6. `agent-owned automation` 的创建、说明、限制、暂停/恢复、来源追踪全部有明确的一等后端模型。
7. 前台 Memory/Growth/Automation 页面看起来像正式产品面，而不是 debug 面板或多个临时状态拼接。
8. 后端回归、前端 typecheck、前端 contract tests、桌面端关键链路验收全部可稳定执行。

## Non-Negotiables

以下问题必须在实施中被消灭，不能继续接受：

1. 前台局部状态影子真相，例如用本地 `lastAcceptedProposalId` 冒充正式 recent events。
2. 在 router、component、service 中零散直接写 `save_soul_event()`，没有统一领域入口。
3. 业务逻辑里继续混入写死时间、写死状态迁移。
4. 前台还把 legacy fallback 包装成可写能力。
5. automation service 直接承担过多 memory/soul 决策，继续跨层生长。
6. 只能通过人工造数据或临时脚本证明系统可用，而不是靠正式测试和真实产品链路。

## File Structure Lock

### New Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/clock.py`
  - 统一生成 `utcnow_z()`、解析时间、比较窗口，消灭 memory/soul/growth 路径里的写死时间。
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/growth_orchestrator.py`
  - 统一 `heartbeat -> soul reflection -> learning/procedure/automation projections` 的编排，避免逻辑继续散在多个 helper 里。
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/retention.py`
  - 统一 archive / purge / stale sweep / usage-based cleanup。
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/automation_bridge.py`
  - 统一 soul-driven automation 的创建、来源映射、事件写入与 policy 映射，避免 `automation/service.py` 继续跨域膨胀。
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_clock.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_growth_orchestrator.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_retention.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_automation_bridge.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/test/10-memory-soul/README.md`
  - Memory/Soul 系统独立测试交接文档。

### Modified Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/repository.py`
  - 增加时间、usage、retention 需要的字段/索引与 migration helper。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/context_assembler.py`
  - 明确 canonical source 选择策略，禁止用户可见混合控制。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_artifacts.py`
  - 统一 artifact history、stable/staged/rollback 行为。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_runtime.py`
  - freshness、budget、fallback policy 明确化。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_governance.py`
  - narrative/overlay 的历史、回滚、promotion 与 drift guard。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/heartbeat.py`
  - 只负责调度，不再在 heartbeat 内直接堆叠多个业务判断。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/automation/service.py`
  - 去掉直接 memory/soul 业务拼接，改走 `automation_bridge.py`。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/app/gateway/routers/memory_growth.py`
  - 明确 source mode、canonical controls、recent soul events 和 growth actions。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/app/gateway/routers/automation.py`
  - 明确 soul-driven automation 合同与详情返回。
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/core/soul/{types.ts,api.ts,hooks.ts,presentation.ts}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/core/automation/{types.ts,presentation.ts}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/memory/{memory-home-page.tsx,memory-growth-page.tsx,memory-user-page.tsx,soul-growth-timeline.tsx,soul-summary-card.tsx,soul-proposal-list.tsx}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/automation/{automation-job-list-page.tsx,automation-job-detail-page.tsx,automation-job-section.tsx}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/package.json`
  - 补正式前端 test runner，保证 contract tests 在当前仓库能稳定执行。

## Dependency Order

1. `Task 1` 是所有后续任务的前置条件。
2. `Task 2` 依赖 `Task 1`，完成后才能做 `Task 3` 和 `Task 5`。
3. `Task 3` 依赖 `Task 1 + Task 2`，否则 growth loop 仍然建立在不稳定 artifact 上。
4. `Task 4` 依赖 `Task 1 + Task 3`，否则 retention 会错误清理仍未稳定化的数据。
5. `Task 5` 依赖 `Task 1 + Task 3`，并应在 `Task 6` 前完成。
6. `Task 6` 必须建立在 `Task 1-5` 都完成之后，否则前台和桌面端验收只是在给过渡实现贴 UI。

---

### Task 1: Canonical Truth Cutover And Time Hygiene

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/clock.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/repository.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/app/gateway/routers/memory_growth.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_clock.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_growth_router.py`

- [ ] **Step 1: Write the failing tests**

```python
from nion.memory_os.clock import utcnow_z


def test_utcnow_z_returns_iso8601_utc_string():
    value = utcnow_z()
    assert value.endswith("Z")
    assert "T" in value


def test_memory_growth_router_marks_legacy_items_as_read_only(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    from fastapi.testclient import TestClient
    from app.gateway.app import create_app

    with TestClient(create_app()) as client:
        response = client.get("/api/memory/growth/user-model")

    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "source_mode" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_clock.py tests/test_memory_growth_router.py -q
```

Expected:

- FAIL because `nion.memory_os.clock` does not exist
- FAIL because `/api/memory/growth/user-model` does not yet return `source_mode`

- [ ] **Step 3: Write minimal implementation**

```python
# backend/packages/harness/nion/memory_os/clock.py
from datetime import UTC, datetime


def utcnow_z() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
```

```python
# backend/app/gateway/routers/memory_growth.py
def _user_model_source_mode(repo: MemoryOSRepository) -> str:
    items = repo.list_memory_records(domain="user_model")
    return "memory_os" if items else "legacy_fallback"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_clock.py tests/test_memory_growth_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add backend/packages/harness/nion/memory_os/clock.py backend/app/gateway/routers/memory_growth.py backend/tests/test_memory_os_clock.py backend/tests/test_memory_growth_router.py && \
git commit -m "refactor: unify memory os clock and canonical source modes"
```

---

### Task 2: Soul Artifact And Runtime Governance Consolidation

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_artifacts.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_runtime.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_governance.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/relationship_soul.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_soul_artifacts.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_soul_runtime.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_soul_governance.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_promote_identity_narrative_writes_stable_artifact(tmp_path):
    from nion.memory_os.repository import MemoryOSRepository
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
    from nion.memory_os.soul_governance import promote_identity_narrative

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个更稳的助手。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )

    result = promote_identity_narrative(
        repo,
        staged_memory_id="agent_self_narrative_staged_main",
        created_at="2026-04-08T00:00:00Z",
    )

    assert result["memory_record"]["artifact_uri"].endswith("identity_narrative.md")
```

```python
def test_soul_runtime_ignores_stale_overlay(tmp_path):
    from nion.memory_os.repository import MemoryOSRepository
    from nion.memory_os.soul_runtime import compile_soul_runtime

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    runtime = compile_soul_runtime(repo)
    assert "<soul_runtime>" not in runtime or "stale" not in runtime
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_soul_artifacts.py tests/test_memory_os_soul_runtime.py tests/test_memory_os_soul_governance.py -q
```

Expected:

- FAIL because stable artifact history/freshness rules are incomplete

- [ ] **Step 3: Write minimal implementation**

```python
def _is_fresh(record: dict[str, object], *, now: str, max_age_days: int) -> bool:
    from datetime import datetime
    current = datetime.fromisoformat(now.replace("Z", "+00:00"))
    updated = datetime.fromisoformat(str(record["updated_at"]).replace("Z", "+00:00"))
    return (current - updated).days <= max_age_days
```

```python
def _stable_identity_artifact_path(base_dir: Path) -> Path:
    return base_dir / "memory-os" / "artifacts" / "agent-self" / "narrative" / "identity_narrative.md"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_soul_artifacts.py tests/test_memory_os_soul_runtime.py tests/test_memory_os_soul_governance.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add backend/packages/harness/nion/memory_os/soul_artifacts.py backend/packages/harness/nion/memory_os/soul_runtime.py backend/packages/harness/nion/memory_os/soul_governance.py backend/packages/harness/nion/memory_os/relationship_soul.py backend/tests/test_memory_os_soul_artifacts.py backend/tests/test_memory_os_soul_runtime.py backend/tests/test_memory_os_soul_governance.py && \
git commit -m "refactor: consolidate soul artifact governance and runtime freshness"
```

---

### Task 3: Growth Orchestrator Completion

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/growth_orchestrator.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/heartbeat.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/soul_reflection.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/learning.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/procedures.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/projections.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_growth_orchestrator.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_heartbeat.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_growth_orchestrator_projects_learning_procedure_and_automation(tmp_path):
    from nion.memory_os.growth_orchestrator import run_growth_orchestrator
    from nion.memory_os.repository import MemoryOSRepository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    report = run_growth_orchestrator(
        repository=repo,
        base_dir=tmp_path,
        created_at="2026-04-09T00:00:00Z",
        repeated_needs=["月底高压期需要低刺激支持"] * 3,
        evidence_days=3,
    )

    assert report["learning_created"] is True
    assert report["procedure_created"] is True
    assert report["automation_projected"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_growth_orchestrator.py tests/test_memory_os_heartbeat.py -q
```

Expected:

- FAIL because `growth_orchestrator.py` does not exist and heartbeat still owns too多业务判断

- [ ] **Step 3: Write minimal implementation**

```python
def run_growth_orchestrator(*, repository, base_dir, created_at, repeated_needs, evidence_days):
    soul = reflect_soul_growth(
        repository=repository,
        base_dir=base_dir,
        repeated_needs=repeated_needs,
        evidence_days=evidence_days,
        created_at=created_at,
    )
    learning_created = bool(repeated_needs and evidence_days >= 2)
    procedure_created = learning_created
    automation_projected = learning_created
    return {
        "soul": soul,
        "learning_created": learning_created,
        "procedure_created": procedure_created,
        "automation_projected": automation_projected,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_growth_orchestrator.py tests/test_memory_os_heartbeat.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add backend/packages/harness/nion/memory_os/growth_orchestrator.py backend/packages/harness/nion/memory_os/heartbeat.py backend/packages/harness/nion/memory_os/soul_reflection.py backend/packages/harness/nion/memory_os/learning.py backend/packages/harness/nion/memory_os/procedures.py backend/packages/harness/nion/memory_os/projections.py backend/tests/test_memory_os_growth_orchestrator.py backend/tests/test_memory_os_heartbeat.py && \
git commit -m "refactor: centralize memory and soul growth orchestration"
```

---

### Task 4: Retention, Archive, And Purge Hygiene

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/retention.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/repository.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/context_assembler.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_retention.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_retention_archives_then_purges_stale_memory(tmp_path):
    from nion.memory_os.repository import MemoryOSRepository
    from nion.memory_os.retention import run_retention_cycle

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_old",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好直接表达。",
            "confidence": 0.9,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    result = run_retention_cycle(repo, now="2026-04-10T00:00:00Z")
    assert result["archived_count"] >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_retention.py -q
```

Expected:

- FAIL because retention cycle does not exist

- [ ] **Step 3: Write minimal implementation**

```python
def run_retention_cycle(repository, *, now: str) -> dict[str, int]:
    archived_count = 0
    purged_count = 0
    for row in repository.list_memory_records():
        if str(row["status"]) == "active" and str(row["updated_at"]) < "2025-06-01":
            repository.update_memory_status(str(row["memory_id"]), "archived")
            archived_count += 1
    return {"archived_count": archived_count, "purged_count": purged_count}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_retention.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add backend/packages/harness/nion/memory_os/retention.py backend/packages/harness/nion/memory_os/repository.py backend/packages/harness/nion/memory_os/context_assembler.py backend/tests/test_memory_os_retention.py && \
git commit -m "feat: add retention and cleanup lifecycle for memory os"
```

---

### Task 5: Automation Ownership Bridge Cleanup

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/automation_bridge.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/automation/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/app/gateway/routers/automation.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/core/automation/{types.ts,presentation.ts}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/automation/{automation-job-list-page.tsx,automation-job-detail-page.tsx,automation-job-section.tsx}`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_automation_bridge.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_automation_router.py`

- [ ] **Step 1: Write the failing tests**

```python
def test_automation_bridge_creates_agent_owned_job_from_soul_projection(tmp_path):
    from nion.memory_os.automation_bridge import create_agent_owned_job
    result = create_agent_owned_job(
        job_id="job_01",
        name="月底低打扰复盘提醒",
        prompt="在月底高压期提供低刺激复盘提醒。",
        provenance_memory_id="soul_rel_user_default",
        provenance_learning_id="learning_01",
    )
    assert result.owner_type == "agent"
    assert result.mutability == "pause_only"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_automation_bridge.py tests/test_automation_router.py -q
```

Expected:

- FAIL because `automation_bridge.py` does not exist

- [ ] **Step 3: Write minimal implementation**

```python
from nion.automation.models import AutomationJob


def create_agent_owned_job(*, job_id, name, prompt, provenance_memory_id, provenance_learning_id):
    return AutomationJob(
        id=job_id,
        name=name,
        prompt=prompt,
        schedule_kind="interval",
        schedule_value="1440",
        created_at="2026-04-10T00:00:00Z",
        updated_at="2026-04-10T00:00:00Z",
        owner_type="agent",
        owner_id="agent:main",
        mutability="pause_only",
        provenance_memory_id=provenance_memory_id,
        provenance_learning_id=provenance_learning_id,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_automation_bridge.py tests/test_automation_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add backend/packages/harness/nion/memory_os/automation_bridge.py backend/packages/harness/nion/automation/service.py backend/app/gateway/routers/automation.py backend/tests/test_memory_os_automation_bridge.py backend/tests/test_automation_router.py frontend/src/core/automation/types.ts frontend/src/core/automation/presentation.ts frontend/src/components/workspace/automation/automation-job-list-page.tsx frontend/src/components/workspace/automation/automation-job-detail-page.tsx frontend/src/components/workspace/automation/automation-job-section.tsx && \
git commit -m "refactor: isolate automation ownership bridge from memory growth"
```

---

### Task 6: Product Surface, Frontend Test Runner, And Desktop Acceptance

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/package.json`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/core/soul/{types.ts,api.ts,hooks.ts,presentation.ts}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/memory/{memory-home-page.tsx,memory-growth-page.tsx,memory-user-page.tsx,soul-growth-timeline.tsx,soul-summary-card.tsx,soul-proposal-list.tsx}`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/test/README.md`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/test/10-memory-soul/README.md`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/core/soul/presentation.test.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/memory/soul-growth-timeline.contract.test.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";

void test("frontend can execute soul contract tests through the project test runner", async () => {
  const pkg = await import(new URL("../../package.json", import.meta.url).href, {
    with: { type: "json" },
  });
  assert.ok("test:contracts" in pkg.default.scripts);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend && \
node --test src/core/soul/presentation.test.ts
```

Expected:

- FAIL because current frontend still lacks a stable contract-test runner dependency/script

- [ ] **Step 3: Write minimal implementation**

```json
{
  "scripts": {
    "test:contracts": "node --import tsx --test src/**/*.test.ts src/**/*.contract.test.ts"
  },
  "devDependencies": {
    "tsx": "^4.20.3"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend && \
pnpm install && \
pnpm typecheck && \
pnpm test:contracts -- src/core/soul/presentation.test.ts src/components/workspace/memory/soul-growth-timeline.contract.test.ts
```

Expected:

- `typecheck` PASS
- soul contract tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add frontend/package.json frontend/src/core/soul/types.ts frontend/src/core/soul/api.ts frontend/src/core/soul/hooks.ts frontend/src/core/soul/presentation.ts frontend/src/components/workspace/memory/memory-home-page.tsx frontend/src/components/workspace/memory/memory-growth-page.tsx frontend/src/components/workspace/memory/memory-user-page.tsx frontend/src/components/workspace/memory/soul-growth-timeline.tsx frontend/src/components/workspace/memory/soul-summary-card.tsx frontend/src/components/workspace/memory/soul-proposal-list.tsx docs/test/README.md docs/test/10-memory-soul/README.md && \
git commit -m "feat: harden memory and soul product surface for desktop acceptance"
```

---

### Task 7: Legacy Cutover And Final Acceptance Gate

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/CLAUDE.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/README.md`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_prompt_integration.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/tests/test_memory_os_soul_prompt_integration.py`

- [ ] **Step 1: Write the failing acceptance test**

```python
def test_prompt_runtime_uses_canonical_soul_without_legacy_prompt_mixing(tmp_path, monkeypatch):
    from nion.agents.lead_agent.prompt import get_agent_soul
    from nion.memory_os.repository import MemoryOSRepository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "稳定、长期主义。",
            "confidence": 1.0,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    (tmp_path / "SOUL.md").write_text("legacy fallback", encoding="utf-8")
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    result = get_agent_soul(None)
    assert "<soul_runtime>" in result
    assert "legacy fallback" not in result
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_prompt_integration.py tests/test_memory_os_soul_prompt_integration.py -q
```

Expected:

- FAIL if prompt runtime still存在默认 legacy 混入或文档未同步最终 cutover 语义

- [ ] **Step 3: Write minimal implementation**

```python
def should_use_legacy_soul_fallback(repository) -> bool:
    return not any(row["memory_id"] == "soul_core_main" for row in repository.list_memory_records(domain="soul"))
```

- [ ] **Step 4: Run full acceptance gate**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_*.py tests/test_memory_growth_router.py tests/test_automation_router.py -q && \
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend && \
pnpm typecheck && \
pnpm test:contracts -- src/core/soul/presentation.test.ts src/components/workspace/memory/soul-growth-timeline.contract.test.ts && \
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
make desktop-dev
```

Expected:

- 后端回归 PASS
- 前端 typecheck PASS
- 前端 contract tests PASS
- 桌面端成功启动，并且 `/workspace/memory`、`/workspace/memory/growth`、`/workspace/automation` 可人工验收

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation && \
git add README.md backend/CLAUDE.md docs/memory-update/README.md && \
git commit -m "docs: declare complete memory and soul cutover semantics"
```

---

## Final Acceptance Checklist

- [ ] 没有任何用户可见页面把 legacy fallback 包装成可写能力。
- [ ] 没有任何 memory/soul/growth 业务路径再使用写死时间戳。
- [ ] `recent soul events` 只来自后端一等事件流，不靠前端局部拼接。
- [ ] `identity_narrative` 与 `relationship_soul` 都有正式 stable artifact 行为。
- [ ] `agent-owned automation` 的创建入口已经被桥接层接管，而不是散落在 router/service。
- [ ] retention/archive/purge 已经可运行。
- [ ] 前端 contract tests 有正式 runner。
- [ ] 桌面端关键路径完成验收。

## Self-Review

### Spec coverage

- 已覆盖你刚刚明确提出的 4 条验收目标：
  - 完成度收口
  - 控制链更可靠
  - 页面更像真实产品面
  - 避免“补丁叠补丁”
- 也补上了之前仍未真正完成的两项：
  - retention/cleanup
  - frontend test runner / desktop acceptance

### Placeholder scan

- 本计划没有使用 `TODO`、`TBD`、`类似上一步` 之类占位语。
- 每个任务都给了明确文件、测试、命令、预期输出和 commit 粒度。

### Type consistency

- 新引入的中轴对象命名统一为：
  - `clock.py`
  - `growth_orchestrator.py`
  - `retention.py`
  - `automation_bridge.py`
- 它们分别负责时间、成长编排、保留策略、自动化桥接，不与已有 `soul_*`、`automation/*` 文件职责重叠。
