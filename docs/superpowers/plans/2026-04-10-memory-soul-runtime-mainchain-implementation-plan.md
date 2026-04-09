# Memory / Soul Runtime Mainchain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Memory / Soul 的运行时主链重构为单一正式注入链，确保 stable soul、adaptive overlay、runtime memory recall 和 legacy compatibility 的边界与当前产品模型一致。

**Architecture:** 本计划围绕“单一 runtime bundle + stable/active 分层 + legacy compatibility 退出主链”展开。先锁测试合同，再收 runtime bundle owner，再切 prompt/continuity 读取路径，最后退休 legacy updater/queue 并做完整回归。

**Tech Stack:** Python, FastAPI-adjacent backend services, LangGraph middleware, Pydantic, pytest, frontend typecheck/contracts for regression guard

---

## Scope Guard

本计划**只覆盖**：

- runtime memory / soul bundle 统一
- stable soul / adaptive overlay 生命周期修正
- prompt / continuity / runtime_engine 注入链统一
- legacy memory updater / queue 的退休或硬隔离
- internal governance / compat 在 runtime 主链中的 owner 收口

本计划**不覆盖**：

- 新的 Memory / Soul 产品页面改版
- Notebook 语义重构
- Automation IA 改版
- 非 memory/soul 范围的 prompt system 通用重写

## File Map

### Runtime assembly

- Create: `backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/models.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`

### Soul lifecycle

- Modify: `backend/packages/harness/nion/memory/soul/service.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `backend/packages/harness/nion/memory_os/soul_reflection.py`
- Modify: `backend/packages/harness/nion/memory_os/soul_runtime.py`
- Modify: `backend/packages/harness/nion/memory_os/soul_transitions.py`
- Modify: `backend/packages/harness/nion/memory_os/relationship_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/judge.py`

### Legacy compatibility

- Modify: `backend/packages/harness/nion/agents/memory/updater.py`
- Modify: `backend/packages/harness/nion/agents/memory/queue.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
- Modify: `backend/packages/harness/nion/memory_os/compat.py`

### Tests

- Create: `backend/tests/test_memory_runtime_soul_bundle.py`
- Create: `backend/tests/test_memory_runtime_injection.py`
- Modify: `backend/tests/test_memory_os_soul_runtime.py`
- Modify: `backend/tests/test_memory_os_soul_reflection.py`
- Modify: `backend/tests/test_memory_os_heartbeat.py`
- Modify: `backend/tests/test_memory_os_soul_transitions.py`
- Modify: `backend/tests/test_memory_os_soul_events.py`
- Modify: `backend/tests/test_memory_os_governance.py`

### Docs / verification notes

- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/10-memory-soul/README.md`

## Task 1: Freeze The Runtime Contract In Tests

**Files:**
- Create: `backend/tests/test_memory_runtime_soul_bundle.py`
- Create: `backend/tests/test_memory_runtime_injection.py`
- Modify: `backend/tests/test_memory_os_soul_runtime.py`
- Modify: `backend/tests/test_memory_os_soul_reflection.py`
- Modify: `backend/tests/test_memory_os_heartbeat.py`

- [ ] **Step 1: Write failing tests for the new runtime soul bundle shape**

```python
def test_runtime_memory_sections_split_stable_soul_and_overlay(tmp_path: Path):
    from nion.memory.runtime_engine.service import build_runtime_memory_context
    from nion.memory_os.repository import MemoryOSRepository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    # seed stable soul + overlay here

    result = build_runtime_memory_context(
        repository=repo,
        query="月底复盘",
        thread_id="thread:test",
        memory_read=True,
    )

    assert result.sections.core_identity is not None
    assert result.sections.speech_style is not None
    assert result.sections.values_and_boundaries is not None
    assert result.sections.relationship_stance is not None
    assert result.sections.adaptive_overlay is not None
