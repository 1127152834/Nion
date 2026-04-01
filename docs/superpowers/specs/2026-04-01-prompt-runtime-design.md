# Prompt Runtime Design

## 背景

Nion 当前已经有一套可工作的 system prompt 生成逻辑，但它仍然停留在“单体模板 + 若干字符串拼接”的阶段。

当前实现的主要问题不在于提示词内容弱，而在于它不是一个可治理、可扩展、可产品化的 prompt runtime。

目前的核心现状可以概括为：

- `backend/packages/harness/nion/agents/lead_agent/prompt.py` 以 `SYSTEM_PROMPT_TEMPLATE` 为中心
- memory、skills、deferred tools、CLI tools、ACP、subagent section 都通过模板占位拼接进去
- lead agent、bootstrap agent、subagent/custom agent 的 prompt 构造逻辑没有统一 runtime 边界
- 还没有 static / dynamic boundary
- 还没有 section registry
- 还没有 prompt-level telemetry / cache / compact / resume 设计接口

如果继续沿着这个结构迭代：

- 每加一个能力，就会往模板里再塞一个 XML 段
- prompt 规则会越来越难治理
- hooks、SkillTool、plugin、MCP instructions、output style 等能力会继续补丁式插入
- 将来做 compact / resume / transcript hygiene 时，无法稳定划分哪些部分是 cache-stable，哪些是 session-dynamic

因此，Prompt Runtime 需要先被设计成产品级 runtime 基础设施，而不是继续维护一段大模板。

## 目标

把 Nion 的 prompt 体系从“模板字符串”升级为“可组合、可治理、可扩展的 Prompt Runtime”。

这套 runtime 要服务的不只是 code agent，而是 Nion 作为通用个人办公 AI agent 的全部运行时能力。

因此它必须支持：

- lead agent
- custom agent
- built-in agent
- subagent
- future specialist agent
- future plugin / skill / MCP / policy 注入

## 非目标

这份设计不做下面这些事情：

- 不直接重写 Tool Runtime Contract
- 不定义 Hook Event Plane 的完整 schema
- 不定义 SkillTool 的执行协议
- 不定义 Tool Activity Layer
- 不在本阶段改变前端消息协议

这份设计只处理 prompt runtime 本身，以及它为后续模块预留的扩展点。

## 设计原则

### 1. Prompt 是 runtime，不是文本资产

Prompt 不应该被视为一段大字符串，而应该被视为一个按阶段装配的 runtime 产物。

### 2. Static / Dynamic 必须是一等边界

必须显式区分：

- cache-stable 内容
- session-dynamic 内容
- turn-dynamic 内容

否则后续的技能注入、MCP 注入、resume、compact 都会继续互相污染。

### 3. Agent-specific overlay 不能再靠 if/else 拼模板

lead agent、subagent、custom agent、bootstrap agent 之间的差异，应通过 section overlay 和 profile 解决，而不是散落在模板逻辑里。

### 4. Prompt 注入点必须可治理

每个注入点都必须有：

- 来源
- 生命周期
- 作用范围
- 稳定性级别
- 冲突处理规则

### 5. 优先服务通用办公 agent

这套 Prompt Runtime 的设计目标不是把 Nion 做成 code-first 的 Claude Code clone，而是支撑：

- 办公任务
- 知识工作流
- 自动化场景
- 多线程长期协作
- 代码相关任务

代码能力只是其中一个特化场景。

## 当前问题清单

### 问题 1：单体模板过载

`SYSTEM_PROMPT_TEMPLATE` 目前承担了过多职责：

- 角色定义
- clarification 流程
- response style
- citation policy
- skills
- subagent
- ACP
- deferred tools
- CLI tools
- memory

这使得任何一项能力修改，都会触发整个 prompt 文件的耦合改动。

### 问题 2：缺少 section registry

当前没有一个标准化的 prompt section 注册与装配层。

这意味着：

- 新能力不能按 section 独立注册
- 无法在构造阶段做排序、过滤、去重
- 无法为 compact / telemetry / debug 暴露 section 粒度信息

### 问题 3：缺少 static / dynamic boundary

当前所有内容最终都被合成在一起。

这意味着：

- 未来无法稳定利用 prompt caching
- session-specific / thread-specific / turn-specific 内容混在一起
- compact / resume 无法清楚判断哪些内容需要重建

### 问题 4：缺少 agent profile 层

现在不同 agent 的差异主要来自：

- `apply_prompt_template(...)` 的参数
- agent_name / available_skills / subagent_enabled 等运行时条件
- 单独的 subagent system 段落

