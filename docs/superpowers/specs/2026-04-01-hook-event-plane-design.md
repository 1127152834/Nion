# Hook Event Plane Design

## 背景

Nion 当前已经具备若干与 hook 概念相近的运行时能力，但它们还分散在不同模块里：

- `GuardrailMiddleware`
  - 处理工具调用前的权限判定与审批请求
- `ToolErrorHandlingMiddleware`
  - 处理工具调用失败
- `ClarificationMiddleware`
  - 处理主动向用户发起澄清
- thread stream / task stream / diagnostics / daemon telemetry
  - 分别产出不同层面的事件与状态

这意味着，Nion 已经有“hook-like behavior”，但还没有一套正式的 Hook Event Plane。

当前的问题不是“完全没有 hook”，而是：

- 缺少统一的 hook 事件模型
- 缺少统一的 hook 输入输出协议
- 缺少统一的 REPL 内 / REPL 外执行边界
- 缺少把聊天主链路、工具链路、子代理链路、系统事件链路统一表达的能力

如果继续沿着当前结构往前做：

- `GuardrailMiddleware` 会越来越像 permission hook 系统
- `ToolErrorHandlingMiddleware` 会越来越像 failure hook 系统
- Clarification / thread stream / task telemetry 会继续各自维护自己的事件逻辑
- future SkillTool、plugin frontmatter hooks、MCP elicitation、compact/resume 都会继续补丁式挂接

因此，在 Prompt Runtime 和 Tool Runtime Contract 之后，必须正式定义 Hook Event Plane，把这些散点能力收口成统一会话事件面。

## 目标

把 Nion 的 hook 能力从“若干散落的回调逻辑”升级成一套统一、可治理、可扩展、可产品化的 Hook Event Plane。

它要服务的不是纯 code agent，而是 Nion 作为通用办公 AI agent 的全部运行时场景。

因此这套 event plane 要覆盖：

- 聊天主链路
- 工具执行链路
- 权限审批链路
- 子代理生命周期
- 长会话 compact / resume
- 系统级通知与配置变化

## 非目标

这份设计不做下面这些事情：

- 不定义 Prompt Runtime 的 section 细节
- 不定义 Tool Runtime Contract 的阶段模型
- 不直接设计 SkillTool 执行协议
- 不设计前端 hook UI
- 不设计 MCP transport/auth

这份设计只定义 hook event plane 本身，以及它与 Tool Runtime、Prompt Runtime、LangGraph 的接口边界。

## 设计原则

### 1. Hook 不是 callback 集合，而是统一事件面

Hook 不能被视作“工具前后塞两个回调”。

Claude Code 已经证明，真正值钱的是把 hooks 变成：

- lifecycle event plane
- runtime governance surface
- context injection surface

### 2. 优先利用 LangGraph 原生能力

这套设计必须优先落在 LangGraph 现成能力上：

- middleware
- `Command`
- interrupt / resume
- stream events
- thread state / checkpointing

Nion 需要补的是：

- 产品级事件语义
- hook schema
- hook registry
- hook 执行策略

而不是重做一套 graph runtime。

### 3. 必须区分 REPL 内 hook 和 REPL 外 hook

Claude Code 的一个关键启发是：

- 一部分 hook 发生在当前对话/模型执行流内部
- 一部分 hook 发生在当前对话执行流外部，只承担观察、自动化、副作用

如果不先区分这两类，后续很容易：

- 把所有 hook 都当成模型可见消息
- 或者把所有 hook 都做成后台观察器

这两种都会失真。

### 4. Hook 应优先服务通用办公场景

Nion 的 hook system 不应该围绕 code workflow 设计，而应该围绕：

- 审批
- 自动化任务
- 多线程协作
- 文档/知识流
- 通用工具治理

代码工作流只是其一。

## 当前问题清单

### 问题 1：缺少正式 HookEvent 模型

当前系统里已经存在很多隐式事件，但没有一个统一 `HookEvent` 枚举。

例如：

- clarification 触发
- permission request 创建
- permission denied
- tool error
- task started / completed
- thread stream started / finished / failed

它们本质上都是“运行时事件”，但没有被纳入同一 plane。

### 问题 2：缺少统一 HookInput / HookOutput schema

当前不同能力分别依赖：

