# Nion Claude Code 复刻路线图 V2

> 基于现有 Claude Code 研究结论的第二版路线。  
> 本版的核心目标不是“把 Nion 做得更像 code agent”，而是把 Claude Code 中最值钱的 operating model，转译成适合 Nion 的**通用办公 AI agent 基础设施**。

关联文档：

- 研究基线：`/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/research/2026-04-01-claude-code-operating-model-for-nion.md`
- 第一版路线：`/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-01-claude-code-replication-roadmap.md`

## 0. 先讲结论

Nion 不应该复刻 Claude Code 的产品形态。  
Nion 应该复刻 Claude Code 的运行时中轴，然后把这条中轴服务到“办公、任务、知识、自动化、协作”这些更广的通用场景里。

所以这份路线图的核心判断是：

- 复刻的是 `runtime contract`
- 不是 `code agent 产品壳`
- Claude Code 提供的是能力参照系，不是产品终点

## 1. 目标重述

### Nion 的目标

Nion 的愿景是成为一个通用个人办公 AI agent。  
它的工作对象不应只包括代码，还应包括：

- 文档
- 表格
- 知识库
- 自动化任务
- 配置与审批流
- 多应用工作流
- 多线程长期工作容器

### Claude Code 对 Nion 的价值

Claude Code 最有价值的，不是“会写代码”，而是它把这些东西组织成了统一运行时：

- prompt assembly
- permission / policy
- hook event plane
- tool runtime contract
- skill / plugin / MCP extension plane
- specialist agent orchestration
- transcript hygiene / compact / resume

这套东西对 code agent 有效，对通用办公 agent 同样有效。

## 2. 哪些应该复刻，哪些不该主导路线

### 2.1 应优先复刻的通用基础设施

这些能力会增强 Nion 的通用办公能力，应进入主线：

- prompt section registry
- static / dynamic prompt boundary
- 统一 tool runtime contract
- hook event plane
- permission / approval / denial semantics
- SkillTool
- plugin frontmatter contract
- agent delegation runtime
- tool activity layer
- transcript hygiene / compact / resume
- MCP instructions 行为层注入

### 2.2 可借鉴但应降级优先级的 coding-specific 能力

这些能力很强，但更偏 code agent，不应抢占主线：

- Explore / Plan / Verification specialist agents
- Glob / Grep / patch-style FileEdit / LSP
- worktree-heavy isolation
- teammate / swarm / remote-like 高级编排

它们可以做，但必须以“通用代理基础设施已经立住”为前提。

### 2.3 不该主导 Nion 路线的能力

这些不应成为近期复刻重点：

- slash command 产品壳
- Anthropic 内部 telemetry / GrowthBook / 运营平台
- 只服务代码工作流的 UI 心智
- 以 code review / commit / PR 为中心的产品表层

## 3. V2 的设计原则

### 原则 1：先中轴，后表层

先把 prompt/runtime/tool/hook/skill/agent 的 contract 建好，再谈产品表层。

### 原则 2：先通用能力，后 code 专项

如果一个能力只能增强“代码助手”，却不能增强“通用办公 agent”，就不应该放进 P0。

### 原则 3：先统一事件面，后局部能力

Hook、Tool Activity、Session Resume 这些都应该先统一事件面，再往上挂功能。

### 原则 4：先 execution primitive，后生态壳

SkillTool、Agent runtime constructor、plugin frontmatter contract 应先于 plugin marketplace 或 command UI。

### 原则 5：每一步都要有独立价值

每个阶段都要能单独提升 Nion 的产品能力，而不是只能服务未来某个大重构。

## 4. 总体阶段图

V2 推荐分成 7 个阶段，而不是按功能散点推进。

### 阶段 A：Runtime Contract Backbone

目标：把 Nion 从“很多能力并存”升级成“有统一 contract 的运行时”。

包括：

- prompt runtime
- tool runtime contract
- hook event plane

### 阶段 B：Knowledge / Work Object Model Backbone

目标：先把 `Memory / Notebook / Project` 三类对象的职责边界和桥接关系产品化，否则后续 Notebook 2.0 / Projects 2.0 只会继续堆页面能力。

包括：

- object model 统一定义
- provenance / extraction / bridge actions
- Notebook / Project / Memory 的边界和互转规则

### 阶段 C：Execution Primitive Backbone

目标：把 skill / agent 从资源和零散工具升级为一等执行原语。

包括：

- SkillTool
- plugin frontmatter contract
- plugin markdown loader
- agent runtime constructor 基础

### 阶段 D：Notebook / Projects 2.0

目标：在 object model 已经稳定的前提下，重建 Notebook 和 Projects 两个一级对象层，而不是先改 UI 壳。

包括：

- Notebook 2.0
- Projects 2.0
- project memory 主链路
- notebook retrieval / reference / extraction 主链路

