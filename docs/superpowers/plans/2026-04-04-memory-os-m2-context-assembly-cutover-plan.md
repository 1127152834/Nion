# Memory OS M2 Context Assembly Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不切断现有主链的前提下，为 prompt memory 注入与 continuity retrieval 增加 Memory OS context pack 接口，并保留 legacy fallback。

**Architecture:** 这一步不删除 `memory.json` 或现有 continuity 逻辑，而是在 `lead_agent.prompt` 和 `ContinuityMiddleware` 旁边增加 `memory_os/context_pack.py` 与 `memory_os/context_assembler.py` 的兼容入口。优先策略是：有 Memory OS 可用内容就组装 Memory OS context；没有时退回 legacy memory/recall/notebook 路径。

**Tech Stack:** Python 3.12, Pydantic, LangGraph middleware, existing prompt runtime and continuity middleware

---

## File Structure

### New Files

- `backend/packages/harness/nion/memory_os/context_pack.py`
  - 定义 `MemoryContextPack` 和 pack item model
- `backend/packages/harness/nion/memory_os/context_assembler.py`
  - 负责从 Memory OS metadata 组装 prompt memory/context block
- `backend/tests/test_memory_os_context_pack.py`
  - 验证 context pack 组装
- `backend/tests/test_memory_os_prompt_integration.py`
  - 验证 `_get_memory_context()` 优先使用 Memory OS，缺失时 fallback
- `backend/tests/test_memory_os_continuity_bridge.py`
  - 验证 continuity middleware 可桥接 Memory OS context

### Modified Files

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
  - `_get_memory_context()` 改成优先读 Memory OS context pack
- `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
  - 在现有 recall/notebook 路径旁增加 Memory OS continuity bridge
- `backend/packages/harness/nion/memory_os/__init__.py`
  - 导出 context pack / assembler

## Task 1: Add Memory Context Pack Models

**Files:**
- Create: `backend/packages/harness/nion/memory_os/context_pack.py`
- Test: `backend/tests/test_memory_os_context_pack.py`

- [ ] **Step 1: Write the failing test**

```python
from nion.memory_os.context_pack import MemoryContextPack, MemoryContextPackItem


def test_memory_context_pack_renders_prompt_block():
    pack = MemoryContextPack(
        items=[
            MemoryContextPackItem(
                source_kind="user_model",
                title="沟通偏好",
                content="用户偏好直接表达。",
            )
        ]
    )

    rendered = pack.to_prompt_block()

    assert "<memory_os_context>" in rendered
    assert "用户偏好直接表达" in rendered
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_context_pack.py -q
```

Expected: import failure

- [ ] **Step 3: Implement minimal pack models**

Implement:

```python
from pydantic import BaseModel, Field


class MemoryContextPackItem(BaseModel):
    source_kind: str
    title: str | None = None
    content: str


class MemoryContextPack(BaseModel):
    items: list[MemoryContextPackItem] = Field(default_factory=list)

    def to_prompt_block(self) -> str:
        if not self.items:
            return ""
        body = "\n\n".join(
            f"## {item.title}\n{item.content}" if item.title else item.content
            for item in self.items
        )
        return f"<memory_os_context>\n{body}\n</memory_os_context>"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_context_pack.py -q
```

Expected: PASS

## Task 2: Add Memory OS Prompt Context Assembler

**Files:**
- Create: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Test: `backend/tests/test_memory_os_context_pack.py`

- [ ] **Step 1: Extend the failing test to verify assembly from repository rows**

```python
from pathlib import Path

from nion.memory_os.context_assembler import MemoryOSContextAssembler
from nion.memory_os.repository import MemoryOSRepository


def test_context_assembler_reads_active_user_model_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_01",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    assembler = MemoryOSContextAssembler(repo)

    pack = assembler.build_prompt_memory_pack()

    assert "用户偏好结论先行" in pack.to_prompt_block()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_context_pack.py -q
```

Expected: missing `MemoryOSContextAssembler` or repository read helper

- [ ] **Step 3: Implement minimal repository list helper and context assembler**

Add to repository:

```python
def list_memory_records(self, *, domain: str | None = None, status: str | None = None) -> list[dict[str, object]]: ...
```

Implement `context_assembler.py` to:

- read active `user_model`, `relationship`, `procedure`
- map them into `MemoryContextPackItem`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_context_pack.py -q
```