- ToolMessage
- `additional_kwargs`
- `Command`
- thread state patch
- telemetry event

但没有统一的 hook 输入输出协议。

### 问题 3：缺少 REPL 内 / 外执行分层

Nion 当前已经天然存在两类执行模式：

- 当前 agent turn 内可以直接影响执行路径的逻辑
- thread / daemon / diagnostics / task stream 这类系统侧逻辑

但没有被正式划分。

### 问题 4：系统内已有多个“半 hook 系统”

目前至少有这些半成品：

- `GuardrailMiddleware` -> permission-like hook
- `ToolErrorHandlingMiddleware` -> failure-like hook
- `ClarificationMiddleware` -> user-prompt / interrupt-like hook
- thread / task stream -> notification / lifecycle-like hook

如果不统一收口，后面会继续形成多套并行真相。

## 目标架构

Hook Event Plane 应拆成四层：

```text
Runtime Events
  ├─ session events
  ├─ user prompt events
  ├─ tool lifecycle events
  ├─ permission events
  ├─ subagent events
  ├─ compact/resume events
  └─ system/config/file events
        ↓
Hook Event Registry
        ↓
Hook Dispatcher
  ├─ in-runtime hooks
  └─ out-of-runtime hooks
        ↓
Hook Result Projection
  ├─ model-visible updates
  ├─ Command / interrupt / resume
  ├─ telemetry / diagnostics
  └─ future activity layer
```

## 核心模型

### 1. HookEvent

建议首批定义如下：

```python
class HookEvent(StrEnum):
    SESSION_START = "session_start"
    USER_PROMPT_SUBMIT = "user_prompt_submit"
    PRE_TOOL_USE = "pre_tool_use"
    PERMISSION_REQUEST = "permission_request"
    PERMISSION_DENIED = "permission_denied"
    POST_TOOL_USE = "post_tool_use"
    POST_TOOL_USE_FAILURE = "post_tool_use_failure"
    STOP = "stop"
    STOP_FAILURE = "stop_failure"
    SESSION_END = "session_end"
    SUBAGENT_START = "subagent_start"
    SUBAGENT_STOP = "subagent_stop"
    NOTIFICATION = "notification"
    PRE_COMPACT = "pre_compact"
    POST_COMPACT = "post_compact"
    CONFIG_CHANGE = "config_change"
    CWD_CHANGED = "cwd_changed"
    FILE_CHANGED = "file_changed"
```

这是 Nion 通用 P0/P1 足够的集合。

不建议首批就纳入更 code-agent 专用的：

- teammate idle
- worktree create/remove
- task created/completed 的高度定制版本

### 2. HookExecutionMode

```python
class HookExecutionMode(StrEnum):
    IN_RUNTIME = "in_runtime"
    OUT_OF_RUNTIME = "out_of_runtime"
```

说明：

- `IN_RUNTIME`
  - 能影响当前 agent turn
  - 能生成 model-visible updates
  - 能返回 `Command` / interrupt-like 行为
- `OUT_OF_RUNTIME`
  - 不直接影响当前模型推理
  - 更偏观察、自动化、副作用、系统同步

### 3. HookInput

建议统一基础字段：

```python
@dataclass(slots=True)
class HookInput:
    event: HookEvent
    thread_id: str | None
    agent_id: str | None
    agent_kind: str | None
    surface: str | None
    timestamp: str
    payload: dict[str, Any]
```

说明：

- 每个事件的特定字段都进入 `payload`
- 保证跨事件统一，同时不阻碍扩展

### 4. HookResult

```python
@dataclass(slots=True)
class HookResult:
    event: HookEvent
    mode: HookExecutionMode
    continue_execution: bool = True
    stop_reason: str | None = None
    updated_input: dict[str, Any] | None = None
    permission_behavior: Literal["allow", "deny", "ask"] | None = None
    additional_context: str | None = None
    side_effects: dict[str, Any] | None = None
```

说明：

- 这是 Claude Code `updatedInput` / `permissionBehavior` / `preventContinuation` 的 Nion 化表达
- 不要求第一版所有事件都用到所有字段

## 事件分层

### A. 会话主链路事件

这些事件优先进入 `IN_RUNTIME`：

- `SESSION_START`
- `USER_PROMPT_SUBMIT`
- `STOP`
- `STOP_FAILURE`
- `SESSION_END`

作用：

