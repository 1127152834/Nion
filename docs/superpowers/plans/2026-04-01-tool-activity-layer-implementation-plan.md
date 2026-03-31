# Tool Activity Layer Native Upgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Tool Activity 升级为 Nion runtime 的原生产品能力层，而不是对现有 `tool` message 和 diagnostics 的兼容性增强。

**Architecture:** 先建立 Tool Activity 原生领域模型和原生 stream contract，再把它投影到 thread state、task/subtask、diagnostics 和 frontend 消息系统。聊天流、任务流、诊断流共用同一套活动语义，原始 tool message 继续保留但不承担摘要职责。

**Tech Stack:** Python backend, LangGraph/LangChain runtime, FastAPI gateway/daemon, Next.js frontend, existing task/subtask + telemetry stack

---

## File Structure

### Create

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_profiles.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_batches.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/tool-activity/types.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-summary-card.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-timeline.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_batches.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_stream.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/tool-activity-groups.test.ts`

### Modify

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/task_tool.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/telemetry/models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/routers/diagnostics.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/types.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/hooks.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-group.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/agents/agent-chat-page.tsx`

---

## Scope Lock

这个计划只覆盖原生 Tool Activity Layer，不同时做：

- SkillTool
- GlobTool
- GrepTool
- FileEditTool 强化
- LSPTool

这些工具补齐仍然重要，但不属于这次实施范围。

---

## Architecture Invariants

- Tool Activity 是 **一等领域模型**，不是 `details` 扩展的名字游戏
- `tool_activity` 必须有 **独立 stream contract**
- `tool_activity_summary` 必须有 **独立前端消息类型**
- task/diagnostics 是从 Tool Activity 派生，不是自己再拼 summary
- 原始 `tool` message 仍保留，不能被高层摘要取代

## Hard Architecture Decisions

这些不是建议，而是实现时必须遵守的硬约束。

### 1. Source of Truth

- 唯一真相是 `ToolActivityEvent log`
- `thread state`、`messages`、`task diagnostics`、`telemetry snapshot` 都只能是 projection
- 不允许把任何 projection 反向当主数据源使用

### 2. Chat Transport

- 原生 runtime 先发 `tool-activity` stream event
- 再投影成 `tool_activity_summary` message
- 前端当前主消费 `tool_activity_summary` message，而不是直接消费底层 event
- 不允许把 Tool Activity 直接伪装成 `tool` / `ai` message

### 3. Task Lineage

- `thread_id` 必填
- `task_id/subtask_id` 可选
- lineage 只能由 runtime 显式传播，不能由 diagnostics、前端或聚合逻辑推断

这些决策一旦违背，就等于重新回到兼容式补丁路线。

---

## Task 1: 建立 Tool Activity 原生领域模型

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_models.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_models.py`

- [ ] **Step 1: Write the failing test**

```python
from nion.tools.activity_models import (
    ToolActivityBatch,
    ToolActivityEvent,
    ToolActivityKind,
)


def test_tool_activity_event_is_first_class_model():
    event = ToolActivityEvent(
        event_id="evt-1",
        kind=ToolActivityKind.TOOL_STARTED,
        tool_name="read_file",
        tool_call_id="call-1",
        thread_id="thread-1",
        timestamp="2026-04-01T00:00:00Z",
        activity_label="Reading file",
        summary_label="Read file",
        result_class="read",
        visibility="full",
    )

    assert event.kind == ToolActivityKind.TOOL_STARTED
    assert event.tool_name == "read_file"
    assert event.result_class == "read"