### 阶段 E：General-Purpose Agent Surface

目标：继续把 agent runtime 做成通用办公 agent 的基础设施层。

包括：

- tool activity layer
- transcript hygiene
- compact / resume
- MCP behavior plane

### 阶段 F：Coding-Facing Enhancement Layer

目标：在通用基础设施和对象层立住后，再补 coding-facing 能力。

包括：

- Glob
- Grep
- patch-style FileEdit
- LSP
- Explore / Plan / Verification

### 阶段 G：Advanced Orchestration

目标：补更复杂的协作与长任务编排。

包括：

- fork vs fresh
- background lifecycle
- richer subagent progress model
- optional worktree / remote / teammate lanes

### 阶段 H：Product Surface Consolidation

目标：最后才做产品壳收口。

包括：

- settings / diagnostics / UI 收口
- extension management surface
- slash-like command / capability entry surfaces

## 5. 依赖顺序

如果严格按依赖关系排，推荐顺序如下。

| 顺序 | 模块 | 依赖 | 为什么在这里 |
|---|---|---|---|
| 1 | Prompt section registry | 无 | 所有后续注入能力的宿主。 |
| 2 | Static / Dynamic boundary | 1 | 不先切动态边界，后续所有能力都会继续长成 prompt 大模板。 |
| 3 | Tool runtime contract | 1, 2 | hooks、SkillTool、tool activity、MCP、plugin 都依赖统一执行链。 |
| 4 | Hook event plane | 3 | hook 不是附属能力，而是 runtime contract 的正式一层。 |
| 5 | Hook-driven permission / continuation semantics | 4 | 这是 Claude Code hook 最值钱的地方。 |
| 6 | Knowledge / Work object model | 1, 2, 3, 4, 5 | 不先定义 Memory / Notebook / Project 三者职责和桥接关系，后续对象层只会继续堆页面能力。 |
| 7 | Notebook / Project bridge actions | 6 | 没有对象桥接 contract，就无法做 provenance、提炼、回流。 |
| 8 | SkillTool | 1, 2, 3, 4, 5 | 没有 SkillTool，skills 只是资源目录。 |
| 9 | Plugin frontmatter contract | 4, 5, 8 | plugin 应挂在 runtime contract 和 SkillTool 上，不应另起炉灶。 |
| 10 | Plugin markdown loader | 9 | 先定 contract，再做 loader，返工最少。 |
| 11 | Tool activity layer | 3, 4 | 先有统一事件，再做活动表达。 |
| 12 | Agent runtime constructor | 3, 4, 5 | specialist agents、fork/fresh、background 都依赖这一层。 |
| 13 | Transcript hygiene / compact / resume | 2, 11, 12 | 没有活动层和 agent runtime，resume 很容易乱。 |
| 14 | MCP behavior plane | 1, 2, 3, 9 | MCP 应作为行为扩展，而不只是工具来源。 |
| 15 | Coding-facing tools | 3 | coding tools 可以较早做，但不应先于中轴。 |
| 16 | Notebook 2.0 / Projects 2.0 | 6, 7, 11, 13 | 对象层升级不能先于 object model 与 runtime backbone。 |
| 17 | Explore / Plan / Verification | 12, 15 | 没有统一 agent runtime 和工具层，它们只会退化成 prompt 模板。 |
| 18 | Advanced orchestration | 12, 13, 14 | worktree/remote/teammate 必须最后做。 |

## 6. P0 / P1 / P2 / P3

### P0：未来 1 周必须确定方向的内容

这些是通用办公 agent 的底层中轴，不先做会持续拖慢后续所有工作。

- Prompt section registry
- Static / Dynamic prompt boundary
- Tool runtime contract
- Hook event plane
- Hook-driven permission / continuation semantics

交付物建议：

- `/docs/superpowers/specs/2026-04-01-tool-runtime-contract-design.md`
- `/docs/superpowers/specs/2026-04-01-hook-event-plane-design.md`
- prompt runtime 拆分方案文档

### P1：未来 1 个月应该落地的内容

这些决定 Nion 是否真正拥有 Claude Code 式 execution primitive。

- Knowledge / Work object model
- Notebook / Project bridge actions
- SkillTool
- plugin frontmatter contract
- plugin markdown loader
- Tool Activity Layer
- Agent runtime constructor 第一版

交付物建议：

- SkillTool 设计 + 第一版实现
- plugin frontmatter 兼容字段子集
- Tool Activity 领域模型 + stream projection

### P2：未来 1 个季度内按价值推进的内容

这些会增强 Nion 的通用任务处理能力，但不应先于 P0/P1。

- Notebook 2.0 / Projects 2.0
- transcript hygiene / compact / resume
- MCP behavior plane
- coding-facing tools
- Explore / Plan / Verification

