# Prompt Governance Foundation Design

## 背景

Nion 现在已经具备一批可工作的 agent runtime 能力：

- lead agent system prompt 生成
- skills / CLI / deferred tools / ACP 等 prompt 注入点
- LangGraph-based stateful execution
- middleware-based guardrail / permission / tool error handling
- subagent delegation、tool activity、thread persistence

但这些能力还没有形成 Claude Code 式的统一治理中轴。

当前最主要的问题不是“提示词内容不够强”，而是：

- prompt 仍然以单个大模板为中心，缺少统一 section registry
- static / dynamic 边界虽然已有雏形，但还没有成为正式 runtime contract
- 新能力继续倾向于以字符串拼接方式接入 prompt
- tool runtime 的治理能力存在，但仍更接近 middleware 串联，而不是统一执行契约
- 后续 notebook / memory / agent / skill / MCP / CLI 这类系统能力一旦全面暴露给 agent，会继续走散点接入路线

对 Nion 来说，这一阶段必须先建设 Claude Code 式的 Prompt Governance Foundation。

这不是为了做一个 code-first agent，而是为了给通用个人办公 AI agent 建立统一、稳定、可治理的运行时基础设施。

## 目标

本设计只覆盖 **Phase 1**，即三项基础设施：

1. Prompt section registry
2. Static / Dynamic prompt boundary
3. 统一 Tool Runtime Contract

完成后，Nion 应具备：

- section 化 prompt runtime，而不是继续维护大模板
- 稳定的 cache-stable / session-dynamic / turn-dynamic 装配边界
- 可诊断的 prompt section manifest
- 可扩展的 session-specific guidance 注入点
- 可承载后续 SkillTool / MCP behavior plane / system management tools 的统一执行契约

## 非目标

本阶段明确不做：

- 不直接实现 SkillTool
- 不直接实现 plugin marketplace 或 plugin studio 新能力
- 不直接实现 Explore / Plan / Verification specialist agents
- 不直接实现 notebook / memory / agent / automation 管理工具
- 不重做 LangGraph orchestration、interrupt/resume、checkpointer、state graph
- 不重做前端产品壳

这些能力都依赖本设计的基础设施，但不属于本阶段交付。

## 设计原则

### 1. Prompt 是 runtime，不是文本资产

prompt 不应继续被视为一段大字符串，而应被视为一个由多个 section provider 按运行时上下文装配出来的 artifact。

### 2. Static / Dynamic 边界是一等公民

必须正式区分：

- `global_static`
- `session_dynamic`
- `turn_dynamic`

否则后续 cache、compact、resume、specialist/fork 都无法稳定实现。

### 3. 先复用 LangGraph，再补 Nion contract

本阶段默认优先复用 LangGraph 的：

- state schema
- reducers
- middleware
- streaming event surfaces
- interrupt / resume
- checkpointer

Nion 只补：

- prompt governance contract
- tool runtime governance contract
- diagnostics / observability contract

### 4. 能力治理优先于能力暴露

在 notebook / memory / agent / skill / MCP / CLI 这些系统能力被全面暴露前，必须先把治理中轴建好。

### 5. 产品化优先于补丁式扩展

所有后续系统能力接入都必须有：

- 统一 section 宿主
- 统一 session guidance 入口
- 统一执行治理合同

不再允许继续在主模板或零散 middleware 上做补丁式扩展。

## Claude Code 复刻基线

基于 `cli.js.map` 研究和 Nion 内部研究结论，Claude Code 里最值得复刻的 prompt 治理能力是：

- `src/constants/prompts.ts` 的 section-driven prompt assembler
- `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 所表达的静态 / 动态边界
- session-specific guidance 的正式注入方式
- `toolExecution.ts` / `toolHooks.ts` 所形成的统一 tool runtime execution pipeline

对 Nion 来说，最应复刻的是它们作为 **operating model** 的形态，而不是具体提示词文案。

## 总体架构

### 架构总图

```text
Prompt Sources
  ├─ core static sections
  ├─ session guidance sections
  ├─ policy sections
  ├─ extension sections
  └─ agent overlay sections
        ↓
Prompt Section Registry
        ↓
