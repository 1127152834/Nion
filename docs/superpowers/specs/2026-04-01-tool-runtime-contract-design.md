# Tool Runtime Contract Design

## 背景

Nion 当前已经具备一套可工作的工具调用能力，但这套能力仍然更多是“LangGraph middleware + tool 集合 + 若干特殊处理”的组合，而不是一套统一的 Tool Runtime Contract。

现有落点主要包括：

- `backend/packages/harness/nion/tools/tools.py`
  - 负责工具装配
- `backend/packages/harness/nion/tools/catalog.py`
  - 目前只承载基础 catalog 元数据
- `backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
  - 负责基础运行时中间件拼装与错误兜底
- `backend/packages/harness/nion/guardrails/middleware.py`
  - 负责权限判定与审批请求
- `backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py`
  - 负责 deferred tool schema 过滤
- `backend/packages/harness/nion/tools/builtins/tool_search.py`
  - 负责 deferred tool discoverability

这些模块单看都合理，但合起来仍然存在几个结构性问题：

- 工具执行阶段没有统一显式建模
- 工具元数据不足，无法稳定驱动 policy / activity / rendering / summary
- 权限、失败、拒绝、discoverability 分散在多个点上
- 还没有 hook event plane 的正式挂载位置
- 将来 SkillTool、plugin frontmatter、MCP instructions、tool activity 都会继续往这些模块上补丁式叠加

如果不先把 Tool Runtime Contract 收口：

- 每新增一种工具治理语义，就会多一个 middleware 或特殊 case
- 前端、diagnostics、thread stream、task stream 会继续各自推导“工具状态”
- LangGraph 的 middleware / ToolNode / interrupt / streaming 能力无法被系统性利用

因此，在继续做 Hook Event Plane、SkillTool、Tool Activity Layer 之前，必须先把 Tool Runtime Contract 设计清楚。

## 目标

把 Nion 的工具体系从“工具列表 + middleware 串联”升级成一套统一、可治理、可扩展、可观测的 Tool Runtime Contract。

这套 contract 要服务：

- 通用办公任务
- 文档 / 知识 / 自动化 / 配置 /审批流
- 代码相关任务
- agent / subagent / future specialist agent
- future hooks / SkillTool / plugin / MCP / activity layer

## 非目标

这份设计不处理下面这些内容：

- Prompt Runtime 细节
- Hook Event Plane 的完整事件清单
- SkillTool 的执行协议
- Tool Activity Layer 的前端呈现协议
- MCP transport/auth/cache 细节

这份设计只定义工具运行时 contract 本身，以及为后续模块预留的挂点。

## 设计原则

### 1. 优先利用 LangGraph 现成能力

这套设计不能在 LangGraph 之上平行重造一套 orchestrator。

默认优先使用：

- middleware
- ToolNode / ToolCallRequest
- `Command`
- interrupt / resume
- stream events

Nion 需要补的是产品级 contract，不是框架重复实现。

### 2. 工具执行必须有显式阶段

后续所有能力都依赖“工具现在处于哪一个阶段”。

至少要有：

- input normalization
- schema validation
- policy / permission
- pre hooks
- execution
- post hooks
- failure hooks
- result normalization

### 3. 工具元数据必须是一等模型

不能只靠 tool name + description 做一切判断。

至少应显式建模：

- group
- source
- policy traits
- visibility
- activity profile
- execution traits

### 4. 拒绝、失败、审批请求必须统一语义

这些状态不能继续各自散落在 guardrail、ToolMessage、frontend 猜测里。

### 5. deferred tools 不是特例，而是 contract 的一种能力

tool_search / deferred registry 已经证明方向是对的，应该纳入 contract，而不是继续作为独立小系统存在。

## 当前问题清单

### 问题 1：缺少统一执行阶段模型

目前工具执行大致经历了这些事情：

- tools.py 负责装配
- middleware builder 负责包 middleware
- GuardrailMiddleware 负责权限
- ToolErrorHandlingMiddleware 负责异常兜底
- DeferredToolFilterMiddleware 负责模型绑定侧的 schema 过滤

但系统里没有一个正式的 `ToolExecutionStage` 去说明：

- 现在执行到哪一步
- 哪一步可以挂 hook
- 哪一步会产生什么标准结果

### 问题 2：ToolCatalogEntry 过轻

当前 `ToolCatalogEntry` 只有：

- `name`
- `group`
- `source`
- `policy_managed`
- `activity_profile`

这远不足以支撑未来的 contract。

还缺：

- read-only / destructive / approval-required 等 traits
- discoverability traits
- render / summary traits
- future hook / extension compatibility 元数据

### 问题 3：权限语义仍偏离散

`GuardrailMiddleware` 已经很有价值，但它目前仍然是“一个强中间件”，而不是统一 contract 中的一个阶段。

这导致：

- permission request 的语义主要依赖 ToolMessage 约定
- denied / approval_required / evaluator_error 缺少统一 contract 输出
- future hook 参与 permission 时，边界不清楚

### 问题 4：错误处理缺少更高层结果语义

`ToolErrorHandlingMiddleware` 现在会把异常转成 error ToolMessage，这比崩掉要好，但仍然缺少：

- standardized failure result
- failure stage metadata
- failure class
- future activity layer 的统一信号

### 问题 5：deferred tools 还没有正式并入 contract

`tool_search` + `DeferredToolFilterMiddleware` 已经体现出：

- schema visibility
- runtime discoverability
- execution routing

但它们还没有被看成 Tool Runtime Contract 的一等能力。

## 目标架构

Tool Runtime Contract 应拆成五层：

```text
Tool Definitions
  ├─ app-config tools
  ├─ built-in tools
  ├─ ACP-backed tools
  ├─ MCP tools
  └─ deferred tools
        ↓