### P3：后置能力

这些都值得做，但只应在基础设施稳定后推进。

- richer background lifecycle
- worktree / remote / teammate
- slash-like product surface
- extension management UI

## 7. 1 周 / 1 月 / 1 季度节奏

### 7.1 一周内

目标：完成方向收敛，不做大规模表层开发。

要完成：

- runtime contract 蓝图
- hook event plane 蓝图
- prompt runtime section 化设计
- object model 蓝图
- SkillTool 的最小职责定义

成功标准：

- 后续每个模块都有明确挂载点
- 团队不再争论“先补工具还是先补中轴”

### 7.2 一个月内

目标：让 Nion 拥有 Claude Code 风格的“最小可用中轴”。

要完成：

- prompt runtime 第一版
- tool runtime contract 第一版
- 通用 hook 事件 P0
- object model 第一版
- Notebook / Project bridge actions 第一版
- SkillTool 第一版
- plugin frontmatter 第一版
- Tool Activity Layer 第一版

成功标准：

- 技能从资源升级成 execution primitive
- hooks 不再只是零散 callback
- tool 执行、摘要、拒绝、审批进入统一 contract

### 7.3 一季度内

目标：在通用基础设施稳定后，补齐 Claude Code 式增强层，但不改变 Nion 产品定位。

要完成：

- Notebook 2.0 / Projects 2.0
- compact / resume / transcript hygiene
- MCP behavior plane
- coding-facing enhancement layer
- Explore / Plan / Verification
- 可选高级编排

成功标准：

- Nion 拥有强 agent runtime，但仍保持通用办公 agent 心智
- code agent 能力成为一层“能力插件”，而不是产品本体

## 8. 各阶段验收标准

### 阶段 A 验收

- prompt 不再是一整块模板字符串
- tool execution 的核心阶段有统一 contract
- 通用 hook 事件可注册、可执行、可分类

### 阶段 B 验收

- Memory / Notebook / Project 职责边界明确
- 对象间桥接动作具备 provenance 与显式性
- 后续对象层 UI 升级不再依赖隐式数据回流

### 阶段 C 验收

- skill 可通过 SkillTool 执行
- plugin frontmatter 可影响运行时
- agent runtime constructor 能承载 future specialist agents

### 阶段 D 验收

- Notebook 2.0 和 Projects 2.0 建立在 object model + runtime backbone 之上
- 项目和知识对象不再只是页面，而是 agent 可理解、可操作的一级对象

### 阶段 E 验收

- chat / task / diagnostics 可共享 activity 语义
- compact / resume 不再打断长期任务的连贯性
- MCP instructions 可改变 agent 行为

### 阶段 F 验收

- coding-facing tools 不再依赖 shell 兜底
- Explore / Plan / Verification 具有明确角色边界

### 阶段 G 验收

- long-running / background / fork / isolation 生命周期一致
- 不会因为高级编排模式而破坏基础 contract

## 9. 不该怎么走

下面这些路线对 Nion 是危险的：

### 错误路线 1：先补一堆 coding tools

结果：

- 你会得到更多工具
- 但不会得到更稳定的 agent runtime

### 错误路线 2：先做 plugin 产品壳

结果：

- 很快会发现没有 SkillTool、没有 frontmatter contract、没有 hook/event plane
- 只能返工

### 错误路线 3：先做 Explore / Plan / Verification

结果：

- 这些 agent 会退化成几段 prompt
- 不会变成真正的 runtime primitive

### 错误路线 4：让 code agent 主导 Nion 路线

结果：

- Nion 会越来越像代码助手
- 而不是通用办公 agent

## 10. 与 V1 的关系

V1 路线文档：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-01-claude-code-replication-roadmap.md`

V2 在 V1 基础上做了三件关键修正：

1. 从“Claude Code 复刻”转成“通用办公 agent 导向的 Claude Code 转译”
2. 把 `Memory / Notebook / Project` object model 提升为 runtime backbone 之后的第一层对象重建
3. 把 coding-facing 能力从主线降级为增强层
4. 把 hook / tool contract / SkillTool / activity layer 提升到主线

## 11. 下一步建议

如果按这份 V2 走，接下来最合理的三个动作是：

1. 写 `tool runtime contract` 设计稿
2. 写 `hook event plane` 设计稿
3. 写 `knowledge / work object model` 设计稿

在这三份设计稿得到确认之前，不建议进入大规模实现。

## 12. 终局判断

Claude Code 能教给 Nion 的，不是怎么做一个更强的 code agent。  
Claude Code 真正能教给 Nion 的，是怎么做一个**强 runtime discipline 的 agent system**。

而 Nion 的独特价值，在于把这套 discipline 应用到更广的办公与个人工作流场景里。  
这才是 V2 路线存在的意义。