但没有一个正式的 `AgentPromptProfile` 概念去描述：

- 这个 agent 的身份
- 哪些 section 继承
- 哪些 section 覆盖
- 哪些 section 禁用

### 问题 5：扩展面缺少正式挂点

未来这些能力都需要进 prompt runtime：

- SkillTool discoverability
- plugin frontmatter 注入
- MCP instructions
- prompt output style
- policy reminders
- hook-related system reminders

如果没有正式挂点，它们只能继续往模板里塞字符串。

## 目标架构

Prompt Runtime 应拆成四层：

```text
Prompt Sources
  ├─ core static sections
  ├─ runtime dynamic sections
  ├─ agent overlays
  ├─ extension injections
  └─ policy injections
        ↓
Prompt Section Registry
        ↓
Prompt Assembler
        ↓
Prompt Build Artifact
  ├─ static prefix
  ├─ dynamic suffix
  ├─ debug metadata
  └─ section manifest
```

## 核心模型

### 1. PromptSection

这是 prompt runtime 的最小单元。

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
```

说明：

- `key`：稳定标识
- `scope`：决定 static/dynamic boundary
- `layer`：说明来源层次
- `order`：决定最终装配顺序
- `tags`：便于调试、过滤、telemetry、future compact 策略

### 2. PromptSectionProvider

不是每个 section 都应该直接写死在主文件里，应允许 provider 模式：

```python
class PromptSectionProvider(Protocol):
    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        ...
```

适用对象：

- memory provider
- skills provider
- deferred tool provider
- mcp instruction provider
- ACP provider
- agent overlay provider

### 3. PromptBuildContext

Prompt 运行时上下文必须结构化，而不是散乱参数：

```python
@dataclass(slots=True)
class PromptBuildContext:
    agent_name: str | None
    agent_kind: Literal["lead", "custom", "builtin", "subagent", "bootstrap"]
    subagent_enabled: bool
    cli_tools_enabled: bool
    available_skills: set[str] | None
    max_concurrent_subagents: int
    surface: str
    model_name: str | None
    session_mode: str | None
    memory_enabled: bool
    extensions_enabled: bool
```

后续还可扩：

- permission mode
- current connected MCP servers
- plugin runtime context
- output style

### 4. PromptBuildArtifact

最终产物不应该只有一段字符串。

```python
@dataclass(slots=True)
class PromptBuildArtifact:
    full_prompt: str
    static_prefix: str
    dynamic_suffix: str
    section_manifest: list[PromptSection]
```

意义：

- `static_prefix` 可用于 future cache 设计
- `section_manifest` 可用于 debug、telemetry、compact、resume

## Section 分层

### A. Core Static Sections

这类 section 默认进入 static prefix：

- role / identity
- thinking style baseline
- response style baseline
- high-level product values
- general safety baseline
- generic clarification baseline

要求：

- 不依赖线程状态
- 不依赖当前连接扩展
- 不依赖本轮输入

### B. Session Dynamic Sections

这类 section 默认进入 dynamic suffix：

- memory injection
- skills listing / discoverability
- deferred tools listing
- ACP availability
- CLI tool capability
- MCP instructions
- current date / session-specific hints

### C. Agent Overlay Sections

这类 section 由 agent profile 决定：

- lead agent orchestration emphasis
- subagent read-only / role-specific contract
- bootstrap-only setup guidance
- future specialist agent guidance

### D. Policy Sections

这类 section 面向未来：

- permission behavior reminders
- tool governance reminders
- hook-related system reminders
- output-style overlays

## Static / Dynamic Boundary 设计

必须显式引入 boundary marker，而不是隐式靠字符串拼接顺序。

建议：

```python
PROMPT_DYNAMIC_BOUNDARY = "__PROMPT_DYNAMIC_BOUNDARY__"
```

生成规则：

1. 按 order 排序所有 enabled sections
2. 先拼 `global_static`
3. 插入 boundary marker
4. 再拼 `session_dynamic` 和 `turn_dynamic`

这样能为后续提供：

- prompt cache 设计空间
- debug 可视化
- compact / resume 重建能力

## Agent Profile 设计

应该引入统一的 `AgentPromptProfile`：

```python
@dataclass(slots=True)
class AgentPromptProfile:
    kind: Literal["lead", "custom", "builtin", "subagent", "bootstrap"]
    enabled_section_tags: set[str] | None = None
    disabled_section_keys: set[str] | None = None
    overlay_providers: tuple[str, ...] = ()