Tool Catalog
        ↓
Tool Runtime Policy Layer
  ├─ validation
  ├─ permission
  ├─ hooks
  ├─ error semantics
  └─ visibility / discoverability
        ↓
Tool Execution Pipeline
        ↓
Tool Result Artifact
```

## 核心模型

### 1. ToolExecutionTraits

```python
@dataclass(slots=True)
class ToolExecutionTraits:
    read_only: bool = False
    destructive: bool = False
    approval_required: bool = False
    discoverable_only: bool = False
    supports_deferred_schema: bool = False
    supports_updated_input: bool = True
```

### 2. ToolCatalogEntry 扩展

建议把现有 `ToolCatalogEntry` 升级为：

```python
@dataclass(slots=True)
class ToolCatalogEntry:
    name: str
    group: str
    source: str
    policy_managed: bool = True
    activity_profile: ToolActivityProfile | None = None
    execution_traits: ToolExecutionTraits | None = None
    visibility: Literal["active", "deferred", "hidden"] = "active"
```

### 3. ToolExecutionStage

```python
class ToolExecutionStage(StrEnum):
    NORMALIZE_INPUT = "normalize_input"
    VALIDATE_INPUT = "validate_input"
    CHECK_POLICY = "check_policy"
    PRE_HOOKS = "pre_hooks"
    REQUEST_PERMISSION = "request_permission"
    EXECUTE = "execute"
    POST_HOOKS = "post_hooks"
    FAILURE_HOOKS = "failure_hooks"
    NORMALIZE_RESULT = "normalize_result"
```

### 4. ToolRuntimeResult

不能只依赖 ToolMessage。应增加一个内部运行时结果模型：

```python
@dataclass(slots=True)
class ToolRuntimeResult:
    stage: ToolExecutionStage
    status: Literal["success", "denied", "approval_required", "failed", "blocked"]
    tool_name: str
    tool_call_id: str | None
    message: str | None = None
    payload: dict[str, Any] | None = None