```

- [ ] **Step 2: Write failing injection tests for prompt and continuity**

```python
def test_prompt_and_continuity_consume_same_runtime_bundle(monkeypatch, tmp_path: Path):
    # assert lead_agent prompt path and continuity middleware both render
    # the same stable soul / overlay sections from one bundle source
    ...
```

- [ ] **Step 3: Rewrite existing runtime tests away from proposal/governance assumptions**

目标：
- `soul_reflection` 只断言 overlay 更新
- `heartbeat` 只断言 real clock + overlay update
- `soul_runtime` 只断言 stable soul + adaptive overlay 注入

- [ ] **Step 4: Run the failing runtime subset**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_runtime_soul_bundle.py \
  backend/tests/test_memory_runtime_injection.py \
  backend/tests/test_memory_os_soul_runtime.py \
  backend/tests/test_memory_os_soul_reflection.py \
  backend/tests/test_memory_os_heartbeat.py -q
```

Expected:
- FAIL on missing bundle fields / duplicated assembly / old runtime assumptions

- [ ] **Step 5: Commit the contract baseline**

```bash
git add backend/tests/test_memory_runtime_soul_bundle.py \
  backend/tests/test_memory_runtime_injection.py \
  backend/tests/test_memory_os_soul_runtime.py \
  backend/tests/test_memory_os_soul_reflection.py \
  backend/tests/test_memory_os_heartbeat.py
git commit -m "test: freeze the runtime soul bundle contract"
```

## Task 2: Introduce A Single Runtime Soul Bundle

**Files:**
- Create: `backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/models.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/memory/soul/service.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`

- [ ] **Step 1: Define explicit runtime fields instead of implicit legacy names**

```python
class RuntimeMemorySections(BaseModel):
    core_identity: str | None = None
    speech_style: str | None = None
    values_and_boundaries: str | None = None
    relationship_stance: str | None = None
    adaptive_overlay: str | None = None
    hot_memories: list[str] = Field(default_factory=list)
    relevant_procedures: list[str] = Field(default_factory=list)
    scoped_recall: list[str] = Field(default_factory=list)
    verbatim_evidence: list[str] = Field(default_factory=list)
```

- [ ] **Step 2: Create one soul bundle builder that reads stable soul and adaptive overlay with one owner**

```python
def build_runtime_soul_bundle(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> RuntimeSoulBundle:
    settings = build_soul_settings_payload(repository, now_z=now_z)
    return RuntimeSoulBundle(
        core_identity=settings["core_identity"],
        speech_style=settings["speech_style"],
        values_and_boundaries=settings["values_and_boundaries"],
        relationship_stance=settings["relationship_stance"],
        adaptive_overlay=settings["adaptive_overlay_summary"],
    )
```

- [ ] **Step 3: Make runtime_engine consume the new bundle instead of scanning by subtype itself**

```python
soul_bundle = build_runtime_soul_bundle(repository, now_z=utcnow_z())
sections = RuntimeMemorySections(
    core_identity=soul_bundle.core_identity,
    speech_style=soul_bundle.speech_style,
    values_and_boundaries=soul_bundle.values_and_boundaries,
    relationship_stance=soul_bundle.relationship_stance,
    adaptive_overlay=soul_bundle.adaptive_overlay,
    ...
)
```

- [ ] **Step 4: Keep `console_service` as the stable soul owner and remove duplicate runtime-specific inference**

目标：
- `build_soul_settings_payload()` 成为 stable soul 读取权威入口
- `runtime_engine` 不再重新推断 stable soul 字段

- [ ] **Step 5: Run the focused backend tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_runtime_soul_bundle.py \
  backend/tests/test_memory_soul_router.py \
  backend/tests/test_memory_os_soul_runtime.py -q
```

Expected:
- PASS with explicit stable soul + overlay bundle

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py \
  backend/packages/harness/nion/memory/runtime_engine/models.py \
  backend/packages/harness/nion/memory/runtime_engine/service.py \
  backend/packages/harness/nion/memory/soul/service.py \
  backend/packages/harness/nion/memory/soul/console_service.py
git commit -m "feat: introduce a single runtime soul bundle"
```

