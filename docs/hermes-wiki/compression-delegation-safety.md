# Compression, Delegation, Safety

最后更新：2026-04-15

## 1. 长上下文不是功能点，而是生存问题

只要 agent 真要长期工作，就迟早遇到下面这些问题：

1. 对话历史过长
2. 工具输出过多
3. 外部材料过大
4. prompt cache 被频繁打碎
5. provider 上下文上限和成本不可控

Hermes 把这件事正面制度化了。  
它不仅有 compression，而且把 Context Compression and Caching 单列为 developer guide 主题。

## 2. Hermes 的压缩哲学：压缩不是兜底脚本，而是 runtime 子系统

从官方摘要、README 和社区文章可归纳出以下设计：

1. Hermes 有默认 context compressor
2. 它支持 plugin context engine 替换压缩实现
3. 它显式关注 prompt caching
4. 它有 mid-run compression 与持久化后的连续性处理
5. release 里专门修过 compression death spiral

这说明 Hermes 不把压缩当“超限了就缩一下”，而是把它当成长寿命 agent 的核心稳定性部件。

## 3. 为什么这很重要

因为对 agent 来说，压缩不是纯成本优化，它同时影响：

1. 系统是否还能继续运行
2. 先前信息是否被错误丢弃
3. provider 是否还能吃到缓存
4. 用户是否会看到诡异的连续性断裂

Hermes 在 release 里对 compression death spiral、compressed context persistence 的修复，恰恰说明他们已经把这部分当 production 问题在处理。

## 4. Delegation：Hermes 的多 agent 观是“隔离执行”，不是“共享大脑”

README 和官方 delegation 页面都强调：

- isolated subagents
- their own conversations
- their own terminals
- Python RPC scripts for zero-context-cost pipelines

这里面有两个关键思想：

### 第一，subagent 是新的执行单元

不是父 agent 多开一个线程继续共享同一上下文，而是新开一个受限环境去完成子任务。

### 第二，subagent 的价值在于减少上下文污染

如果一个子任务要读很多文件、跑很多命令、进行大量探索，那么最合理的做法不是把这些噪音全塞进主线程，而是把它隔离出去，只回传摘要或结果。

这是一种非常成熟的 runtime 思维：

> 并行的价值，不只是更快，更是让上下文边界更干净。

## 5. Cron：Hermes 不是等人来问，而是能主动在时间线上工作

Hermes 官方把 cron 放在核心功能里，而且支持自然语言调度和跨平台投递。  
这件事意味着：

1. agent 不再只由用户的即时输入驱动
2. agent 可以进入周期性任务场景
3. 同一个 runtime 同时承载“对话”和“自动运行”两种模式

这和传统 chat assistant 的差异非常大。  
Hermes 的时间模型不止是“收到消息就回复”，而是“可以被唤醒去执行一类长期职责”。

## 6. 安全：Hermes 的现实主义远比很多 agent 项目强

从 README、Security 页面索引和 `RELEASE_v0.7.0` 看，Hermes 的安全思路很系统：

1. command approval / deny
2. dangerous command gating
3. secret redaction
4. browser URL 和 LLM response 的 secret exfiltration blocking
5. credential directories protection
6. path traversal / zip-slip / SSRF 防御
7. profile isolation
8. approval routing 和 gateway 交互稳定性

这套设计说明 Hermes 不是把 agent 当作研究玩具，而是承认：

> 只要 agent 能碰终端、文件、网络、消息平台，它就默认处在高风险系统边界上。

## 7. Plugin 系统进一步说明 Hermes 的架构成熟度

官方插件类型被拆成三类：

1. general plugins
2. memory providers
3. context engines

这三个分类非常有启发性，因为它们刚好对应 Hermes runtime 中最关键的三个扩展点：

1. 通用能力扩展
2. 记忆后端替换
3. 上下文管理策略替换

也就是说，Hermes 不仅自己有这些子系统，还提前承认这些子系统会因场景而变化，因此给出可插拔边界。

## 8. 我对这一层的总判断

Hermes 在 compression / delegation / safety 上体现出的共同哲学是：

1. 长期运行必然失控，所以必须构建治理层。
2. 复杂任务必然产生上下文污染，所以必须构建隔离层。
3. 长上下文必然带来成本和稳定性问题，所以必须构建压缩层。

这三层合起来，才使 Hermes 真正像一个 agent runtime，而不是单轮问答器。

## 9. 对 Nion 的启发

Nion 如果想真正走向长期运行的 agent，不应该只补 memory 或 soul，而应该同时回答：

1. 上下文怎么压缩，失败了如何恢复。
2. 子任务怎么隔离，回流什么，不回流什么。
3. 自动任务如何调度，如何投递，如何复盘。
4. 安全红线是什么，在哪一层阻断，不把风险留给模型临场判断。
