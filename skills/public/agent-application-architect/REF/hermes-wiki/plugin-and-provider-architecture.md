# Hermes 的插件与 Provider 架构

最后更新：2026-04-15

这一页关注 Hermes 最像“平台”而不是“单体应用”的部分：plugin、provider runtime、memory provider、context engine、auxiliary routing。

## 1. Hermes 的插件系统不是附加功能，而是架构扩展层

官方 `plugins.md` 把 Hermes 的插件分成三类：

1. general plugins
2. memory providers
3. context engines

这个分类很有力量，因为它几乎对应 Hermes runtime 最关键的三种可变层：

1. 能力扩展
2. 记忆策略扩展
3. 上下文管理策略扩展

换句话说，Hermes 不是只允许“加工具”，而是允许替换 runtime 的关键策略部件。

## 2. General Plugin 是多选，Provider Plugin 是单选

Hermes 在这里的边界非常清晰：

- general plugins：multi-select
- memory provider：single-select
- context engine：single-select

这是正确的，因为：

1. 工具和 hooks 本来就适合并列叠加
2. 但 memory strategy 和 context strategy 同时启用多个，容易造成冲突和语义污染

这说明 Hermes 明确区分了：

> 哪些扩展是“并列能力”，
> 哪些扩展是“全局策略”。

## 3. MemoryProvider 设计说明 Hermes 把 memory 看成运行时协议

`memory-provider-plugin.md` 和 `agent/memory_provider.py` 很值得研究。
它定义的不是一个简单后端接口，而是一整套 lifecycle：

### 必须的方法

- `name`
- `is_available()`
- `initialize()`
- `get_tool_schemas()`
- `handle_tool_call()`
- `get_config_schema()`
- `save_config()`

### 可选的 hooks

- `system_prompt_block()`
- `prefetch()`
- `queue_prefetch()`
- `sync_turn()`
- `on_session_end()`
- `on_pre_compress()`
- `on_memory_write()`
- `shutdown()`

这意味着 memory provider 不是“存储驱动”，而是会贯穿：

1. prompt assembly
2. turn enrichment
3. tool use
4. compression boundary
5. session lifecycle

## 4. MemoryProvider 最难的点：它天然会影响 prompt correctness

issue `memory prefetch contamination` 暴露了一个很深的问题：

1. external memory provider 需要动态 recall
2. 动态 recall 不想污染 system prompt
3. 于是 recall 被放进 user turn enrichment
4. 结果又可能污染当前问题语义

这说明 memory provider 真正难的地方不是“怎么查出来”，而是：

> 查出来的东西放到哪一层，才不会破坏当前 prompt 的语义结构。

这对任何 agent 架构都很关键。

## 5. ContextEngine 设计说明 Hermes 把 compression 提升为策略接口

`ContextEngine` 的抽象非常干净：

- `name`
- `update_from_response()`
- `should_compress()`
- `compress()`

再加上一组可选 lifecycle：

- `on_session_start()`
- `on_session_end()`
- `on_session_reset()`
- `get_tool_schemas()`
- `handle_tool_call()`
- `should_compress_preflight()`

这说明 Hermes 的想法不是：

> “上下文压缩就是摘要一下。”

而是：

> “上下文管理是一套可替换策略，摘要只是默认实现。”

## 6. ContextEngine 的一个关键洞察：它甚至可以带自己的工具

官方文档明确说，context engine 可以暴露自己的 agent-callable tools。
这很值得注意，因为它意味着：

1. 上下文管理不只是被动后台机制
2. 它还可以作为 agent 显式调用的能力面出现

这为更高级的 agent 架构打开了一个方向：

> 检索、聚合、压缩、知识图构建，未来都可以通过 context engine 直接参与 agent loop。

## 7. Provider Runtime Resolution 是 Hermes 的基础设施核心之一

`provider-runtime.md` 和 `hermes_cli/runtime_provider.py` 说明 Hermes 的 provider 不是 UI 配置，而是统一运行时解析链。

它负责：

1. `requested provider`
2. config 中保存的 provider / model
3. env var
4. custom endpoint
5. auth source
6. api mode
7. fallback provider / model
8. credential pool

这层重要到什么程度？
CLI、gateway、cron、ACP、auxiliary tasks 都依赖它。

## 8. Auxiliary Client 体现了 Hermes 的“side-task infrastructure”思维

`agent/auxiliary_client.py` 的注释非常值得学。
它不是随便搞个便宜模型，而是为 side tasks 提供统一解析链：

- vision
- context compression
- session search summarization
- web extraction summarization
- skills hub operations
- memory flushes

这意味着 Hermes 把“次级任务模型路由”做成了一套明确基础设施，而不是零散 if/else。

## 9. Credential Pool 和 Fallback 暴露出运行时解析层的真实复杂度

issue 里已经能看到：

- fallback 在 auth 层之前就可能短路
- stale auth state 会让 gateway / auxiliary 路径失败
- model picker 与 runtime credential discovery 可能脱节

这说明 provider runtime 真正难的地方在于：

1. 认证源不止一个
2. provider 不止一个
3. api mode 不止一个
4. auxiliary 和 main path 还要共享逻辑

一个 agent 如果要支持多 provider、多 auth、多入口，没有这层统一 runtime，很快就会碎裂。

## 10. 这个架构最值得学的地方

Hermes 在 plugin / provider 上最值得学的，不是“支持很多扩展”，而是：

1. 它清楚哪些是并列能力，哪些是单选策略
2. 它把 memory/context/provider 都做成显式 contract
3. 它允许 side-task routing 共享基础设施
4. 它通过 config-driven 选择，而不是把策略写死在主循环里

## 11. 对 expert skill 的直接启发

未来专家 skill 里，关于“agent 平台架构”的章节至少要包含这些问题：

1. 你的扩展系统分几类？
2. 哪些扩展允许多选，哪些必须单选？
3. 记忆后端只是存储替换，还是 turn lifecycle 协议的一部分？
4. 上下文管理是否只是压缩器，还是完整策略接口？
5. side-task 模型调用是否共享统一 runtime？
6. provider 解析逻辑是 UI 配置，还是基础设施契约？
