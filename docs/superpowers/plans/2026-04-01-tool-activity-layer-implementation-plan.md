# Tool Activity Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Nion 建立统一的 Tool Activity / Tool Summary 协议层，把工具调用从原始日志提升为可理解、可摘要、可跨聊天流/任务流/诊断流复用的活动语义。

**Architecture:** 在后端先定义统一的 Tool Activity 数据模型和 Activity Profile，再在 agent runtime 中生成 tool activity 事件与批次摘要，并把它们写入线程流、task diagnostics、telemetry。前端新增 `tool_activity_summary` 渲染层，并在聊天区、子任务区、diagnostics 区统一消费。

**Tech Stack:** Python backend, LangGraph/LangChain agent runtime, FastAPI gateway/daemon, Next.js frontend, existing task/subtask and telemetry infrastructure

---

## 文件结构

### 需要新增的后端文件

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_profiles.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_events.py`

### 需要修改的后端文件

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/task_tool.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/routers/diagnostics.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/telemetry/models.py`

### 需要新增的前端文件

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/tool-activity/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-summary-card.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-timeline.tsx`

### 需要修改的前端文件

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-group.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/ai-elements/queue.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/agents/agent-chat-page.tsx`

### 需要补充的测试文件

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_profiles.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_summary.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_client_tool_activity_stream.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/tool-activity-groups.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-summary-card.test.tsx`

---

## 设计原则

- **工具活动不是前端猜出来的。** 后端/runtime 必须明确产出活动语义。
- **摘要不是替代原始工具结果。** 摘要是新的高层消息层，原始 tool message 仍然保留。
- **规则优先，模型兜底。** Nion 先利用结构化 task/subtask/tool metadata 做 deterministic summary，再在必要时接入小模型压缩。
- **同一协议，多处消费。** 聊天流、子任务、diagnostics、daemon 共享同一份 Tool Activity 数据结构。
- **与 Claude Code 致敬，但不照搬 transcript-only 视角。** Nion 要把 `task_id` / `subtask_id` 纳入一等字段。

---

## 影响评估与兼容约束

### 1. 对现有后端架构的影响

Tool Activity Layer 不应引入新的顶层后端服务或新的跨层依赖方向。必须保持当前边界不变：

- `packages/harness/nion/*` 继续承载 runtime、tool、thread、telemetry 逻辑
- `app/gateway/*` 与 `app/daemon/*` 只做已有数据结构的透传与聚合
- 不允许让 `app/*` 反向成为 tool activity 的核心源头

实施要求：

- Tool Activity 数据模型放在 `packages/harness/nion/tools/`，不要放到 `app/`
- diagnostics router 只消费已有 telemetry / snapshot 数据，不承担摘要计算职责
- thread service 只负责流拼装与持久化，不要把摘要规则硬编码到 router 层

### 2. 对现有业务流程的影响

Tool Activity Layer 会影响三类现有业务流程：

1. **常规聊天线程**
   - 新增 `tool_activity_summary` 事件后，线程消息将多出一类高层摘要消息
   - 不能改变现有 `values.messages` 的语义，也不能让旧消息丢失
2. **task/subtask 执行**
   - task diagnostics 将新增“最近工具摘要”能力
   - 不能改变已有 task timeout / failure / healthy 状态机
3. **控制平面/运维类工具**
   - `diagnose_incident`、`get_task_diagnostics`、`get_thread_diagnostics` 等工具会读取到更多细节
   - 不能要求这些工具迁移到新协议才能工作

实施要求：

- 新增字段只能是增量扩展，不能重定义现有 task snapshot 核心字段
- `latest_tool_summary` 一类字段进入 `details`，不替换 `summary`
- 业务流若不消费新摘要，原行为必须保持不变

### 3. 对聊天链路的影响

这是风险最高的一条线。

当前链路是：

- backend `NionClient.stream()` 产出 `StreamEvent`
- thread service 透传 `values` / `messages-tuple`
- frontend `useThreadStream()` 消费事件并合并到消息状态
- `groupMessages()` / `MessageGroup` 做显示分组

潜在风险：

- 新事件类型如果设计不当，会让前端丢弃、误分组或重复渲染
- 如果把摘要直接塞进现有 `tool` 消息，会破坏 `findToolCallResult()`、`hasToolCalls()`、`derivePendingPermissionRequest()` 等现有逻辑
- 如果只在 `values` 中附带摘要而不进增量流，实时体验会倒退

实施要求：

- `tool_activity_summary` 必须是新增消息类型或新增流事件类型，不允许复用 `tool`/`ai`/`human`
- 前端要先支持新类型的容错解析，再让后端发新类型
- `messages-tuple` 和 `values` 两条链路要保持最终一致，不能一个有摘要一个没有

### 4. 对交互体验的影响

Tool Activity Layer 会明显改变聊天区视觉密度和信息层级。

正向收益：

- 工具噪音下降
- 长任务可读性增强
- 子任务状态更人类可读

潜在副作用：

- 摘要卡片过多，反而造成新噪音
- 与现有 reasoning/tool-call 折叠区块重复表达
- summary 与真实工具结果不一致时，会损害可信度

实施要求：

- 摘要卡片默认紧凑，不要比现有 tool-call 卡片更抢视觉焦点
- 单工具调用不强制生成独立摘要卡片，避免重复
- 批次摘要优先展示“阶段完成”，而不是每一步都插卡片
- 原始工具结果仍应可追溯，summary 不能成为唯一证据

### 5. 对多 surface 的影响

Nion 不是单一 Web 聊天界面，至少有：

- workspace
- agent page
- daemon diagnostics
- desktop shell / bridge 相关场景
- channel / automation surface

实施要求：

- 第一版只在 `workspace` 与 `agent page` 做富渲染
- diagnostics 优先消费 `latest_tool_summary` 和 timeline
- `channel` / `automation` 先只保留后端数据结构兼容，不强行前端展示
- 新协议必须允许“不消费 rich summary 的 surface”继续正常工作

### 6. 兼容策略

为避免破坏现有系统，实施时遵守以下兼容策略：

1. **后端先行，前端容错先行，功能开关最后放开**
2. **先支持解析新消息，再开始发新消息**
3. **所有新增字段均为 optional**
4. **diagnostics / telemetry 使用 details 扩展，不改顶层 contract**
5. **Tool Activity Layer 不改变现有 tool_call/tool_result 原始记录语义**

### 7. 结论

这个改动对现有系统是“中等架构影响，高交互收益，高链路敏感度”。

可以做，而且值得做，但实现顺序必须严格：

1. 先定义协议
2. 再做前端容错
3. 再注入后端事件
4. 最后打开 rich rendering

任何跳步实现，都会把这次改动变成聊天链路和 diagnostics 链路的回归风险。

---

## Phase 1: 定义 Tool Activity 协议层

### Task 1: 定义后端数据模型

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_models.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_profiles.py`

- [ ] **Step 1: 写失败测试，锁定 Tool Activity 基础模型字段**

```python
from nion.tools.activity_models import ToolActivityEvent, ToolActivityKind


def test_tool_activity_event_has_required_fields():
    event = ToolActivityEvent(
        kind=ToolActivityKind.TOOL_STARTED,
        tool_name="read_file",
        tool_call_id="call-1",
        thread_id="thread-1",
        run_id="run-1",
        group_id="group-1",
        activity_label="Reading file",
        summary_label="Read file",
        visibility="full",
    )

    assert event.kind == ToolActivityKind.TOOL_STARTED
    assert event.tool_name == "read_file"
    assert event.activity_label == "Reading file"
    assert event.summary_label == "Read file"
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_profiles.py -q`
Expected: FAIL with `ModuleNotFoundError` or missing symbol errors

- [ ] **Step 3: 实现 Tool Activity 基础模型**

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
    kind: ToolActivityKind
    tool_name: str
    tool_call_id: str | None = None
    thread_id: str | None = None
    run_id: str | None = None
    task_id: str | None = None
    subtask_id: str | None = None
    group_id: str | None = None
    activity_label: str = ""
    summary_label: str = ""
    detail: dict[str, Any] = field(default_factory=dict)
    visibility: ToolActivityVisibility = "full"
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_profiles.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_models.py backend/tests/test_tool_activity_profiles.py
git commit -m "feat(tool-activity): add base tool activity models"
```

### Task 2: 扩展 Tool Catalog，加入 Activity Profile

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_profiles.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_profiles.py`

- [ ] **Step 1: 写失败测试，定义 catalog 中必须能取到 activity profile**

```python
from nion.tools.activity_profiles import get_tool_activity_profile


def test_builtin_task_tool_has_activity_profile():
    profile = get_tool_activity_profile("task")
    assert profile.activity_label == "Running subtask"
    assert profile.summary_label == "Completed subtask"


def test_builtin_tool_search_has_activity_profile():
    profile = get_tool_activity_profile("tool_search")
    assert profile.activity_label == "Searching deferred tools"
    assert profile.summary_label == "Matched deferred tools"
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_profiles.py -q`
Expected: FAIL with missing profile registry

- [ ] **Step 3: 实现 ActivityProfile 与默认注册表**

```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class ToolActivityProfile:
    activity_label: str
    summary_label: str
    result_class: str = "generic"


_BUILTIN_PROFILES = {
    "task": ToolActivityProfile("Running subtask", "Completed subtask", "subtask"),
    "tool_search": ToolActivityProfile("Searching deferred tools", "Matched deferred tools", "search"),
    "present_files": ToolActivityProfile("Preparing file preview", "Presented files", "present"),
    "view_image": ToolActivityProfile("Opening image", "Viewed image", "media"),
    "read_file": ToolActivityProfile("Reading file", "Read file", "read"),
    "write_file": ToolActivityProfile("Writing file", "Wrote file", "write"),
    "str_replace": ToolActivityProfile("Editing file", "Edited file", "edit"),
    "bash": ToolActivityProfile("Running command", "Ran command", "shell"),
    "web_search": ToolActivityProfile("Searching web", "Searched web", "search"),
    "web_fetch": ToolActivityProfile("Fetching page", "Fetched page", "fetch"),
}


def get_tool_activity_profile(tool_name: str) -> ToolActivityProfile:
    return _BUILTIN_PROFILES.get(
        tool_name,
        ToolActivityProfile("Running tool", "Completed tool", "generic"),
    )
```

- [ ] **Step 4: 扩展 ToolCatalogEntry**

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


def build_configured_tool_catalog(config) -> dict[str, ToolCatalogEntry]:
    return {
        tool.name: ToolCatalogEntry(
            name=tool.name,
            group=tool.group,
            source="app-config",
            activity_profile=get_tool_activity_profile(tool.name),
        )
        for tool in config.tools
    }
```

- [ ] **Step 5: 再跑测试，确认通过**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_profiles.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/tools/catalog.py backend/packages/harness/nion/tools/activity_profiles.py backend/tests/test_tool_activity_profiles.py
git commit -m "feat(tool-activity): add tool activity profiles"
```

---

## Phase 2: 实现 Summary Synthesizer

### Task 3: 先做规则驱动的批次摘要生成器

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_summary.py`

- [ ] **Step 1: 写失败测试，锁定摘要规则**

```python
from nion.tools.activity_summary import summarize_tool_batch


def test_reading_batch_summarizes_to_project_file_inspection():
    summary = summarize_tool_batch(["read_file", "read_file", "ls"])
    assert summary.summary_label == "Inspected project files"


def test_search_batch_summarizes_to_runtime_search():
    summary = summarize_tool_batch(["tool_search", "web_search"])
    assert summary.summary_label == "Searched runtime surfaces"


def test_task_batch_summarizes_to_subtask_tracking():
    summary = summarize_tool_batch(["task", "task"])
    assert summary.summary_label == "Delegated and tracked subtasks"
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_summary.py -q`
Expected: FAIL with missing summary function

- [ ] **Step 3: 实现规则优先的摘要生成器**

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
    if names <= {"tool_search", "web_search", "web_fetch"}:
        return ToolBatchSummary("Searched runtime surfaces", "search")
    if names <= {"task"}:
        return ToolBatchSummary("Delegated and tracked subtasks", "subtask")
    if "bash" in names:
        return ToolBatchSummary("Ran workspace commands", "shell")
    return ToolBatchSummary("Completed tool batch", "generic")
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_summary.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_summary.py backend/tests/test_tool_activity_summary.py
git commit -m "feat(tool-activity): add rule-based tool batch summary"
```

---

## Phase 3: 在线程流中注入 Tool Activity

### Task 4: 扩展 StreamEvent，增加 tool activity summary 事件

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_events.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_client_tool_activity_stream.py`

- [ ] **Step 1: 写失败测试，定义 stream 输出中包含 tool activity summary 事件**

```python
from nion.client import StreamEvent


def test_stream_event_accepts_tool_activity_summary():
    event = StreamEvent(
        type="tool_activity_summary",
        data={
            "summary_label": "Inspected project files",
            "group_id": "group-1",
            "tool_names": ["read_file", "ls"],
        },
    )
    assert event.type == "tool_activity_summary"
    assert event.data["summary_label"] == "Inspected project files"
```

- [ ] **Step 2: 运行测试，确认失败或无覆盖**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_client_tool_activity_stream.py -q`
Expected: FAIL or missing behavior assertions

- [ ] **Step 3: 在 client 流中插入 tool activity summary 生成逻辑**

```python
# pseudo-implementation sketch inside NionClient.stream processing loop
tool_batch: list[dict[str, Any]] = []

for chunk in stream:
    if event.type == "messages-tuple":
        # collect tool call / tool result pairs
        ...
    if batch_completed:
        summary = summarize_tool_batch(collected_tool_names)
        yield StreamEvent(
            type="tool_activity_summary",
            data={
                "summary_label": summary.summary_label,
                "result_class": summary.result_class,
                "group_id": group_id,
                "tool_names": collected_tool_names,
                "thread_id": thread_id,
            },
        )
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_client_tool_activity_stream.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/client.py backend/packages/harness/nion/tools/activity_events.py backend/tests/test_client_tool_activity_stream.py
git commit -m "feat(tool-activity): stream tool activity summary events"
```

---

## Phase 4: 与 telemetry / diagnostics / tasks 打通

### Task 5: 扩展 DiagnosticSnapshot 和 task details

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/telemetry/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/task_tool.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/routers/diagnostics.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_activity_summary.py`

- [ ] **Step 1: 写失败测试，要求 task diagnostics 返回最近 tool summary**

```python
def test_task_snapshot_can_store_latest_tool_summary():
    details = {"latest_tool_summary": "Delegated and tracked subtasks"}
    assert details["latest_tool_summary"] == "Delegated and tracked subtasks"
```

- [ ] **Step 2: 运行测试，确认缺少结构定义**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_summary.py -q`
Expected: FAIL after adding stronger assertions

- [ ] **Step 3: 在 telemetry snapshot details 中纳入最新 tool summary**

```python
@dataclass(slots=True)
class DiagnosticSnapshot:
    ...
    details: dict[str, Any] = field(default_factory=dict)
    # details now may include:
    # latest_tool_summary
    # latest_tool_activity
    # latest_tool_group_id
```

- [ ] **Step 4: 在 task_tool 生命周期事件里写入最近工具摘要**

```python
details["latest_tool_summary"] = summary_label
details["latest_tool_activity"] = activity_label
```

- [ ] **Step 5: diagnostics router 透传这些字段**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_summary.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/telemetry/models.py backend/packages/harness/nion/tools/builtins/task_tool.py backend/app/daemon/routers/diagnostics.py backend/tests/test_tool_activity_summary.py
git commit -m "feat(tool-activity): expose latest tool summary in diagnostics"
```

---

## Phase 5: 前端新增 Tool Activity Summary 消息层

### Task 6: 定义前端 tool activity types 和消息分组规则

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/tool-activity/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/tool-activity-groups.test.ts`

- [ ] **Step 1: 写失败测试，要求消息分组识别 `tool_activity_summary`**

```ts
import { groupMessages } from "@/core/messages/utils";

test("groups tool activity summary as standalone assistant group", () => {
  const result = groupMessages(
    [
      { type: "human", id: "u1", content: "hi" } as any,
      {
        type: "tool_activity_summary",
        id: "tas1",
        content: "Inspected project files",
      } as any,
    ],
    (group) => group.type,
  );

  expect(result).toContain("assistant:tool-activity-summary");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-groups.test.ts`
Expected: FAIL with unrecognized message type

- [ ] **Step 3: 扩展前端消息类型与分组**

```ts
interface AssistantToolActivitySummaryGroup
  extends GenericMessageGroup<"assistant:tool-activity-summary"> {}

// add to MessageGroup union and grouping logic
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-groups.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/tool-activity/types.ts frontend/src/core/messages/utils.ts frontend/src/core/messages/tool-activity-groups.test.ts
git commit -m "feat(tool-activity): add frontend tool activity message types"
```

### Task 7: 新增 Tool Activity Summary 卡片并接入聊天流

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-summary-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-group.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/ai-elements/queue.tsx`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-summary-card.test.tsx`

- [ ] **Step 1: 写失败测试，要求卡片显示 summary label 和 tool count**

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

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-summary-card.test.tsx`
Expected: FAIL with missing component

- [ ] **Step 3: 实现卡片组件并接入 message-group**

```tsx
export function ToolActivitySummaryCard({
  summaryLabel,
  toolNames,
}: {
  summaryLabel: string;
  toolNames: string[];
}) {
  return (
    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
      <div className="font-medium">{summaryLabel}</div>
      <div className="text-muted-foreground text-xs">
        {toolNames.length} tool calls
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test -- tool-activity-summary-card.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/messages/tool-activity-summary-card.tsx frontend/src/components/workspace/messages/message-group.tsx frontend/src/components/ai-elements/queue.tsx frontend/src/components/workspace/messages/tool-activity-summary-card.test.tsx
git commit -m "feat(tool-activity): render tool activity summary cards"
```

---

## Phase 6: 任务面 / diagnostics 面统一消费

### Task 8: 在 chat-thread-page / agent-chat-page / diagnostics 页面接入统一摘要

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/agents/agent-chat-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/tool-activity-timeline.tsx`

- [ ] **Step 1: 写失败测试或交互快照，要求子任务区域显示 latest tool summary**

```tsx
// pseudo expectation:
// when thread diagnostics include latest_tool_summary,
// render it near subtasks / queue / diagnostics area
```

- [ ] **Step 2: 运行相关前端测试或手动快照验证，确认缺失**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test`
Expected: currently no tool activity timeline rendering

- [ ] **Step 3: 接入统一展示**

```tsx
<ToolActivityTimeline
  items={thread.toolActivitySummaries ?? []}
  latestSummary={diagnostics?.details?.latest_tool_summary}
/>
```

- [ ] **Step 4: 再跑测试 / 手动验证**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/workspace/chats/chat-thread-page.tsx frontend/src/app/workspace/agents/agent-chat-page.tsx frontend/src/components/workspace/messages/tool-activity-timeline.tsx
git commit -m "feat(tool-activity): unify task and chat summary surfaces"
```

---

## Phase 7: 模型兜底摘要（可选，但属于一步到位方案的一部分）

### Task 9: 在规则无法覆盖时引入小模型摘要兜底

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary.py`
- Possibly create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/activity_summary_llm.py`

- [ ] **Step 1: 写失败测试，要求未知混合批次走 fallback label**

```python
from nion.tools.activity_summary import summarize_tool_batch


def test_mixed_batch_has_non_empty_summary():
    summary = summarize_tool_batch(["read_file", "bash", "task"])
    assert summary.summary_label
```

- [ ] **Step 2: 运行测试，确认当前只有 generic fallback**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_summary.py -q`
Expected: PASS but too-generic summary, improve next

- [ ] **Step 3: 加入 rule-first / model-fallback 结构**

```python
def summarize_tool_batch(tool_names: list[str], *, allow_model_fallback: bool = False):
    rule = _match_rule(tool_names)
    if rule is not None:
        return rule
    if allow_model_fallback:
        return summarize_with_small_model(tool_names)
    return ToolBatchSummary("Completed tool batch", "generic")
```

- [ ] **Step 4: 运行测试，确认行为稳定**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_tool_activity_summary.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/activity_summary.py
git commit -m "feat(tool-activity): add model fallback for mixed tool batches"
```

---

## 最终验收清单

- [ ] 后端存在统一 `ToolActivityEvent` 数据模型
- [ ] tool catalog 带 `activity_profile`
- [ ] tool batch summary 支持规则驱动摘要
- [ ] 线程流能输出 `tool_activity_summary` 事件
- [ ] diagnostics / task snapshot 能读取最近 tool summary
- [ ] 前端消息层支持 `assistant:tool-activity-summary`
- [ ] 聊天流、子任务区、diagnostics 区共用同一套摘要语义
- [ ] 原始 tool message 仍保留，不被摘要替代

---

## 实施顺序说明

这个计划故意没有先写代码，而是先把协议层立住。原因是：

1. 这是一个横跨 backend runtime、thread stream、telemetry、frontend rendering 的中间层
2. 如果不先统一协议，后面一定会变成“后端发一点、前端猜一点、diagnostics 再拼一点”的补丁系统
3. 一步到位的价值就在于统一，而不是先做个 `generateToolUseSummary()` 就收工

---

## 当前建议

执行时按下面顺序推进：

1. **协议模型**
2. **profile registry**
3. **rule-based summary**
4. **stream event 注入**
5. **task/diagnostics 对齐**
6. **前端消息卡片**
7. **多 surface 消费**
8. **模型兜底**
