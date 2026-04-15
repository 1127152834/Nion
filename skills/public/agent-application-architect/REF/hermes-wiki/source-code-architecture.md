# Hermes 源码级架构拆解

最后更新：2026-04-15

这页不再从产品功能说 Hermes，而是从源码骨干对象和官方 developer guide 的结构来理解它。

## 1. Hermes 的中心对象是 `AIAgent`

官方 `architecture.md` 和 `agent-loop.md` 都把 `run_agent.py` 中的 `AIAgent` 作为核心同步编排引擎。
它不是一个简单的“调用模型”类，而是以下职责的聚合点：

1. system prompt 构建
2. provider / api mode 解析
3. tool schema 提供与 tool dispatch
4. interruptible model call
5. compression 与 fallback
6. session persistence
7. iteration budget 管理
8. memory flush
9. delegation 相关 agent-level tool 处理

这意味着 Hermes 的 agent loop 实际上是一个 mini runtime kernel。

## 2. `AIAgent` 的关键思想：把“每轮执行”建立在“每 session 稳定前缀”上

`run_agent.py` 中 `_build_system_prompt()` 的注释非常关键：

- system prompt 每个 session 只构建一次
- 缓存在 `self._cached_system_prompt`
- 只有在 context compression 之后才重建
- 目的是“maximize prefix cache hits”

这里面体现了 Hermes 非常核心的工程思想：

> 对 agent 来说，prompt 不是一次性字符串，而是 session 生命周期内的稳定基础设施。

这也是为什么很多内容不能在 session 中途随便改动。

## 3. Prompt Builder 不是模板拼接器，而是“上下文边界管理器”

`agent/prompt_builder.py` 的职责远大于普通 prompt helper。

### 它做的事

1. 载入 `SOUL.md`
2. 发现并优先选择一种 project context 文件
3. 为 skills 生成紧凑索引
4. 注入 memory guidance / session search guidance / tool-use enforcement
5. 生成 environment hints
6. 对 context files 做安全扫描与截断

### 它为什么重要

因为它实际上定义了：

- 哪些上下文是稳定层
- 哪些上下文会污染 system prompt
- 哪些外部文件能被注入
- 注入前如何做 security scan

Hermes 在这里不是“读取文件”，而是在维护 prompt trust boundary。

## 4. `SOUL.md` 被放在 identity slot，说明人格是第一层，而不是附件

`load_soul_md()` 的注释直接写明：

- `SOUL.md` 来自 `HERMES_HOME`
- 用作 system prompt 的第一槽 identity
- 如果已经作为 identity 注入，就在 context files 段跳过，避免重复

这件事说明 Hermes 对人格层的理解很清晰：

1. 人格不是一般 context
2. 人格不应和项目说明混层
3. 人格必须位于 prompt 最前面，才能稳定影响行为

## 5. Skills index 的缓存设计说明 Hermes 把 skills 当运行时索引系统

`build_skills_system_prompt()` 明确是一个“紧凑 skill index 构造器”，并且有两层缓存：

1. 进程内 LRU
2. 磁盘 snapshot

这说明 Hermes 不是每轮暴力扫描 skills 目录，也不是把所有 skills 全量塞进 prompt。
它把 skill 系统设计成：

- 先索引
- 再按需查看
- 再局部加载

这个设计和 tools、memory 的做法是一致的：
永远先做轻量索引层，再做重内容加载。

## 6. ContextEngine ABC 说明 Hermes 认定“上下文管理策略”本身应该可替换

`agent/context_engine.py` 里有 `ContextEngine` 抽象基类。
官方文档也明确：

- 默认实现是 `ContextCompressor`
- 但可以通过 plugin 替换成其他 context engine

这件事很重要，因为它表明 Hermes 把 context management 提升到了和 memory provider 同等级的可插拔层。
这不是实现细节，而是架构声明：

> “怎么管理上下文”不是固定真理，而是一种策略。

## 7. `ContextCompressor` 的算法体现了 Hermes 对“长期对话”的具体工程解法

`agent/context_compressor.py` 的注释和开发文档能拼出一套非常清晰的算法：

