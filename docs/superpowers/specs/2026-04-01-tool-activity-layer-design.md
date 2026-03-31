# Tool Activity Layer Design

## 背景

Nion 当前已经具备：

- tool call / tool result 基础链路
- task / subtask 概念
- diagnostics / telemetry 快照
- 前端消息分组与子任务面板

但这些能力仍停留在“原始工具事件”的层级。对于用户来说，系统输出仍然过于接近日志，而不是活动。

当前问题不是某个工具缺少一句摘要，而是系统缺少一个统一的活动语义层：

- 工具调用仍然是日志而不是活动
- 子任务状态和工具状态是割裂的
- 聊天流、任务流、diagnostics 流不是同一套语义
- 前端只能靠 `tool` / `ai` / `additional_kwargs` 做分组猜测
- 新能力很容易通过 details/kwargs/message hack 挂载，形成补丁式演进

如果继续沿着兼容增强的方向做 `tool_use_summary`，短期能看到效果，但长期一定会把系统拖进三套并行真相：

1. 聊天流中的 summary
2. task diagnostics 中的 summary
3. 前端局部 UI 自己推导的 summary

这不是产品级升级，而是债务制造。

## 目标

把 Tool Activity 提升为 Nion runtime 中的一等领域模型，使它成为：

- 聊天流中的高层活动表达
- task/subtask 的最新状态表达
- diagnostics 的时间线表达
- frontend 的独立消息与组件体系

而不是某种兼容性增强字段。

## 非目标

- 不在第一版里改变工具本身执行语义
- 不在第一版里重写 LangGraph agent loop
- 不要求所有 surface 同时做 rich rendering
- 不在第一版里依赖 LLM 总结作为主路径

## 总体设计

Tool Activity Layer 是一个新的原生中层：

```text
Tool execution / subtask execution
        ↓
Tool Activity Event (原生领域事件)
        ↓
Tool Activity Projection
  ├─ Thread stream projection
  ├─ Thread state projection
  ├─ Task diagnostics projection
  └─ Telemetry timeline projection
        ↓
Frontend consumption
  ├─ chat summaries
  ├─ task/subtask latest activity
  └─ diagnostics timeline
```

关键原则：

**Tool Activity 的 source of truth 在 runtime 事件层。**

不是：

- 前端从消息里猜
- diagnostics 自己拼 details
- task tool 自己单独维护文案

而是：

- 工具执行和子任务执行先产生活动事件
- 线程、任务、诊断、前端都从这些事件做 projection

## 原生领域模型

### 1. ToolActivityEvent

这是最小原子事件。

建议字段：

```python
class ToolActivityKind(StrEnum):
    TOOL_STARTED = "tool_started"
    TOOL_PROGRESS = "tool_progress"
    TOOL_COMPLETED = "tool_completed"
    TOOL_FAILED = "tool_failed"
    TOOL_BATCH_SUMMARY = "tool_batch_summary"


@dataclass(slots=True)
class ToolActivityEvent:
    event_id: str
    kind: ToolActivityKind
    tool_name: str
    tool_call_id: str | None
    thread_id: str | None
    run_id: str | None
    task_id: str | None
    subtask_id: str | None
    group_id: str | None
    timestamp: str
    activity_label: str
    summary_label: str
    result_class: str
    detail: dict[str, Any]
    visibility: Literal["full", "compact", "diagnostic_only"]
```

说明：

- `activity_label`：进行时，例如 `Reading file`
- `summary_label`：完成态，例如 `Read file`
- `group_id`：同一批工具调用的归属
- `task_id/subtask_id`：让它天然服务任务面
- `visibility`：控制哪些 surface 应显示

### 2. ToolActivityProfile

这是工具级默认语义配置。

```python
@dataclass(slots=True)
class ToolActivityProfile:
    activity_label: str
    summary_label: str
    result_class: str
    visibility: Literal["full", "compact", "diagnostic_only"] = "full"
```

例子：

- `task`
  - `Running subtask`
  - `Completed subtask`
  - `subtask`
- `tool_search`
  - `Searching deferred tools`
  - `Matched deferred tools`
  - `search`
- `present_files`
  - `Preparing file preview`
  - `Presented files`
  - `present`

### 3. ToolActivityBatch

Claude Code 的关键思想之一是：
一个 assistant turn 里的一批工具调用，是天然的摘要单位。

Nion 也应该明确建模这一层：

```python
@dataclass(slots=True)
class ToolActivityBatch:
    group_id: str
    thread_id: str
    run_id: str | None
    task_id: str | None
    subtask_id: str | None
    tool_names: list[str]
    events: list[ToolActivityEvent]
    summary: ToolActivityEvent | None
```

## Source of Truth

必须明确：

**Tool Activity 的 source of truth 不是 thread values，也不是 diagnostics details，而是 runtime event log。**