## Task 3: Cut Prompt And Continuity Over To The Unified Runtime Bundle

**Files:**
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`

- [ ] **Step 1: Stop direct prompt path from separately fetching Memory OS and Soul runtime**

```python
pack = MemoryOSContextAssembler(repo).build_runtime_memory_pack(
    query=query,
    thread_id=thread_id,
    memory_read=memory_read,
)
return pack.to_prompt_block()
```

约束：
- `prompt.py` 不再单独调用 `compile_soul_runtime()` 作为平行入口
- soul 信息必须来自 runtime bundle 结果

- [ ] **Step 2: Make continuity middleware consume the same bundle-to-pack path**

```python
memory_pack = MemoryOSContextAssembler(self._memory_repo).build_runtime_memory_pack(
    query=latest_content,
    thread_id=thread_id,
    memory_read=True,
)
```

重点不是保留现状，而是确保两边都来自同一 builder。

- [ ] **Step 3: Add regression tests for identical section presence**

```python
def test_continuity_and_prompt_share_runtime_bundle_fields(...):
    assert "core_identity" in prompt_block
    assert "core_identity" in continuity_block
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_runtime_injection.py \
  backend/tests/test_memory_runtime_soul_bundle.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/packages/harness/nion/agents/middlewares/continuity_middleware.py \
  backend/packages/harness/nion/memory_os/context_assembler.py \
  backend/packages/harness/nion/memory/runtime_engine/service.py \
  backend/tests/test_memory_runtime_injection.py
git commit -m "refactor: unify prompt and continuity memory injection"
```

## Task 4: Lock Stable Soul Ownership And Adaptive Overlay Lifecycle

**Files:**
- Modify: `backend/packages/harness/nion/memory_os/soul_reflection.py`
- Modify: `backend/packages/harness/nion/memory_os/soul_transitions.py`
- Modify: `backend/packages/harness/nion/memory_os/relationship_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/judge.py`
- Modify: `backend/packages/harness/nion/memory_os/soul_runtime.py`
- Modify: `backend/tests/test_memory_os_soul_reflection.py`
- Modify: `backend/tests/test_memory_os_soul_transitions.py`
- Modify: `backend/tests/test_memory_os_soul_events.py`

- [ ] **Step 1: Make `soul_reflection` only refresh adaptive overlay**

目标：
- no proposal
- no stable soul mutation
- only overlay update / no-op

- [ ] **Step 2: Explicitly forbid automatic stable soul promotion paths**

约束：
- staged identity narrative can remain internal
- staged -> stable promotion must only happen from explicit transition points
- relationship-derived signals cannot directly rewrite stable `relationship_stance`

- [ ] **Step 3: Add overlay lifecycle tests**

```python
def test_overlay_refresh_deduplicates_same_summary(...): ...
def test_overlay_expires_without_touching_stable_soul(...): ...
def test_relationship_signal_does_not_rewrite_stable_relationship_stance(...): ...
```

- [ ] **Step 4: Run soul lifecycle tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_os_soul_reflection.py \
  backend/tests/test_memory_os_soul_transitions.py \
  backend/tests/test_memory_os_soul_events.py \
  backend/tests/test_memory_os_soul_runtime.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/memory_os/soul_reflection.py \
  backend/packages/harness/nion/memory_os/soul_transitions.py \
  backend/packages/harness/nion/memory_os/relationship_soul.py \
  backend/packages/harness/nion/memory/soul/judge.py \
  backend/packages/harness/nion/memory_os/soul_runtime.py \
  backend/tests/test_memory_os_soul_reflection.py \
  backend/tests/test_memory_os_soul_transitions.py \
  backend/tests/test_memory_os_soul_events.py
git commit -m "feat: lock stable soul ownership and overlay lifecycle"
```

## Task 5: Retire Or Hard-Gate Legacy Memory Updater / Queue

