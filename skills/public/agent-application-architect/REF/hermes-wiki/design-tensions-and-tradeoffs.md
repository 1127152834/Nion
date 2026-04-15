# Hermes 暴露出来的设计张力与取舍

最后更新：2026-04-15

真正理解一个系统，不能只看它顺滑的设计叙事，还要看它在哪些边界上反复出问题、又为什么这么取舍。

## 1. Cache Stability vs Live Freshness

Hermes 的核心选择之一是：

- system prompt 稳定
- memory 快照冻结
- skill 内容不随便污染 cached prefix

这显然换来了 cache 命中和成本稳定。
但代价也存在：

1. mid-session memory 更新不会立刻进入 prompt
2. 新学到的稳定事实要到下一 session 才变成“默认知道”
3. 某些用户会觉得 agent “刚记住又像没记住”

Hermes 明显是偏向 cache stability 的。

## 2. Clean System Prompt vs Dynamic Recall Injection

一个很重要的 issue 线索是 memory prefetch contamination。
这暴露出一个真实张力：

1. system prompt 应该保持干净、稳定
2. 但 recall 又必须在当前轮可用
3. 如果 recall 被塞到 user message 层，就可能污染当前问题

这说明“动态 recall 注入到哪一层”不是小细节，而是会直接影响回答漂移的问题。

## 3. Registry Unification vs Agent-Core Exceptions

Hermes 已经有一套相当漂亮的 tool registry，但仍然保留了 agent-loop 截获的特殊工具。
这反映出一个经典张力：

1. 一切走统一 registry，系统更整齐
2. 但某些工具本质上是 agent runtime 自己的一部分

Hermes 的取舍是：

> 通用工具统一；
> 核心状态工具例外。

这是务实，而不是不一致。

## 4. Compression Aggressiveness vs Continuity Fidelity

Hermes 采用双层压缩系统：

- gateway hygiene
- in-agent compressor

这让它更能扛长对话，但也引入了张力：

1. 压得太早，用户会感觉上下文被过度抽象
2. 压得太晚，API 会炸，或者成本太高
3. summary model 如果上下文不够，还可能掉摘要直接丢信息

因此 Hermes 不是“有压缩就完了”，而是在不断调 threshold、tail protection、summary budget、failure handling。

## 5. Isolation vs Shared Knowledge in Delegation

Hermes delegation 强调 fresh context 和工具限制。
这很好，但也带来明显代价：

1. 每次 delegation 都要显式传很多上下文
2. 如果 parent 描述不完整，child 会很笨
3. 不能直接共享先前探索成果

也就是说，isolation 不是零成本，它只是比“共享脏上下文”更可控。

## 6. Plugin Power vs Attack Surface

Hermes 把 memory provider、context engine、MCP tools、general plugins 都做成可扩展层。
这极大增强了系统生命力，但也天然扩张了攻击面：

1. tool registry poisoning
2. plugin path traversal
3. secret exfiltration
4. context file injection
5. provider mismatch / wrong key leakage

所以 Hermes 的安全工作量并不是附加成本，而是 plugin-friendly architecture 的自然代价。

## 7. Multi-Entry Runtime vs System Complexity

CLI、gateway、cron、ACP、API server、MCP server 共享 runtime 是很强的能力。
但代价也非常真实：

1. session continuity 变复杂
2. callback surfaces 变多
3. provider/runtime bug 会跨所有入口扩散
4. gateway race、approval routing、session hygiene 都会变成一等问题

Hermes 明显接受了这笔复杂度，因为它认为 agent 应该是服务，而不是单入口应用。

## 8. Pluggable Memory vs Prompt Correctness

memory provider plugin 很强，但 issue 也暴露了一个问题：
不同 provider 不仅换存储，还会改变 recall 行为、注入方式、工具桥接与 sync 生命周期。

这说明 memory provider 抽象并不像“数据库 driver”那么简单。
它实际上会渗透到：

1. prompt assembly
2. turn enrichment
3. tool sequencing
4. memory flush
5. user modeling

因此，一个 memory provider interface 设计不好，很容易把 prompt correctness 一起拖坏。

## 9. 为什么这些张力对我们很重要

因为将来要做“非常厉害的 agent 应用专家 skill”，不能只输出：

- 最佳实践
- 推荐架构
- 功能清单

还必须教会使用者：

1. 每个设计选择换来了什么
2. 每个设计选择牺牲了什么
3. 哪些 bug 恰好暴露了架构边界

换句话说，专家 skill 不该只讲“怎么做对”，也要讲“哪里最容易做错”。

## 10. 当前我对 Hermes 的更深一层判断

Hermes 真正高级的地方，不在于它已经把所有问题都解决了，而在于：

1. 它把关键问题都显式化成了架构层问题
2. 它允许这些问题通过 contract、plugin、provider、session lineage 等手段被持续演化
3. 它的 bug 和 release 历史本身，就是一份 agent runtime 演化教材

这正是后续 expert skill 最应该吸收的东西。