推荐落点：

- 首选：在 harness runtime 内部维护独立 Tool Activity timeline
- 投影到：
  - thread stream
  - thread persisted values
  - task diagnostics
  - telemetry snapshots

### 为什么不能把它只放到 thread values？

因为 thread values 是面向“当前状态”的，不适合承载完整活动时间线。

### 为什么不能把它只放到 diagnostics？

因为 diagnostics 是消费侧，不是领域事件源。

### 为什么不能只靠前端从 tool message 推导？

因为：

- 前端拿不到完整批次语义
- 子任务与 task_id 关联不稳定
- 会出现多份真相

## 批次摘要生成策略

### 总原则

Nion 应该采用：

**规则优先，模型兜底**

而不是把 Claude Code 的小模型总结直接当主路径。

原因：

- Nion 已经有 task/subtask 结构
- 工具类型相对可枚举
- 规则式 summary 更稳定、更便宜、更一致

### 规则层

如果一批工具满足某些已知模式，则生成确定性摘要：

- `read_file + ls (+ read_file...)`
  - `Inspected project files`
- `tool_search + web_search + web_fetch`
  - `Searched runtime surfaces`
- `task + task + task`
  - `Delegated and tracked subtasks`
- `bash`
  - `Ran workspace commands`

### 模型层

当规则无法概括混合批次时，再让小模型兜底生成一句 summary。

但模型输出不是原始事实源，只是 `ToolActivityBatch.summary` 的一种生产方式。

## Stream Contract

这是原生支持的关键点。

### 当前问题

当前线程流主要依赖：

- `values`
- `messages-tuple`

而前端 `useThreadStream()` 也主要假设这些事件。

如果 Tool Activity 仍然只通过：

- 混入 `tool` message
- 或者 `additional_kwargs`
- 或者 `details.latest_tool_summary`

那就是补丁。

### 目标

原生支持两种表达：

1. **Tool Activity Stream Event**
2. **Tool Activity Message**

建议增加独立流事件：

```json
{
  "type": "tool-activity",
  "data": {
    "kind": "tool_batch_summary",
    "summary_label": "Inspected project files",
    "group_id": "group-123",
    "tool_names": ["read_file", "ls", "read_file"]
  }
}
```

同时在线程 state 中落地为独立消息对象：

```json
{
  "type": "tool_activity_summary",
  "id": "tas-123",
  "content": "Inspected project files",
  "additional_kwargs": {
    "group_id": "group-123",
    "tool_names": ["read_file", "ls", "read_file"],
    "result_class": "read"
  }
}
```

### 为什么双层都要有？

- `tool-activity` 流事件服务实时体验
- `tool_activity_summary` 消息服务持久化与恢复

这和 Claude Code 的 `tool_use_summary` 思路类似，但 Nion 要做得更完整。

## Thread State 设计

### 当前问题

`AgentThreadState` 目前有：

- `messages`
- `artifacts`
- `todos`
- 其他上下文字段

没有一等活动层。

### 目标

把 Tool Activity 原生加入线程状态：

```ts
interface AgentThreadState {
  ...
  tool_activity_timeline?: ToolActivitySummaryMessage[]
  latest_tool_activity?: {
    summary_label: string
    group_id: string
    result_class: string
  }
}
```

注意：

- `messages` 仍保留活动消息，便于聊天流回放
- `tool_activity_timeline` 提供更适合 task/diagnostics 的结构化视图

## Task / Subtask / Diagnostics 统一投影

这是 Nion 超过 Claude Code 的地方。

Claude Code 的 `tool_use_summary` 更偏 transcript 视角。
Nion 不应该止步于 transcript。

### 目标

每个 task / subtask 都能消费 Tool Activity：

- `latest_tool_activity`
- `latest_tool_summary`
- `activity_timeline`

### task diagnostics

不要只在 `details` 里临时补一条字符串。

应该明确支持：

```python
details = {
    ...
    "latest_tool_summary": "Delegated and tracked subtasks",
    "latest_tool_activity": "Running subtask",
    "tool_activity_timeline": [...],
}
```

diagnostics router 只是透传，不是构造者。

## Frontend 设计

### 当前问题

前端现在围绕：

- `human`
- `ai`
- `tool`
- clarification / permission / subagent

去分组。

这意味着 Tool Activity 如果只是附着在 `tool` 上，会和现有 tool-call 卡片竞争。

### 目标

新增原生 group 类型：

- `assistant:tool-activity-summary`

并新增原生组件：

- `ToolActivitySummaryCard`
- `ToolActivityTimeline`

### 展示策略

#### 聊天流

- 批次完成时显示一张摘要卡片
- 不覆盖原始 tool message
- 默认低视觉优先级

#### 子任务区

- 展示最近活动
- 展示最近摘要

