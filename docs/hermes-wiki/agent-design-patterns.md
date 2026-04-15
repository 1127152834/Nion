# 从 Hermes 提炼出的 Agent 应用设计模式

最后更新：2026-04-15

这一页的目标不是解释 Hermes 本身，而是把 Hermes 抽象成可迁移的 agent 应用设计方法论。

## 1. Stable Prefix Pattern

### 模式

把 session 中几乎不变的内容收敛成稳定前缀，只在必要事件后重建。

### Hermes 如何做

- system prompt 每个 session 只构建一次
- `MEMORY.md` / `USER.md` 用 frozen snapshot
- `SOUL.md` 放到 identity slot
- 只有 compression 等少数事件才重建 system prompt

### 解决的问题

1. prefix cache 命中率
2. 成本稳定
3. 行为稳定
4. 调试可解释

### 可迁移原则

任何长期对话 agent，都应该先回答：

> “什么必须稳定，什么允许每轮变化？”

## 2. Frozen Snapshot Pattern

### 模式

将长期状态在 session 开始时快照化，而不是每次写入后立刻污染当前 prompt。

### Hermes 如何做

- `tools/memory_tool.py` 明确区分 live state 和 `_system_prompt_snapshot`
- mid-session 写入立即落盘，但不改已构建 prompt

### 为什么重要

这避免了两个常见坏味道：

1. prompt 被中途悄悄改写
2. cache 被频繁打碎

### 可迁移原则

对 agent 应用来说，“状态立即持久化”与“状态立即注入 prompt”不是一回事。

## 3. Indexed Discovery Pattern

### 模式

先建立紧凑索引，再按需加载重内容。

### Hermes 如何做

- skills 先以 compact index 注入 system prompt
- 只有实际命中时才 `skill_view`
- skills index 自身还做双层缓存

### 设计价值

这是一种非常典型的 token-economy 设计：

1. 大量能力可见
2. 大量内容不常驻
3. 真正需要时再展开

### 可迁移原则

不仅是 skills，memory、docs、tools、project knowledge 都应该尽量遵循：

> 索引常驻，正文按需。

## 4. Dual-Layer Recall Pattern

### 模式

把“默认知道”与“必要时想起”拆成两条机制。

### Hermes 如何做

- `MEMORY.md` / `USER.md` 负责默认知道
- SessionDB + FTS5 负责必要时想起
- Honcho provider 再提供更深层 recall / modeling

### 为什么重要

这是避免极端设计的关键：

1. 不能全塞 prompt
2. 也不能全靠检索命中

### 可迁移原则

设计 agent memory 时，至少要明确三类信息：

1. 默认存在的信息
2. 可搜索召回的信息
3. 程序化复用的信息

## 5. Agent-Core Tool Pattern

### 模式

把真正会修改 agent 内部运行状态的工具，从通用工具系统中提升出来。

### Hermes 如何做

- `todo`
- `memory`
- `session_search`
- `delegate_task`

这些工具虽然有 schema，但执行时在 agent loop 层被截获。

### 设计价值

这能防止系统把所有能力都错误地视作“普通外部调用”。

### 可迁移原则

你需要明确：

> 哪些工具只是外部能力，
> 哪些工具其实是在操作 agent 自己。

## 6. Pluggable Policy Pattern

### 模式

把关键策略层抽象成接口，而不是把它们埋死在主循环里。

### Hermes 如何做

- `ContextEngine` 抽象
- `MemoryProvider` 抽象
- provider runtime resolution 统一 contract

### 为什么重要

因为很多 agent 的真正变化，不在功能，而在策略：

1. 怎么压缩上下文
2. 怎么召回记忆
3. 怎么选 provider

### 可迁移原则

当某个问题未来可能有多种答案时，优先抽象 contract，而不是先写死实现。

## 7. Session Lineage Pattern

### 模式

会话在压缩、切分、派生之后，仍然保留父子链路关系。

### Hermes 如何做

- `parent_session_id`
- compression 生成 child session
- SessionDB 记录 lineage

### 设计价值

这样历史不是一条被覆盖的带子，而是一棵可追踪的树。

### 可迁移原则

任何会做 compaction、handoff、fork、delegation 的 agent 系统，都应该考虑 lineage，而不是只保留“当前状态”。

## 8. Isolation-First Delegation Pattern

### 模式

subagent 从 fresh context 开始，只接收显式 goal/context，最终只把摘要回流。

### Hermes 如何做

- delegation 文档强调 “Subagents Know Nothing”
- 子 agent 拥有独立对话、终端、预算、工具集
- blocked toolsets 明确禁止 recursion、clarify、memory side effects

### 为什么重要

它解决的不只是并行，而是：

1. 降低主线程上下文污染
2. 限制副作用范围
3. 强制任务 contract 显式化

### 可迁移原则

多 agent 设计的第一问题不是“如何多开”，而是“如何隔离和回流”。

## 9. Runtime-Shared Infrastructure Pattern

### 模式

CLI、gateway、cron、ACP、API server 共享一套 provider/runtime/tool/session 基础设施。

### Hermes 如何做

- provider runtime resolution 跨入口复用
- `AIAgent` 作为统一编排核心
- SessionDB 和 gateway session continuity 串联不同入口

### 为什么重要

这避免了“每个入口一套逻辑”的系统分裂。

### 可迁移原则

如果你的 agent 会有多个入口，优先共享 runtime，而不是复制交互逻辑。

## 10. Explicit Tradeoff Pattern

Hermes 最值得学的地方之一，是很多取舍都被显式化了：

1. memory 要冻结快照，换取 cache 稳定
2. skill 内容进 user 层，不污染 system prompt
3. context engine 可插拔，但默认策略保守
4. gateway hygiene 和 agent compressor 两层阈值不同
5. subagent 不共享上下文，换取隔离和稳定

真正强的 agent 应用，不是没有 tradeoff，而是把 tradeoff 写进架构里。

## 11. 给未来“agent 应用专家 skill”的核心启发

这个 skill 真正应该教人的，不是 Hermes 的文件名，而是一组设计问题：

1. 你的稳定前缀在哪里？
2. 你的长期状态如何快照化？
3. 你的能力系统是否有索引层？
4. 你的 recall 是否分层？
5. 你的哪些工具必须进入 agent core？
6. 你的关键策略层是否可替换？
7. 你的 session 是否有 lineage？
8. 你的 delegation 是否 isolation-first？
9. 你的多入口是否共享 runtime？
10. 你的 tradeoff 是否显式化？