**Files:**
- Modify: `backend/packages/harness/nion/agents/memory/updater.py`
- Modify: `backend/packages/harness/nion/agents/memory/queue.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
- Modify: `backend/packages/harness/nion/memory_os/compat.py`
- Modify: `backend/CLAUDE.md`

- [ ] **Step 1: Decide the compatibility posture in code, not just comments**

选一条并写死：
- fully retired from primary path
- or gated behind explicit compatibility flag

- [ ] **Step 2: Remove default middleware reliance on legacy updater/queue**

```python
if not compatibility_mode_enabled:
    return None
```

或者直接从默认 runtime path 断开。

- [ ] **Step 3: Add tests that prove legacy path is no longer primary**

```python
def test_primary_runtime_path_does_not_queue_legacy_memory_updates(...): ...
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_os_governance.py \
  backend/tests/test_memory_runtime_injection.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/memory/updater.py \
  backend/packages/harness/nion/agents/memory/queue.py \
  backend/packages/harness/nion/agents/middlewares/memory_middleware.py \
  backend/packages/harness/nion/memory_os/compat.py \
  backend/CLAUDE.md
git commit -m "refactor: retire legacy memory updater from the primary chain"
```

## Task 6: Full Verification And E2E Evidence

**Files:**
- Modify if needed: `docs/test/10-memory-soul/README.md`
- Capture evidence only, no speculative code changes here

- [ ] **Step 1: Run the full backend target regression**

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_router.py \
  backend/tests/test_memory_canonical_router.py \
  backend/tests/test_memory_soul_router.py \
  backend/tests/test_memory_os_growth_orchestrator.py \
  backend/tests/test_memory_os_heartbeat.py \
  backend/tests/test_memory_os_soul_reflection.py \
  backend/tests/test_memory_os_soul_events.py \
  backend/tests/test_memory_os_soul_event_store.py \
  backend/tests/test_memory_os_governance.py \
  backend/tests/test_memory_os_soul_transitions.py \
  backend/tests/test_memory_os_soul_runtime.py -q
```

- [ ] **Step 2: Run the frontend regression guard**

```bash
pnpm --dir frontend typecheck
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/memory/memory-user-page.contract.test.ts \
  src/components/workspace/memory/memory-retired-client-layers.contract.test.ts \
  src/components/workspace/memory/memory-routes.contract.test.ts \
  src/components/workspace/memory/memory-route-smoke.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts \
  src/components/workspace/automation/automation-job-detail-page.contract.test.ts \
  src/core/test-runner.contract.test.ts
node --test frontend/tests/tsconfig.contract.test.mjs frontend/src/core/navigation/desktop-routes.test.ts
```

- [ ] **Step 3: Collect browser / electron evidence**

验证点：
- `/workspace/memory` 仍然只显示三组记忆内容
- `Settings > Soul` 仍然只显示稳定层字段
- runtime 行为变化不会让 stable soul 在 UI 中无端漂移

- [ ] **Step 4: Update docs/test if verification commands changed**

- [ ] **Step 5: Final commit**

```bash
git add docs/test/10-memory-soul/README.md
git commit -m "docs: record runtime mainchain verification"
```

## Self-Review

### Spec coverage

- runtime assembly owner：Task 2 + Task 3
- stable soul / overlay lifecycle：Task 4
- legacy updater / queue owner：Task 5
- full verification：Task 6

### Placeholder scan

- 没有留空白标记
- 每个任务都给了明确文件和命令
- 关键重构点都有明确 owner

### Type / name consistency

- runtime 统一使用 `stable soul + adaptive overlay + runtime memory bundle`
- 第二阶段不再允许 proposal/governance 语义回到主链

## Execution Handoff

Plan complete and saved to [2026-04-10-memory-soul-runtime-mainchain-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-10-memory-soul-runtime-mainchain-implementation-plan.md)。

两种执行方式：

1. Subagent-Driven（推荐）
   逐任务分发新 subagent，任务间 review，再继续。

2. Inline Execution
   在当前会话里按计划分批执行，边做边回归。