1. 先廉价裁剪旧 tool output
2. 永远保护 head（system prompt + 开头关键交换）
3. 用 token budget 保护 tail
4. 对中间段做结构化总结
5. 多次压缩时采用 iterative summary update

这里最重要的不是“会总结”，而是它明确区分了：

- 什么必须原样保留
- 什么可以被摘要替代
- 什么必须先做 cheap pruning

这是一套明确的 context retention policy。

## 8. `SessionDB` 是 Hermes 的对话记忆中枢

`hermes_state.py` 和 `session-storage.md` 能看到几个关键设计：

1. SQLite + WAL
2. `messages` 表保存完整消息
3. `messages_fts` 做 FTS5 搜索
4. `parent_session_id` 追踪压缩导致的 lineage
5. 写冲突用应用层 jitter retry，而不是信 SQLite 默认退避

这说明 Hermes 对“session persistence”不是敷衍存档，而是认真设计成：

- 可搜索
- 可追溯
- 可跨进程共享
- 在 gateway/CLI 并发下可承压

特别是 lineage 这一点非常值得学：
压缩不是覆盖旧 session，而是生成父子关系链。

## 9. Tool Registry 说明 Hermes 采用的是“声明式工具生态”，不是硬编码分派

`tools/registry.py` + `model_tools.py` + `tools-runtime.md` 展示出很干净的一套机制：

1. 每个工具模块在 import 时调用 `registry.register()`
2. 注册时同时给出 schema、handler、check_fn、toolset、描述等元信息
3. `model_tools.py` 负责 discover / collect / filter
4. agent loop 只依赖统一的 tool definition 和 dispatch surface

这意味着 Hermes 的工具系统是“声明式、自注册、集中分派”的。
这种做法对 agent 应用很重要，因为它让：

- 工具扩展成本低
- toolset 可以按平台/场景裁剪
- availability check 有统一入口
- 模型只看到当前真的可用的工具

## 10. 但 Hermes 没有盲目“万物走 registry”

官方 `agent-loop.md` 明确指出四类工具在 agent loop 里被提前截获：

- `todo`
- `memory`
- `session_search`
- `delegate_task`

也就是说，Hermes 并没有为了统一而统一。
凡是需要 agent-local state 或 runtime-internal state 的工具，它就承认应该在 agent loop 层处理。

这其实是很成熟的边界感：

> registry 负责通用工具；
> agent core 负责真正修改 agent 内部状态的工具。

## 11. MemoryProvider ABC 说明 Hermes 已经把“长期记忆后端”抽象成独立能力层

`agent/memory_provider.py` 里有 `MemoryProvider` 抽象类。
这说明 Hermes 已经从“内建 markdown memory”进一步走向“memory as pluggable subsystem”。

Honcho provider 的代码也很有代表性：

1. 有 `recall_mode`
2. 有 prefetch
3. 有 session init / lazy init
4. 有 profile-scoped config
5. 有 tool 模式与上下文注入模式的差别

这意味着 Hermes 对 memory provider 的理解不是“换个存储实现”，而是：

- 换 recall 策略
- 换同步策略
- 换 user modeling 深度
- 换上下文注入方式

## 12. 一个很重要的源码级判断：Hermes 不是 feature-first，而是 contract-first

从这些源码组件可以看出，Hermes 的很多关键能力都有抽象契约：

- `ContextEngine`
- `MemoryProvider`
- `ToolRegistry`
- runtime provider resolution contract
- session storage contract

这说明 Hermes 的长期方向不是继续堆 feature，而是围绕一组 runtime contracts 组织增长。

## 13. 这对“agent 应用专家 skill”意味着什么

如果以后要做一个真正强的 agent 应用专家 skill，它不应该只说：

- 要有 memory
- 要有 tools
- 要有 subagent

而应该让使用者回答这些更底层的问题：

1. 你的 session 稳定前缀是什么，何时重建？
2. 你的上下文管理策略是固定的还是可替换的？
3. 哪些工具是通用 registry 工具，哪些必须是 agent-core 工具？
4. 你的 session store 是否支持搜索、lineage、并发？
5. 你的记忆后端是实现细节，还是显式 contract？