- 初始化上下文
- 处理用户输入前后的治理
- 做一轮执行的收尾

### B. 工具生命周期事件

这些事件优先进入 `IN_RUNTIME`：

- `PRE_TOOL_USE`
- `PERMISSION_REQUEST`
- `PERMISSION_DENIED`
- `POST_TOOL_USE`
- `POST_TOOL_USE_FAILURE`

作用：

- 对接 Tool Runtime Contract
- 控制 permission / continue / context injection

### C. 子代理生命周期事件

这些事件优先进入 `IN_RUNTIME`，但也可投影到外部事件流：

- `SUBAGENT_START`
- `SUBAGENT_STOP`

### D. 系统/环境事件

这些事件优先进入 `OUT_OF_RUNTIME`：

- `NOTIFICATION`
- `PRE_COMPACT`
- `POST_COMPACT`
- `CONFIG_CHANGE`
- `CWD_CHANGED`
- `FILE_CHANGED`

作用：

- 自动化
- 审计
- 系统同步
- diagnostics

## REPL 内 / 外执行模型

### 1. In-Runtime Hooks

这些 hook 在当前 agent turn 内执行。

特点：

- 可以影响当前模型执行路径
- 可以返回 `Command`
- 可以向模型追加 context
- 可以修改 tool input
- 可以决定 allow / deny / ask

适合事件：

- `USER_PROMPT_SUBMIT`
- `PRE_TOOL_USE`
- `PERMISSION_REQUEST`
- `PERMISSION_DENIED`
- `POST_TOOL_USE`
- `POST_TOOL_USE_FAILURE`
- `STOP`
- `SUBAGENT_STOP`

### 2. Out-of-Runtime Hooks

这些 hook 不直接进入当前模型执行流。

特点：

- 更像系统事件监听器
- 更适合做：
  - 日志
  - 审计
  - 资源同步
  - 自动化副作用

适合事件：

- `SESSION_END`
- `NOTIFICATION`
- `PRE_COMPACT`
- `POST_COMPACT`
- `CONFIG_CHANGE`
- `CWD_CHANGED`
- `FILE_CHANGED`

## 与 LangGraph 的映射

### 1. middleware 是第一层承载点

首批事件最应该挂在 middleware 边界：

- `PRE_TOOL_USE`
- `PERMISSION_REQUEST`
- `PERMISSION_DENIED`
- `POST_TOOL_USE`
- `POST_TOOL_USE_FAILURE`

### 2. `Command` 是第一层控制流出口

下列行为优先通过 `Command` 表达：

- 进入审批
- 中断执行
- clarification / human-in-the-loop
- 早停

### 3. interrupt / resume 是人类介入层

Nion 当前已经在 clarification 路线上有类似语义。

后续 hook event plane 应优先考虑：

- 把需要用户决策的 event 映射到 LangGraph human-in-the-loop 机制
- 不平行重做一套 pause/resume

### 4. stream events 是外部投影层

thread stream / task stream / diagnostics 不应该各自定义自己的“伪 hook 事件”，而应该从统一 event plane 投影。

## 与现有模块的映射

### `GuardrailMiddleware`

未来角色：

- 继续保留
- 但要成为 `PRE_TOOL_USE / PERMISSION_REQUEST / PERMISSION_DENIED` 的主要适配点

### `ToolErrorHandlingMiddleware`

未来角色：

- 继续保留
- 但要成为 `POST_TOOL_USE_FAILURE` 的主要触发点之一

### `ClarificationMiddleware`

未来角色：

- 不再只是 ask_clarification 的特殊逻辑
- 应被纳入 `USER_PROMPT_SUBMIT` / `STOP` / human-in-the-loop 体系

### `task_tool` / subagent stream

未来角色：

- `SUBAGENT_START`
- `SUBAGENT_STOP`
- future richer subagent notifications

### thread stream / daemon telemetry

未来角色：

- hook 结果的外部投影层
- 不再自己定义平行事件模型

## 与 Tool Runtime Contract 的接口

Tool Runtime Contract 已经定义了：

- execution stages
- ToolRuntimeResult
- policy / permission / pre / post / failure hook 挂点

Hook Event Plane 应直接挂在这些接口上，而不是单独定义工具链。

建议关系：