def test_tool_activity_batch_tracks_group_and_summary():
    batch = ToolActivityBatch(
        group_id="group-1",
        thread_id="thread-1",
        tool_names=["read_file", "ls"],
        events=[],
        summary=None,
    )

    assert batch.group_id == "group-1"
    assert batch.tool_names == ["read_file", "ls"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_models.py -q`
Expected: FAIL with missing module or symbols

- [ ] **Step 3: Write minimal implementation**

```python
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Literal


class ToolActivityKind(StrEnum):
    TOOL_STARTED = "tool_started"
    TOOL_PROGRESS = "tool_progress"
    TOOL_COMPLETED = "tool_completed"
    TOOL_FAILED = "tool_failed"
    TOOL_BATCH_SUMMARY = "tool_batch_summary"


ToolActivityVisibility = Literal["full", "compact", "diagnostic_only"]


@dataclass(slots=True)
class ToolActivityEvent:
    event_id: str
    kind: ToolActivityKind
    tool_name: str
    tool_call_id: str | None = None
    thread_id: str | None = None
    run_id: str | None = None
    task_id: str | None = None
    subtask_id: str | None = None
    group_id: str | None = None
    timestamp: str = ""
    activity_label: str = ""
    summary_label: str = ""
    result_class: str = "generic"
    detail: dict[str, Any] = field(default_factory=dict)
    visibility: ToolActivityVisibility = "full"


@dataclass(slots=True)
class ToolActivityBatch:
    group_id: str
    thread_id: str
    tool_names: list[str]
    events: list[ToolActivityEvent]
    summary: ToolActivityEvent | None
    run_id: str | None = None
    task_id: str | None = None
    subtask_id: str | None = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_models.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_models.py backend/tests/test_tool_activity_models.py
git commit -m "feat(tool-activity): add native activity domain models"
```

## Task 2: 给 Tool Catalog 升级为 Activity-aware Catalog

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_profiles.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_models.py`

- [ ] **Step 1: Write the failing test**

```python
from nion.tools.activity_profiles import get_tool_activity_profile


def test_activity_profile_exists_for_builtin_task_tool():
    profile = get_tool_activity_profile("task")
    assert profile.activity_label == "Running subtask"
    assert profile.summary_label == "Completed subtask"


def test_activity_profile_exists_for_read_file():
    profile = get_tool_activity_profile("read_file")
    assert profile.result_class == "read"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_models.py -q`
Expected: FAIL with missing profile registry

- [ ] **Step 3: Write minimal implementation**

```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ToolActivityProfile:
    activity_label: str
    summary_label: str
    result_class: str
    visibility: str = "full"


_PROFILES = {
    "task": ToolActivityProfile("Running subtask", "Completed subtask", "subtask"),
    "tool_search": ToolActivityProfile("Searching deferred tools", "Matched deferred tools", "search"),
    "read_file": ToolActivityProfile("Reading file", "Read file", "read"),
    "write_file": ToolActivityProfile("Writing file", "Wrote file", "write"),
    "str_replace": ToolActivityProfile("Editing file", "Edited file", "edit"),
    "ls": ToolActivityProfile("Listing files", "Listed files", "read"),
    "bash": ToolActivityProfile("Running command", "Ran command", "shell"),
    "web_search": ToolActivityProfile("Searching web", "Searched web", "search"),
    "web_fetch": ToolActivityProfile("Fetching page", "Fetched page", "fetch"),
    "present_files": ToolActivityProfile("Preparing file preview", "Presented files", "present"),
    "view_image": ToolActivityProfile("Opening image", "Viewed image", "media"),
}


def get_tool_activity_profile(tool_name: str) -> ToolActivityProfile:
    return _PROFILES.get(
        tool_name,
        ToolActivityProfile("Running tool", "Completed tool", "generic"),
    )
```

```python
from dataclasses import dataclass

from nion.tools.activity_profiles import ToolActivityProfile, get_tool_activity_profile


@dataclass(slots=True)
class ToolCatalogEntry:
    name: str
    group: str
    source: str
    policy_managed: bool = True
    activity_profile: ToolActivityProfile | None = None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_models.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_profiles.py backend/packages/harness/nion/tools/catalog.py backend/tests/test_tool_activity_models.py
git commit -m "feat(tool-activity): make tool catalog activity-aware"
```

## Task 3: 建立原生批次建模与规则摘要

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_batches.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_batches.py`

- [ ] **Step 1: Write the failing test**

```python
from nion.tools.activity_summary import summarize_tool_batch


def test_read_batch_summarizes_to_project_file_inspection():
    summary = summarize_tool_batch(["read_file", "ls", "read_file"])
    assert summary.summary_label == "Inspected project files"


def test_task_batch_summarizes_to_subtask_tracking():
    summary = summarize_tool_batch(["task", "task"])
    assert summary.summary_label == "Delegated and tracked subtasks"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_batches.py -q`
Expected: FAIL with missing batch summarizer

- [ ] **Step 3: Write minimal implementation**

```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ToolBatchSummary:
    summary_label: str
    result_class: str


def summarize_tool_batch(tool_names: list[str]) -> ToolBatchSummary:
    names = set(tool_names)
    if names <= {"read_file", "ls"}:
        return ToolBatchSummary("Inspected project files", "read")
    if names <= {"task"}:
        return ToolBatchSummary("Delegated and tracked subtasks", "subtask")
    if names <= {"tool_search", "web_search", "web_fetch"}:
        return ToolBatchSummary("Searched runtime surfaces", "search")
    if "bash" in names:
        return ToolBatchSummary("Ran workspace commands", "shell")
    return ToolBatchSummary("Completed tool batch", "generic")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_batches.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_batches.py backend/packages/harness/nion/tools/activity_summary.py backend/tests/test_tool_activity_batches.py
git commit -m "feat(tool-activity): add native batch grouping and summaries"
```

## Task 4: 在 runtime 中增加原生 Tool Activity stream contract

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_stream.py`

- [ ] **Step 1: Write the failing test**

```python
from nion.client import StreamEvent


def test_stream_event_supports_tool_activity():
    event = StreamEvent(
        type="tool-activity",
        data={
            "kind": "tool_batch_summary",
            "summary_label": "Inspected project files",
            "group_id": "group-1",
            "tool_names": ["read_file", "ls"],
        },
    )
    assert event.type == "tool-activity"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_stream.py -q`
Expected: FAIL or missing integration coverage

- [ ] **Step 3: Write minimal implementation**

```python
# in NionClient.stream
# 1. collect tool-call/tool-result lifecycle
# 2. build ToolActivityEvent objects
# 3. yield StreamEvent(type="tool-activity", data=...)
# 4. append matching persisted message object into values projection
```

Implementation requirements:

- `tool-activity` is a new stream event type
- persisted messages include a new `tool_activity_summary` message type
- do not overload `tool` / `ai` messages
- `values` projection and incremental stream must converge on the same summary objects

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_stream.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/client.py backend/packages/harness/nion/threads/service.py backend/tests/test_tool_activity_stream.py
git commit -m "feat(tool-activity): add native stream contract"
```

## Task 5: 将 Tool Activity 投影到 task / diagnostics / telemetry

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/task_tool.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/telemetry/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/routers/diagnostics.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_stream.py`

- [ ] **Step 1: Write the failing test**

```python
def test_diagnostics_snapshot_can_project_latest_tool_activity():
    details = {
        "latest_tool_summary": "Delegated and tracked subtasks",
        "latest_tool_activity": "Running subtask",
    }
    assert details["latest_tool_summary"] == "Delegated and tracked subtasks"
```

- [ ] **Step 2: Run test to verify it fails or is not yet wired**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_stream.py -q`
Expected: FAIL after adding projection assertions

- [ ] **Step 3: Write minimal implementation**

Implementation requirements:

- task lifecycle code writes `latest_tool_summary` and `latest_tool_activity` from Tool Activity projection
- diagnostics router only reads projected values; it must not compute summaries
- telemetry snapshot remains compatible but adds projected activity timeline fields

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_stream.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/builtins/task_tool.py backend/packages/harness/nion/telemetry/models.py backend/app/daemon/routers/diagnostics.py backend/tests/test_tool_activity_stream.py
git commit -m "feat(tool-activity): project activity into tasks and diagnostics"
```

## Task 6: 前端原生支持 Tool Activity 消息与分组

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/tool-activity/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/tool-activity-groups.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { groupMessages } from "@/core/messages/utils";

test("groups tool activity summary as native assistant summary group", () => {
  const result = groupMessages(
    [
      { type: "human", id: "u1", content: "hi" } as any,
      {
        type: "tool_activity_summary",
        id: "tas1",
        content: "Inspected project files",
        additional_kwargs: { group_id: "group-1", tool_names: ["read_file"] },
      } as any,
    ],
    (group) => group.type,
  );

  expect(result).toContain("assistant:tool-activity-summary");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-groups.test.ts`
Expected: FAIL with unknown type handling

- [ ] **Step 3: Write minimal implementation**

Implementation requirements:

- `Message` union supports `tool_activity_summary`
- stream hook merges these messages without treating them as `tool`
- message grouping introduces a new native group:
  - `assistant:tool-activity-summary`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-groups.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/tool-activity/types.ts frontend/src/core/threads/types.ts frontend/src/core/threads/hooks.ts frontend/src/core/messages/utils.ts frontend/src/core/messages/tool-activity-groups.test.ts
git commit -m "feat(tool-activity): add native frontend message support"
```

## Task 7: 聊天流与任务面原生渲染 Tool Activity

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-summary-card.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-timeline.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-group.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/agents/agent-chat-page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { ToolActivitySummaryCard } from "./tool-activity-summary-card";

test("renders summary label and tool count", () => {
  render(
    <ToolActivitySummaryCard
      summaryLabel="Inspected project files"
      toolNames={["read_file", "ls", "read_file"]}
    />,
  );

  expect(screen.getByText("Inspected project files")).toBeInTheDocument();
  expect(screen.getByText(/3 tool calls/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-summary-card`
Expected: FAIL with missing component

- [ ] **Step 3: Write minimal implementation**

Implementation requirements:

- `ToolActivitySummaryCard` is visually lower priority than tool call blocks
- `MessageGroup` renders it as its own native group
- `chat-thread-page` and `agent-chat-page` surface latest summary near existing Todo/subtask areas
- rich rendering first lands only in `workspace` and `agent page`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/messages/tool-activity-summary-card.tsx frontend/src/components/workspace/messages/tool-activity-timeline.tsx frontend/src/components/workspace/messages/message-group.tsx frontend/src/app/workspace/chats/chat-thread-page.tsx frontend/src/app/workspace/agents/agent-chat-page.tsx
git commit -m "feat(tool-activity): render native summaries in workspace surfaces"
```

## Task 8: 为混合批次接入模型兜底摘要

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary.py`

- [ ] **Step 1: Write the failing test**

```python
from nion.tools.activity_summary import summarize_tool_batch


def test_mixed_batch_still_returns_non_empty_summary():
    summary = summarize_tool_batch(["read_file", "bash", "task"])
    assert summary.summary_label != ""
```

- [ ] **Step 2: Run test to verify current generic fallback behavior**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_batches.py -q`
Expected: PASS with generic fallback, use this as baseline

- [ ] **Step 3: Write minimal implementation**

Implementation requirements:

- keep rule-based summary as default path
- add optional small-model fallback for unresolved mixed batches
- fallback output must still populate native `ToolBatchSummary`

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_batches.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_summary.py
git commit -m "feat(tool-activity): add model fallback summarization"
```

## Final Review Checklist

- [ ] Tool Activity is a first-class runtime domain object
- [ ] Thread stream has a native `tool-activity` event
- [ ] Thread state has native `tool_activity_summary` message objects
- [ ] Frontend supports a native tool activity message/group type
- [ ] Task and diagnostics surfaces project from Tool Activity, not bespoke strings
- [ ] Original `tool` messages remain intact and traceable
- [ ] Workspace and agent page rich rendering works without changing channel/automation semantics

## Execution Order

Implement in this exact order:

1. domain model
2. catalog/profile
3. batch grouping + rule summary
4. stream contract
5. diagnostics/task projection
6. frontend message type support
7. workspace rendering
8. model fallback

## Why This Plan Replaces the Previous One

This plan intentionally replaces the earlier compatibility-oriented version.

It does **not** treat Tool Activity as:

- an optional `details.latest_tool_summary`
- a frontend inference layer
- a synthetic `tool` message hack

Instead, it upgrades Tool Activity into Nion's native product model so that future tools and future specialist agents can join the same layer without reworking the chat chain again.