```

说明：

- 这不是直接暴露给模型的对象
- 而是 runtime 内部标准化结果
- 后续可以投影到：
  - ToolMessage
  - activity layer
  - diagnostics
  - telemetry

## 执行链设计

### 阶段 1：Normalize Input

作用：

- 统一补齐隐式字段
- 做 runtime context 注入前的浅层整形

这一步应该是 framework-safe 的轻量处理，不做业务策略。

### 阶段 2：Validate Input

作用：

- 执行 schema parse
- 执行 tool-specific input normalization/validation

输出：

- 标准化后的 tool input
- 或 validation failure result

### 阶段 3：Check Policy

作用：

- 基于 catalog traits / surface policy / tool policy 做第一层判定

包括：

- group allow/deny
- tool allow/deny
- discoverable_only 判定
- hidden / deferred visibility 判定

### 阶段 4：Pre Hooks

作用：

- 允许 future hook system 改写输入
- 允许 future hook system 提前给出 allow/deny/ask 语义

注意：

- 这里先定义挂点，不在本设计里实现完整 Hook Event Plane

### 阶段 5：Request Permission

作用：

- 统一处理 approval-required 工具
- 统一处理 guardrail provider 的 allow / deny / approval_required

这里应把当前 `GuardrailMiddleware` 的价值收编进 contract。

### 阶段 6：Execute

作用：

- 真正执行工具
- 保持 LangGraph ToolNode + BaseTool 执行模型不变

### 阶段 7：Post Hooks

作用：

- 对成功结果进行附加上下文、结果重写、future MCP output rewrite

### 阶段 8：Failure Hooks

作用：

- 对失败进行标准化后处理

### 阶段 9：Normalize Result

作用：

- 把成功 / denied / approval_required / failed 统一归一为 runtime result

## 与 LangGraph 的映射

### 1. middleware 仍然保留

这份设计不否定 middleware。

相反，建议把 contract 落在 middleware 分层上：

- ToolRuntimeMiddlewareBuilder
- Policy / Permission Middleware
- Error Handling Middleware
- Deferred Visibility Middleware

### 2. ToolNode / ToolCallRequest 仍是入口

不建议重写工具执行入口。

建议做法：

- 仍由 LangGraph / LangChain 的工具调用链触发
- Nion 在 middleware 和 catalog 层统一语义

### 3. `Command` 仍是高优先级控制手段

例如：

- approval request
- interrupt-like behavior
- early stop

不需要重造平行控制流。

## 与现有模块的映射

### `tools.py`

处理方式：

- 继续负责 tool pool assembly
- 但产物从“list[BaseTool]”升级为“tool pool + catalog context”

### `catalog.py`

处理方式：

- 升级为正式 catalog 元数据层
- 承担 activity / traits / visibility / discoverability 元数据

### `GuardrailMiddleware`

处理方式：

- 继续保留
- 但角色从“单独的大中间件”升级为 Tool Runtime Contract 中的 permission stage adapter

### `ToolErrorHandlingMiddleware`

处理方式：

- 继续保留
- 但输出应对齐 ToolRuntimeResult 的 failure semantics

### `DeferredToolFilterMiddleware`

处理方式：

- 继续保留
- 但要被明确定义为 visibility / discoverability stage 的一部分

### `tool_search.py`

处理方式：

- 不再是孤立小系统
- 被定义为 deferred discoverability contract 的标准实现

## 对未来模块的预留接口

### 对 Hook Event Plane

Tool Runtime Contract 应为后续 hook 定义：

- pre hook 挂点
- post hook 挂点
- failure hook 挂点
- permission-related hook 决策接口

### 对 SkillTool

SkillTool 本身也将是 tool，因此必须天然复用这套 contract。

### 对 Tool Activity Layer

Tool RuntimeResult 应能直接投影为 tool activity event。

### 对 MCP Behavior Plane

MCP tools 应该被视作普通工具的一种 source，而不是另起专线。

## 测试方案

### 1. Catalog 单元测试

覆盖点：

- 扩展后的 `ToolCatalogEntry` 默认值正确
- execution traits / visibility / activity profile 可正确装配

建议文件：

- `backend/tests/test_tool_catalog_contract.py`

### 2. Runtime pipeline 单元测试

覆盖点：

- validation failure 能生成标准 failure result
- approval_required 能生成标准 approval_required result
- denied 能生成标准 denied result
- success 能生成标准 success result

建议文件：

- `backend/tests/test_tool_runtime_pipeline.py`

### 3. Guardrail 兼容性测试

覆盖点：

- 现有 GuardrailMiddleware 行为在 contract 收编后不回退
- thread permission request 语义保持兼容

建议文件：

- `backend/tests/test_tool_runtime_permission_contract.py`

### 4. Deferred discoverability 测试

覆盖点：

- deferred tools 不进入 bind_tools
- tool_search 能发现 deferred tools
- active/deferred visibility 行为一致

建议文件：

- `backend/tests/test_tool_runtime_deferred_tools.py`

### 5. LangGraph 集成测试

覆盖点：

- middleware builder 输出顺序符合 contract
- `Command` 控制流在 approval / deny / error 场景下保持稳定

建议文件：

- `backend/tests/test_tool_runtime_langgraph_integration.py`

## 验收标准

### A. 结构验收

1. 工具执行阶段被显式建模
2. ToolCatalogEntry 不再只承载 name/group/source
3. active / deferred / hidden visibility 被正式建模

### B. 运行时验收

4. success / denied / approval_required / failed / blocked 具备统一语义
5. guardrail / error handling / deferred filtering 被正式纳入 contract
6. SkillTool、MCP tools、built-in tools、ACP tools 可共用同一 contract

### C. LangGraph 兼容验收

7. 不需要绕开 LangGraph 重写工具执行入口
8. middleware、ToolNode、Command 仍然是第一层承载机制
9. 设计稿没有引入平行状态机或平行 persistence 系统

### D. 可扩展性验收

10. future hook system 有明确挂点
11. future tool activity layer 有明确投影对象
12. future plugin / SkillTool / MCP behavior plane 有明确契约位置

### E. 可测试性验收

13. catalog 可独立单测
14. runtime pipeline 可独立单测
15. permission/deferred/discoverability 可分别回归验证

## 风险与取舍

### 风险 1：设计过于抽象

处理方式：

- 每一层都映射到现有具体模块
- 不允许出现“以后再决定落在哪里”的空层

### 风险 2：LangGraph 兼容被破坏

处理方式：

- 明确规定 contract 落在 middleware / ToolNode / Command 边界上
- 不平行重造工具执行系统

### 风险 3：把 deferred tools 当成特例

处理方式：

- 明确把 deferred discoverability 纳入 contract，而不是额外外挂

## 下一步

这份设计确认后，下一份应该写：

- `Hook Event Plane Design`

因为 Tool Runtime Contract 的下一层，就是让 hook 正式接管 pre / post / failure / permission 相关挂点。