Prompt Assembler
        ↓
Prompt Build Artifact
  ├─ static prefix
  ├─ dynamic suffix
  ├─ section manifest
  └─ diagnostics metadata

Tool Definition Sources
  ├─ built-in tools
  ├─ CLI-backed tools
  ├─ MCP-backed tools
  ├─ future SkillTool / system management tools
        ↓
Tool Runtime Contract
  ├─ lookup
  ├─ schema parse
  ├─ validate
  ├─ pre hook
  ├─ permission
  ├─ execute
  ├─ post hook
  ├─ failure hook
  └─ result normalization
```

### 两条主线

Phase 1 实际上只做两条主线：

1. Prompt Governance Runtime
2. Tool Runtime Contract

它们共享同一个目标：

- 为未来系统能力暴露、session guidance、hook event plane、SkillTool、tool activity layer 提供稳定宿主

## 一、Prompt Section Registry

### 1.1 目标

让所有 prompt 注入能力都有统一宿主：

- skills discoverability
- selected extensions
- MCP instructions
- policy reminders
- output style
- notebook scope
- system management capability catalog

### 1.2 核心模型

现有 `PromptSection` 保留，但扩展字段：

```python
@dataclass(slots=True)
class PromptSection:
    key: str
    title: str | None
    content: str
    scope: Literal["global_static", "session_dynamic", "turn_dynamic"]
    layer: Literal["core", "policy", "extension", "agent_overlay"]
    order: int
    enabled: bool = True
    tags: tuple[str, ...] = ()
    source: str | None = None
    priority: int = 0
    cache_group: str | None = None
```

字段约束：

- `key`：稳定、全局唯一
- `scope`：决定 static/dynamic 归属
- `layer`：决定来源层级
- `order`：决定装配顺序
- `source`：provider ID
- `priority`：冲突裁决
- `cache_group`：future cache / compact / diagnostics 分组

### 1.3 Provider 协议

新增：

```python
class PromptSectionProvider(Protocol):
    provider_id: str

    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        ...
```

### 1.4 Registry

新增：

```python
@dataclass(slots=True)
class PromptSectionRegistration:
    provider_id: str
    provider: PromptSectionProvider
    applies_to_agent_kinds: set[str] | None = None
    applies_to_surfaces: set[str] | None = None
    enabled_by_default: bool = True
    order_hint: int = 0
```

Registry 职责：

- 注册 provider
- 过滤当前 agent/surface 不适用的 provider
- 按 `order_hint` + section `order` 排序
- 去重
- 按 key/priority 做冲突裁决
- 输出 ordered section list

### 1.5 Agent Prompt Profile

新增统一 profile：

```python
@dataclass(slots=True)
class AgentPromptProfile:
    kind: Literal["lead", "custom", "builtin", "subagent", "bootstrap", "specialist"]
    enabled_section_tags: set[str] | None = None
    disabled_section_keys: set[str] | None = None
    required_providers: tuple[str, ...] = ()
    overlay_providers: tuple[str, ...] = ()