#### diagnostics 区

- 展示 timeline

### 为什么不是复用现有 tool-call 卡片？

因为 tool-call 卡片表达的是“工具执行过程”，
Tool Activity Summary 表达的是“阶段完成结果”。

这两个层级不同。

## 为什么不能走兼容/补丁路线

### 反例 1：把 summary 塞进 `tool` message

问题：

- 会污染现有分组逻辑
- 让前端难以区分“真实 tool result”和“高层摘要”

### 反例 2：只在 diagnostics 里新增 `latest_tool_summary`

问题：

- diagnostics 成了 source of truth
- 聊天流和任务流没法统一

### 反例 3：前端自己从 `tool` message 猜 summary

问题：

- 不稳定
- 和 task/subtask 无法天然绑定
- 长期不可维护

所以必须选择原生升级路线：

- 原生领域模型
- 原生流事件
- 原生线程状态
- 原生前端消息/组件

## 对现有架构和链路的影响

### 后端架构

影响中等，但可控。

不会推翻：

- agent runtime
- sandbox
- tool execution
- memory

会升级：

- tool catalog
- stream event
- telemetry projection
- task diagnostics projection

### 聊天链路

影响高，但这是主要风险也是主要收益来源。

必须保证：

- 先支持前端解析，再发新事件
- `values` 和 `messages-tuple` 最终一致
- 原始 `tool` 语义不变

### 交互体验

收益很高，但必须克制：

- summary 默认紧凑
- 批次级优先，单工具不强制摘要
- 不和 reasoning/tool-call 卡片重复抢焦点

## 方案选择

### 方案 A：兼容式增强

做法：

- 在现有 `tool` message 和 diagnostics details 上增量加字段

优点：

- 快

缺点：

- 长期必然演化成补丁堆
- 聊天流 / 任务流 / 诊断流三套真相

### 方案 B：原生产品级升级

做法：

- 建立 Tool Activity 领域模型
- 增加原生 stream contract
- 增加原生 thread state
- 增加原生 frontend message/render 层

优点：

- 结构正确
- 一次升级后长期稳定
- 便于后续接更多工具和 specialist agents

缺点：

- 一次性投入更大

### 结论

选择 **方案 B**。

如果做，就做原生产品级升级，不做兼容式增强。

## 实施边界

第一阶段只覆盖：

- workspace
- agent page
- diagnostics / task

先不在这些 surface 做 rich rendering：

- channel
- automation
- bridge/mobile

这些 surface 先只保持协议兼容，不强行首版接 UI。

## 验收标准

1. Tool Activity 成为 runtime 的一等领域对象
2. 聊天流、任务流、diagnostics 流共用同一套活动语义
3. 原始 tool message 仍可追溯
4. 前端不再从 tool message 猜 summary
5. 新工具加入时，只需补 activity profile，不需要到处 patch

## 当前决策

Tool Activity Layer 应作为：

**Nion 的原生产品能力升级**

而不是 Claude Code `tool_use_summary` 的兼容性模仿。

## 开工前拍板的三条架构约束

### 决策 1：唯一真相

**拍板：`ToolActivityEvent log` 是唯一真相。**

含义：

- runtime 内部的 Tool Activity 事件流是 source of truth
- thread state、chat message、task diagnostics、telemetry snapshot 都只能是 projection
- 不允许任何消费侧把自己的派生结果反写回去作为新的主数据源

直接约束：

- `tool_activity_timeline` 不是主存储，只是投影
- `details.latest_tool_summary` 不是主存储，只是投影
- 前端不维护独立 summary 状态源

### 决策 2：聊天主通道

**拍板：采用 `tool-activity stream event -> tool_activity_summary message` 的固定投影链。**

含义：

- runtime 先产出原生 `tool-activity` 事件
- thread/message 层再把其中可见部分投影为 `tool_activity_summary` 消息
- 前端首版消费 `tool_activity_summary` message，而不是直接消费底层 event

直接约束：

- 不允许只发 message、没有 event
- 不允许前端根据底层 event 自己拼 message
- 不允许把 Tool Activity 直接伪装成 `tool` / `ai` message

### 决策 3：Task Lineage

**拍板：`thread_id` 必填，`task_id/subtask_id` 可选，且只能显式传播，不能推断。**

含义：

- 所有 Tool Activity 至少属于一个线程
- 只有当 runtime 在执行上下文中明确拿到了 task/subtask lineage，才挂 `task_id/subtask_id`
- diagnostics、前端、聚合逻辑都不允许反推“这个活动应该属于哪个 task”

直接约束：

- thread-scoped activity 合法存在
- task-scoped / subtask-scoped activity 只在 runtime 明确知道归属时出现
- 不允许通过最近一次 `task` tool call、最近一次 AI message 等启发式方式猜 lineage