Expected: PASS

## Task 3: Integrate `_get_memory_context()` With Memory OS Fallback

**Files:**
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Test: `backend/tests/test_memory_os_prompt_integration.py`

- [ ] **Step 1: Write the failing integration test**

```python
from pathlib import Path

from nion.agents.lead_agent.prompt import _get_memory_context
from nion.memory_os.repository import MemoryOSRepository


def test_get_memory_context_prefers_memory_os_pack(tmp_path: Path, monkeypatch):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_01",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好直接表达。",
            "confidence": 0.9,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    result = _get_memory_context()

    assert "memory_os_context" in result
    assert "用户偏好直接表达" in result
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_prompt_integration.py -q
```

Expected: result still empty or uses only legacy memory

- [ ] **Step 3: Implement Memory OS-first fallback logic in `_get_memory_context()`**

Implement logic:

1. Try Memory OS repository + assembler
2. If pack non-empty, return `<memory_os_context>...`
3. Else fallback to legacy `format_memory_for_injection`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_prompt_integration.py -q
```

Expected: PASS

## Task 4: Add Continuity Bridge Hook Without Breaking Legacy Path

**Files:**
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Test: `backend/tests/test_memory_os_continuity_bridge.py`

- [ ] **Step 1: Write the failing bridge test**

```python
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.memory_os.repository import MemoryOSRepository


def test_continuity_middleware_injects_memory_os_context_when_available(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_01",
            "domain": "procedure",
            "subtype": "reporting",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "procedural",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务汇报默认使用结论/风险/动作三段式。",
            "confidence": 0.95,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    middleware = ContinuityMiddleware(base_dir=tmp_path)
    update = middleware.before_model(
        {"messages": [HumanMessage(content="继续帮我写财务周报", id="h-1")]},
        Runtime(context={"thread_id": "thread-1"}),
    )

    assert update is not None
    injected = update["messages"][0]
    assert isinstance(injected, SystemMessage)
    assert "三段式" in str(injected.content)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_continuity_bridge.py -q
```

Expected: no Memory OS-derived content injected

- [ ] **Step 3: Add optional Memory OS continuity query before legacy notebook fallback**

Implement in `ContinuityMiddleware`:

- query active `procedure` / `user_model` records from Memory OS
- if relevant results exist, prepend them into continuity block
- if none, keep current legacy path unchanged

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_continuity_bridge.py -q
```

Expected: PASS

## Task 5: Verification Sweep

**Files:**
- Test: `backend/tests/test_memory_os_context_pack.py`
- Test: `backend/tests/test_memory_os_prompt_integration.py`
- Test: `backend/tests/test_memory_os_continuity_bridge.py`

- [ ] **Step 1: Run focused M2 tests**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_context_pack.py \
  tests/test_memory_os_prompt_integration.py \
  tests/test_memory_os_continuity_bridge.py -q
```

Expected: PASS

- [ ] **Step 2: Run prompt/continuity regression tests**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_prompt_runtime_profiles.py \
  tests/test_recall_capture_middleware.py \
  tests/test_memory_prompt_injection.py -q
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/packages/harness/nion/agents/middlewares/continuity_middleware.py \
  backend/packages/harness/nion/memory_os \
  backend/tests/test_memory_os_context_pack.py \
  backend/tests/test_memory_os_prompt_integration.py \
  backend/tests/test_memory_os_continuity_bridge.py \
  docs/superpowers/plans/2026-04-04-memory-os-m2-context-assembly-cutover-plan.md
git commit -m "feat: bridge memory os into prompt context"
```

## Self-Review

### Spec coverage

- Covers M2 requirements from [09-memory-os-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/09-memory-os-implementation-plan.md): context pack, prompt memory integration, continuity bridge, legacy fallback.
- Does not attempt heartbeat or growth surfaces.

### Placeholder scan

- No TBD/TODO placeholders.
- Each code step includes concrete shape.

### Type consistency

- Uses stable names:
  - `MemoryContextPack`
  - `MemoryOSContextAssembler`
  - `_get_memory_context`

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/superpowers/plans/2026-04-04-memory-os-m2-context-assembly-cutover-plan.md`.