```

不同 profile 的用途：

- lead：全量治理与 orchestration guidance
- subagent：更小的 section 集 + 更严格的角色合同
- notebook-chat：note-scoped overlay
- bootstrap：setup guidance
- specialist：future Explore / Plan / Verification overlay

### 1.6 Provider 分类

首批 provider 建议分为 5 类：

#### Core Providers

- `RoleIdentityProvider`
- `ThinkingStyleProvider`
- `ClarificationPolicyProvider`
- `ResponseStyleBaselineProvider`

#### Session Providers

- `CurrentDateProvider`
- `SessionGuidanceProvider`
- `SelectedExtensionsProvider`
- `FutureSelectedWorkObjectsProvider`（先预留）

#### Extension Providers

- `SkillsDiscoverabilityProvider`
- `CliCapabilityProvider`
- `McpInstructionsProvider`
- `DeferredToolsProvider`
- `AcpProvider`

#### Policy Providers

- `PermissionBehaviorProvider`
- `ToolGovernanceReminderProvider`
- `OutputStyleOverlayProvider`
- `VerificationObligationProvider`

#### Agent Overlay Providers

- `LeadAgentOverlayProvider`
- `SubagentOverlayProvider`
- `NotebookAssistantOverlayProvider`
- `FutureSpecialistOverlayProvider`

### 1.7 为什么这一层必须先做

因为后续这些能力都必须有统一注入宿主：

- skills
- MCP
- policy
- output style
- notebook scope
- system capability catalog

否则任何一项能力接入，都会重新把主 prompt 拉回大模板模式。

## 二、Static / Dynamic Prompt Boundary

### 2.1 目标

建立 prompt runtime 的稳定装配边界：

- static prefix
- dynamic suffix

这是 prompt cache、compact、resume、diagnostics 的前置条件。

### 2.2 边界定义

#### `global_static`

适合放：

- identity / role
- thinking baseline
- clarification baseline
- generic safety baseline
- default response baseline

要求：

- 不依赖当前线程状态
- 不依赖当前连接的扩展
- 不依赖本轮用户输入

#### `session_dynamic`

适合放：

- 当前时间
- selected extensions
- skills discoverability
- CLI capability
- MCP instructions
- current notebook / project overlay
- output style
- permission mode
- current session guidance

#### `turn_dynamic`

本阶段暂不大量使用，但要先定义：

- 本轮临时提示
- 本轮 narrowed scope
- 本轮 temporary policy reminder
- 本轮 temporary work object resolution

### 2.3 Boundary 生成规则

assembler 的正式规则：

1. 从 registry 获取 enabled sections
2. 排序
3. 先拼所有 `global_static`
4. 插入 `PROMPT_DYNAMIC_BOUNDARY`
5. 再拼 `session_dynamic` 与 `turn_dynamic`

### 2.4 LangGraph 结合方式

这一层不重写 LangGraph，只在 agent 创建前构造 system prompt artifact。

LangGraph 负责：

- stateful graph execution
- checkpointer
- streaming

Nion 负责：

- runtime prompt assembly
- diagnostics manifest
- boundary semantics

### 2.5 诊断要求

`PromptBuildArtifact` 必须扩展到足以支持 diagnostics：

```python
@dataclass(slots=True)
class PromptBuildArtifact:
    full_prompt: str
    static_prefix: str
    dynamic_suffix: str
    section_manifest: list[PromptSection]
    provider_manifest: list[str] = field(default_factory=list)
    static_char_count: int = 0
    dynamic_char_count: int = 0
```

### 2.6 产物价值

做完后你立刻得到 4 个改善：

- prompt 结构不再失控
- 能知道哪一段是静态、哪一段是动态
- 后续 compact/resume 有落点
- prompt diagnostics 可正式做成产品能力

## 三、统一 Tool Runtime Contract

### 3.1 目标

把 Nion 现有的 guardrail / permission / error handling / hook 雏形收口成统一执行合同。

不是重写工具系统，而是定义一个正式执行阶段语义。

### 3.2 执行阶段

统一执行链定义如下：

1. `lookup`
2. `schema_parse`
3. `validate_input`
4. `pre_tool_use_hook`
5. `permission_decision`
6. `execute`
7. `post_tool_use_hook`
8. `post_tool_use_failure_hook`
9. `result_normalization`
10. `activity_projection`

### 3.3 Contract 模型

新增：

```python
@dataclass(slots=True)
class ToolExecutionContext:
    thread_id: str | None
    surface: str
    agent_name: str | None
    execution_mode: str | None
    selected_extensions: dict[str, list[str]]
    session_guidance: dict[str, object]
```

```python
@dataclass(slots=True)
class ToolExecutionResult:
    status: Literal["success", "failed", "permission_denied", "interrupted"]
    output: object
    normalized_output: object | None = None
    events: list[dict[str, object]] = field(default_factory=list)
