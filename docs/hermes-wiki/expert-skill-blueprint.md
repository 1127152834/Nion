# Agent 应用专家 Skill 蓝图

最后更新：2026-04-15

这页不是正式 skill，只是基于当前 Hermes 学习成果，反推出未来“agent 应用专家 skill”应具备的知识架构。

## 1. 这个 skill 不该是什么

它不应该只是：

- 一个“推荐技术栈”清单
- 一个“agent 功能 checklist”
- 一个“怎么接 API、怎么配工具”的教程
- 一个把 Hermes/OpenClaw/Claude Code 做横向对比的综述文

那样做出来的 skill 会很空。

## 2. 这个 skill 应该解决的真正问题

它应该帮助使用者系统回答：

> “我要做的 agent 应用，作为一个长期运行的软件系统，应该如何设计它的运行时、上下文、记忆、工具、服务入口、调度、安全与扩展边界？”

也就是说，它应该是一个 **agent runtime architecture skill**，而不是 prompt 或工具技巧 skill。

## 3. 我目前认为它至少要有 8 个知识模块

### 1. Runtime Foundations

用户需要先被迫回答：

- agent 的核心循环是什么
- session 的边界是什么
- 什么是一次 turn，什么是一次 session
- 哪些状态属于当前 turn，哪些状态属于 session，哪些状态属于长期持久层

### 2. Prompt & Context Architecture

这一模块要覆盖：

- stable prefix
- frozen snapshot
- ephemeral overlays
- context files
- dynamic recall 注入边界
- prompt cache 友好设计

### 3. Memory Architecture

这一模块要覆盖：

- default memory vs searchable memory
- declarative memory vs procedural memory
- user model vs environment memory
- memory write policy
- memory provider contract

### 4. Tools & Execution Runtime

这一模块要覆盖：

- tool registry vs agent-core tools
- toolset 设计
- execution backend
- dangerous tools / approval
- tool result shaping

### 5. Delegation & Parallelism

这一模块要覆盖：

- fresh-context delegation
- context handoff
- summary return contract
- recursion guard
- isolation-first subagent design

### 6. Service Runtime & Time Model

这一模块要覆盖：

- CLI / gateway / API / cron 的统一 runtime
- session key design
- busy input protocol
- background execution
- scheduled jobs
- delivery architecture

### 7. Plugin & Provider Architecture

这一模块要覆盖：

- general plugins vs provider plugins
- single-select strategy layers
- context engine
- memory provider
- provider runtime resolution
- auxiliary model routing

### 8. Failure Modes & Tradeoffs

这一模块必须系统讲：

- cache stability vs freshness
- compression vs fidelity
- recall injection vs prompt contamination
- unification vs special-case core tools
- service continuity vs complexity
- extensibility vs attack surface

## 4. 这个 skill 的形式也不该只是一个单文件

按照 `skill-creator` 的要求和这个题目的复杂度，我现在判断它将来至少应该长成：

- `SKILL.md`：总入口与执行框架
- `references/runtime-foundations.md`
- `references/prompt-context-architecture.md`
- `references/memory-architecture.md`
- `references/tools-and-execution.md`
- `references/delegation-and-parallelism.md`
- `references/service-runtime.md`
- `references/plugin-and-provider-architecture.md`
- `references/failure-modes-and-tradeoffs.md`

如果做得更强，还应该补：

- `references/archetypes.md`
- `references/design-review-checklist.md`
- `references/red-flags.md`

## 5. 这个 skill 的触发语义应该是什么

它应该在用户出现下面几类意图时触发：

- 想设计 agent 系统
- 想规划 agent 架构
- 想做长期运行的 AI assistant / operator / copilot
- 想做多 agent / persistent agent / tool-using agent / service agent
- 想设计 memory、skills、subagent、gateway、automation、plugin system

它不该在普通“帮我写个脚本”这种请求里触发。

## 6. 这个 skill 的执行方式应该是什么

它不应直接给答案，而应带有一个结构化诊断过程：

1. 识别用户要做的 agent 类型
2. 判断是 CLI agent、service agent、workflow agent 还是 platform agent
3. 沿着八个模块快速盘点缺失项
4. 输出架构建议、关键 tradeoff、推荐 contract、风险清单

换句话说，这个 skill 更像一个架构顾问，而不是静态知识库。

## 7. 现在距离真正开始制作这个 skill 还差什么

虽然已经有骨架了，但我认为还差三类材料：

1. Hermes 的 gateway / cron / plugin / provider 更多源码级细节
2. 演化史里的关键 issue / PR 被整理成系统的 failure-mode corpus
3. 把 Hermes 的模式再和 OpenClaw、Claude Code、Codex 之类做更高质量对照，避免 skill 过度“只像 Hermes 复读机”

## 8. 当前结论

我现在已经能开始反推这个 skill 的知识架构，但还不该立即动手做。
更合理的路径是：

1. 再补一轮 Hermes 深层实现与演化史
2. 再做一轮跨系统对照
3. 然后再正式创建 skill

这样做出来的东西才可能真的“非常非常非常厉害”，而不是只是一个会复述 Hermes 名词的 skill。