```

这样 future 的 agent 差异就可以通过 profile 控制，而不是继续在主模板里加条件分支。

### 首批 profile

#### lead

- 全功能 profile
- 包含：
  - clarification
  - skill discovery
  - deferred tools
  - ACP
  - subagent overlay（如果启用）

#### bootstrap

- setup-focused profile
- 限定 skill 集
- 启用 setup / agent creation 相关 guidance

#### subagent

- 不直接继承 lead 的全部内容
- 只保留：
  - 基础角色
  - 必要 policy
  - role-specific overlay

#### builtin/custom agent

- 通过 profile + soul/agent metadata 组合
- 不再直接复用 lead 的模板拼装方式

## 与现有模块的映射

### `SYSTEM_PROMPT_TEMPLATE`

处理方式：

- 不再继续扩展
- 拆成多个 section provider / static section 定义
- 在迁移期保留兼容输出

### `_build_subagent_section()`

处理方式：

- 改造成 subagent overlay provider
- 不再直接拼进主模板

### `get_skills_prompt_section()`

处理方式：

- 改造成 skills section provider
- 保留现有技能发现语义
- 输出进入 dynamic sections

### `get_deferred_tools_prompt_section()`

处理方式：

- 改造成 deferred tool section provider

### `_build_acp_section()`

处理方式：

- 改造成 ACP section provider

### `_get_memory_context()`

处理方式：

- 改造成 memory section provider

## 对未来模块的预留接口

### 对 Hook Event Plane

Prompt Runtime 只预留：

- hook policy reminder section
- hook-discovered additional context section

不在本设计中实现 hook runtime。

### 对 SkillTool

Prompt Runtime 只负责：

- 技能 discoverability section
- 技能系统规则 section

SkillTool 本身的执行协议后续定义。

### 对 MCP

Prompt Runtime 应支持：

- 连接状态驱动的 MCP instruction provider
- agent-specific MCP overlay provider

### 对 Output Style

应预留一个 output style overlay provider，未来支持：

- workspace-level style
- agent-level style
- user preference overlays

## Compact / Resume 兼容

Prompt Runtime 必须为未来 compact / resume 提供稳定重建能力。

所以设计上要满足：

1. section 构建输入可重放
2. dynamic sections 来源可重建
3. static prefix 稳定
4. section manifest 可记录到 diagnostics/debug artifacts

这会直接影响以后：

- compact 前后 prompt 重建
- resume 时上下文恢复
- 背景 agent / subagent 的 prompt 一致性

## 调试与可观测性

Prompt Runtime 需要内建最低限度的调试能力。

建议增加：

- prompt section manifest debug dump
- static / dynamic 长度统计
- agent profile 命中信息
- provider 贡献统计

这不一定第一版就暴露给 UI，但要先在模型里有接口。

## 迁移策略

### 阶段 1：平移

目标：

- 不改变现有行为
- 先把大模板拆成 section

做法：

- 建 PromptSection / PromptBuildContext / PromptBuildArtifact
- 把当前逻辑按 section provider 平移
- 输出仍与现有 prompt 尽可能一致

### 阶段 2：边界引入

目标：

- 正式引入 static / dynamic boundary

做法：

- section scope 明确化
- build artifact 暴露 static_prefix / dynamic_suffix

### 阶段 3：agent profile 引入

目标：

- lead / bootstrap / subagent / custom agent 进入统一 profile 模型

### 阶段 4：扩展接口固化

目标：

- 为 SkillTool、MCP instructions、output style、future policy sections 提供正式 provider 接口

## 测试方案

Prompt Runtime 的测试不应该只验证“字符串里有没有某段文本”，而应该验证：

- section 模型是否稳定
- build artifact 是否可预测
- static / dynamic boundary 是否正确
- agent profile / provider 注入是否按预期生效
- 迁移过程是否保持兼容

建议分成 5 层测试。

### 1. 纯模型单元测试

目标：验证 `PromptSection`、`PromptBuildContext`、`PromptBuildArtifact` 这类纯数据模型的基本约束。

覆盖点：

- `PromptSection.scope` 只能是合法值
- section 排序稳定
- disabled section 不进入最终产物
- manifest 与最终 prompt 顺序一致

建议测试方式：

- 纯 Python 单元测试
- 不依赖真实 app config / skill loader / MCP

### 2. Assembler 单元测试

目标：验证 Prompt Assembler 本身的核心行为。

覆盖点：

- static sections 正确进入 `static_prefix`
- dynamic sections 正确进入 `dynamic_suffix`
- boundary marker 插入位置正确
- `full_prompt == static_prefix + boundary + dynamic_suffix`
- 同一个输入上下文重复构造时，产物稳定

建议重点断言：

- boundary 前后内容分类正确
- 相同 context 多次构造结果一致
- section manifest 可回溯每一段内容来源

### 3. Provider 集成测试

目标：验证现有能力迁移为 section provider 后，是否还能正确工作。

覆盖对象：

- memory provider
- skills provider
- deferred tools provider
- ACP provider
- subagent overlay provider

覆盖点：

- 各 provider 在启用时返回预期 section
- 在禁用或无数据时返回空 section
- provider 不直接污染别的 layer
- provider 输出的 scope 与 layer 正确

### 4. Agent Profile 集成测试

目标：验证 lead / bootstrap / subagent / custom agent 在 prompt runtime 上的差异。

覆盖点：

- lead profile 包含完整功能段
- bootstrap profile 限定 skill 集并启用 setup guidance
- subagent profile 不继承 lead 的全部 section
- custom / builtin agent 能通过 profile + overlay 控制行为

建议测试方式：

- 基于当前 `make_lead_agent()` 和 `apply_prompt_template()` 的调用路径做适配测试
- 对比不同 profile 的 section manifest，而不是只对比最终字符串

### 5. 兼容性回归测试

目标：在迁移期确保用户可见行为没有被意外打断。

覆盖点：

- 默认 lead agent 的 prompt 语义与旧实现保持等价
- subagent_enabled / cli_tools_enabled / available_skills 等输入仍能正确影响产物
- 旧路径下的关键提醒段没有丢失
- compact / resume 所需字段在 artifact 中可重建

建议策略：

- 为旧 `apply_prompt_template()` 输出保留一组 golden fixtures
- 新 runtime 输出与旧版本做结构化对照
- 允许文本轻微调整，但不允许丢失关键 section

## 测试分层与命令建议

建议至少提供下面几类测试入口：

### Python 单元测试

适合：

- section model
- assembler
- provider
- profile

建议命名：

- `backend/tests/test_prompt_runtime_sections.py`
- `backend/tests/test_prompt_runtime_assembler.py`
- `backend/tests/test_prompt_runtime_providers.py`
- `backend/tests/test_prompt_runtime_profiles.py`

### 回归测试

适合：

- 当前 lead agent prompt 的关键语义不丢失
- subagent / bootstrap 差异仍存在

建议命名：

- `backend/tests/test_prompt_runtime_regression.py`

### 调试输出测试

适合：

- section manifest 是否可生成
- static/dynamic 长度统计是否存在

建议命名：

- `backend/tests/test_prompt_runtime_debug_artifact.py`

## 验收标准

这份设计落地后，必须满足下面这组更细化的验收条件。

### A. 结构验收

1. prompt 不再是一整块模板字符串
2. section 可注册、排序、过滤、调试
3. static / dynamic boundary 明确
4. build artifact 同时暴露：
   - `full_prompt`
   - `static_prefix`
   - `dynamic_suffix`
   - `section_manifest`

### B. 运行时验收

5. lead / bootstrap / subagent / custom agent 能通过 profile 和 overlay 管理
6. memory / skills / deferred tools / ACP 不再直接靠模板占位插入
7. 新增 prompt 能力时，可以通过 section provider 接入，而不需要修改单体模板主体

### C. 扩展性验收

8. compact / resume / SkillTool / MCP instructions 有明确扩展接口
9. output style、policy reminders、future hook-related sections 有可挂接位置

### D. 可测试性验收

10. assembler 可以独立单测
11. provider 可以独立单测
12. agent profile 差异可以通过 manifest 级断言验证
13. 兼容性回归测试能证明默认 lead agent 行为未被意外破坏

### E. 迁移验收

14. 阶段 1 平移完成后，旧 prompt 语义与新 runtime 输出保持等价
15. 阶段 2 引入 boundary 后，不影响当前主要行为
16. 阶段 3 引入 agent profile 后，subagent / bootstrap / custom agent 行为差异仍然可解释且可回归验证

## 风险与取舍

### 风险 1：一次性设计过大

处理方式：

- 设计范围按产品化收口
- 实现上分阶段平移，不一次性重写所有调用点

### 风险 2：和现有 subagent/custom agent 逻辑耦合

处理方式：

- 先统一 runtime 模型
- 迁移期允许旧逻辑适配到新 artifact

### 风险 3：过早追求 cache 优化实现

处理方式：

- 本设计只定义 boundary 和 artifact
- 不在第一版就引入复杂 cache 行为

## 下一步

这份设计确认后，下一份应该写：

- `Tool Runtime Contract Design`

因为 Prompt Runtime 的下一层依赖，就是统一工具执行链。