```

### 3.4 现有能力复用

直接复用现有能力，不平行重写：

- `GuardrailMiddleware`
- `ToolErrorHandlingMiddleware`
- future hook event plane

即：

- LangGraph middleware 继续作为承载点
- Nion 在其上补统一执行阶段语义与标准化上下文

### 3.5 为什么要在 Phase 1 做

因为后续这些能力都依赖统一执行链：

- hooks
- SkillTool
- plugin frontmatter contract
- MCP behavior plane
- tool summary / activity layer
- system management tools

如果这层不先立住，后面所有能力都会继续走“工具多一点、治理散一点”的路线。

### 3.6 LangGraph 映射

这一层默认优先映射到 LangGraph：

- middleware：pre/post execution governance
- `interrupt()` / resume：permission request
- state schema：execution metadata
- streaming：tool lifecycle events

Nion 只补：

- tool execution stage contract
- hook 返回协议
- permission semantics
- diagnostics projection

### 3.7 Tool Runtime Contract 的产品边界

本阶段先定义 contract，不要求立刻做全量 hook 事件。

换句话说：

- 本阶段要把 execution stage 名字、上下文、结果模型立住
- hook event plane 会在下一阶段接入

## 四、Phase 1 与后续阶段的关系

这三个基础设施完成后，后续能力才允许接入：

### 可接入的 prompt 侧能力

- skills discoverability
- selected extensions
- MCP instructions
- output style
- policy reminders
- notebook scope
- future system capability catalog

### 可接入的执行侧能力

- SkillTool
- plugin frontmatter contract
- system management tools
- MCP behavior plane
- tool activity layer
- specialist agents

## 五、适用于 Nion 的完整性约束

为了保证这套设计“完整但不臃肿”，明确约束如下：

### 1. 不做 code-first 设计

prompt runtime、tool runtime contract、diagnostics 都服务通用办公 agent，而不是只服务 coding workflow。

### 2. 不直接暴露系统模块管理能力

Notebook / Memory / Agent / Skill / MCP / CLI / Automation 的管理能力，不属于本阶段交付。

但本阶段必须为它们预留：

- prompt 注入宿主
- session guidance contract
- tool runtime execution contract

### 3. 不平行重造 LangGraph

本阶段不重写：

- state flow
- persistence
- interrupt/resume
- graph lifecycle

### 4. 不再允许继续向主 prompt 大模板直接追加新段落

任何新 section 都必须走 provider + registry。

## 六、交付物

### 代码交付物

- `backend/packages/harness/nion/prompt_runtime/registry.py`
- `backend/packages/harness/nion/prompt_runtime/profiles.py`
- `backend/packages/harness/nion/prompt_runtime/diagnostics.py`
- `backend/packages/harness/nion/prompt_sections/*`
- `backend/packages/harness/nion/tool_runtime_contract/*`

### 已有文件重构落点

- `backend/packages/harness/nion/prompt_runtime/models.py`
- `backend/packages/harness/nion/prompt_runtime/assembler.py`
- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/packages/harness/nion/agents/lead_agent/agent.py`
- existing middleware orchestration files

### 设计与文档交付物

- 本文档
- 后续配套：
  - `tool-runtime-contract-design.md`
  - `hook-event-plane-design.md`
  - `prompt-diagnostics-design.md`

## 七、验收标准

### A. Prompt section registry

- 新 section 不再直接写进大模板
- 至少 core/session/extension/policy/agent_overlay 五类 provider 可以注册
- prompt 装配顺序可诊断

### B. Static / Dynamic boundary

- artifact 中能稳定区分 static prefix 与 dynamic suffix
- section manifest 可显示每个 section 的 scope
- prompt diagnostics 能输出 boundary 信息

### C. Tool Runtime Contract

- 至少有正式的 execution stage 模型
- 现有 permission / error handling 能映射到统一阶段语义
- tool execution result 有标准化结果模型

### D. 产品化约束

- 不新增 prompt monolith
- 不平行重写 LangGraph orchestration
- 能作为后续 SkillTool / MCP / Notebook / system capability catalog 的稳定宿主

## 八、推荐的下一步

本设计通过后，下一步应该做的是：

1. 写 `Prompt Governance Foundation` 的 implementation plan
2. 先落：
   - registry
   - profiles
   - diagnostics
   - tool runtime contract skeleton
3. 再把现有 `lead_agent/prompt.py` 中手写 section 迁移到 provider

在此之前，不建议继续新增新的 session guidance、SkillTool、system management tools。