- Tool Runtime 提供阶段性触发点
- Hook Event Plane 提供事件与结果模型
- Hook dispatcher 负责执行
- Tool Runtime 再消费 HookResult

## 与 Prompt Runtime 的接口

Prompt Runtime 只需要预留：

- hook-related policy reminder sections
- hook produced additional context sections

Hook Event Plane 不应反向控制 Prompt Runtime 的装配逻辑，只应通过正式 provider 接口注入。

## 与未来 SkillTool / Plugin 的接口

### SkillTool

SkillTool 应支持声明：

- 哪些 hook events 可用
- 是否带 skill-local hook

### Plugin frontmatter

plugin frontmatter 后续可声明：

- `hooks`
- `allowed-tools`
- event matcher

但第一版先只保证 Hook Event Plane 能承载这些语义。

## 测试方案

### 1. Hook event schema 单元测试

覆盖点：

- HookEvent 枚举稳定
- HookExecutionMode 合法
- HookInput / HookResult 默认值与字段完整性正确

建议文件：

- `backend/tests/test_hook_event_plane_schema.py`

### 2. In-Runtime hook dispatcher 测试

覆盖点：

- `PRE_TOOL_USE` 可修改输入
- `PERMISSION_REQUEST` 可返回 allow / deny / ask
- `STOP` 可阻止继续执行
- `additional_context` 能进入后续消费路径

建议文件：

- `backend/tests/test_hook_event_plane_in_runtime.py`

### 3. Out-of-Runtime hook dispatcher 测试

覆盖点：

- `SESSION_END` / `CONFIG_CHANGE` / `FILE_CHANGED` 能独立执行
- 不污染当前模型执行流
- side effects 能被 diagnostics / telemetry 读取

建议文件：

- `backend/tests/test_hook_event_plane_out_of_runtime.py`

### 4. LangGraph 集成测试

覆盖点：

- hooks 能通过 middleware + `Command` 与 agent loop 协作
- clarification / permission / stop 场景不会破坏 LangGraph 控制流

建议文件：

- `backend/tests/test_hook_event_plane_langgraph_integration.py`

### 5. 回归测试

覆盖点：

- 现有 Guardrail / clarification / tool error handling 行为迁移后不回退
- thread stream 与 task stream 仍能读取对应事件投影

建议文件：

- `backend/tests/test_hook_event_plane_regression.py`

## 验收标准

### A. 结构验收

1. Hook 不再是散落逻辑，而有统一 HookEvent / HookInput / HookResult 模型
2. `IN_RUNTIME` / `OUT_OF_RUNTIME` 两类执行模式明确

### B. 运行时验收

3. `PRE_TOOL_USE / PERMISSION_REQUEST / PERMISSION_DENIED / POST_TOOL_USE / POST_TOOL_USE_FAILURE` 有明确挂点
4. `SESSION_START / USER_PROMPT_SUBMIT / STOP / SESSION_END / SUBAGENT_START / SUBAGENT_STOP` 有明确事件模型
5. clarification / permission / failure 不再各自演化为平行 hook 系统

### C. LangGraph 兼容验收

6. 不平行重做 interrupt / resume
7. 不平行重做 command-based control flow
8. middleware、Command、streaming 仍是第一层承载机制

### D. 可扩展性验收

9. future plugin frontmatter hooks 有正式挂点
10. future SkillTool hooks 有正式挂点
11. future MCP elicitation / notification hooks 有明确扩展位置

### E. 可测试性验收

12. event schema 可独立单测
13. in-runtime / out-of-runtime dispatcher 可独立单测
14. LangGraph 控制流兼容可集成验证

## 风险与取舍

### 风险 1：把所有事件都做进第一版

处理方式：

- 先收口 P0/P1 事件
- 不把更 code-agent 专属的事件硬塞进第一版

### 风险 2：把 hook 做成消息系统而不是控制系统

处理方式：

- 明确保留 `updated_input`、`permission_behavior`、`continue_execution` 这类控制型字段

### 风险 3：与 Tool Runtime Contract 产生重复抽象

处理方式：

- Tool Runtime 负责阶段
- Hook Event Plane 负责事件语义和执行模式
- 不重复定义工具执行链

## 下一步

这份设计确认后，下一份应该写：

- `SkillTool Design`

因为 Hook Event Plane 确立后，下一个 execution primitive 就是 SkillTool。
