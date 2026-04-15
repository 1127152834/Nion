# Hermes 演化史与失败模式语料

最后更新：2026-04-15

这一页的目标不是列 changelog，而是提炼 Hermes 从 `v0.6.0` 到 `v0.7.0` 的架构收敛方向，以及这些方向背后反复暴露出来的失败模式。

## 1. 从 v0.6 到 v0.7，Hermes 明显在从“功能扩展”转向“运行时硬化”

### v0.6.0 的主叙事

官方自己把它称为：

> The multi-instance release

这版的关键词是：

1. profiles
2. MCP server mode
3. Docker/container 化
4. fallback provider chain
5. 更多 messaging platforms
6. remote skills / credentials

也就是说，`v0.6.0` 的重点是把 Hermes 从“单实例 agent”推进到“多实例、多入口、可部署平台”。

### v0.7.0 的主叙事

官方自己把它称为：

> The resilience release

这版的关键词是：

1. pluggable memory provider
2. credential pool rotation
3. API server session continuity
4. gateway hardening
5. secret exfiltration blocking
6. compression death spiral fixes

也就是说，`v0.7.0` 的重点已经不是继续长功能，而是给已有 runtime 补 resilience。

## 2. 这条演化路线很说明问题

它大致是这样一条链：

1. 先把 agent 做成多入口、多实例、可部署系统
2. 再发现真正的复杂度开始集中在长期运行与生产稳定性
3. 然后把 memory、provider、gateway、安全、compression 都升格成硬化对象

这非常像一个系统真正长大的过程。
不是先做出完美架构，而是在服务化之后被现实逼着把 contract 做实。

## 3. 失败模式一：Prompt / Context 层最容易出现“语义污染”

### 代表案例

- memory prefetch contamination
- SSE tool progress marker 污染 assistant 内容
- subdirectory hints 泄漏到 cron 最终交付

### 暴露的问题

这类 bug 说明：

1. 动态插入的系统信息放错层，会破坏主问题语义
2. 面向用户的输出和面向系统的内部标记如果不分离，会反向污染模型行为
3. context enrichment 必须明确“属于谁的语义层”

### 学到的原则

> 任何会被插入 prompt 的运行时数据，都必须先问：
> 它属于 system、assistant、tool 还是 user 语义层？

## 4. 失败模式二：Gateway 的复杂度远大于“收发消息”

### 代表案例

- approval 拦截了 clarify 的回答
- pending message 被覆盖而不是排队
- oversized gateway session 无法自动 hygiene
- thread context / shared channel isolation 出问题

### 暴露的问题

Gateway 真正难的不是接 Telegram / Slack API，而是：

1. 忙时消息协议
2. 会话边界与路由
3. approval / interrupt / queue 的优先级
4. 长期 session 的自动维护

### 学到的原则

> 多入口 agent 最容易崩的地方，不在模型，而在消息协议与 session routing。

## 5. 失败模式三：Cron 暴露了“执行成功 != 交付成功”

### 代表案例

- cron jobs hang after output
- silent cron delivery failures
- Matrix / Telegram / other platform delivery formatting 失真
- cron result 被错误标记为 `ok`

### 暴露的问题

cron 至少分成三段：

1. job execution
2. result wrapping
3. delivery

如果三段没有被分别建模和观测，就会出现“模型跑完了，但用户没收到”的假成功。

### 学到的原则

> 自动任务系统必须分别记录：执行状态、交付状态、交付错误。

## 6. 失败模式四：Provider Runtime 层经常在“认证之前”就把 fallback 绕死

### 代表案例

- fallback_model 在 primary provider auth fail 时不触发
- stale auth state 在 gateway / auxiliary path 上无法恢复
- provider picker 与 runtime discovery 脱节
- multiple credentials / wrong endpoint 混发

### 暴露的问题

provider runtime 不只是解析配置，它决定：

1. auth source
2. provider source of truth
3. auxiliary / main runtime 一致性
4. fallback 触发层级

### 学到的原则

> 如果 fallback 只在 model call 层做，而 auth 失败发生在更早层，就等于没有 fallback。

## 7. 失败模式五：Compression 是 agent runtime 的高危区

### 代表案例

- compression death spiral
- gateway hygiene 对本地模型 context_length 判断错误
- local model config 被 setup 覆盖后再次触发 compaction loop

### 暴露的问题

compression 不是简单“超了就摘要”，而是高度依赖：

1. 正确的 context length
2. 正确的阈值
3. 可靠的 fallback 行为
4. session lineage 和 persistence

### 学到的原则

> compression 的错误常常不是摘要算法本身，而是配置、模型元数据、阈值和恢复机制联动失真。

## 8. 失败模式六：Plugin / Skill / Provider 一旦可扩展，安全面就会急剧扩大

### 代表案例

- category path traversal
- secret exfiltration blocking
- credential file protections
- tar import zip-slip

### 暴露的问题

可扩展性不是免费的。
一旦 runtime 支持：

1. 外部插件
2. 外部 skill bundles
3. provider plugins
4. MCP servers

它的攻击面和错误面都会指数级放大。

### 学到的原则

> extensibility 必须伴随路径安全、secret redaction、trust boundary 和 import validation。

## 9. Hermes 的演化史给 expert skill 的最大启发

未来那个专家 skill 不能只教“推荐架构”，还必须带着一份失败模式语料库。
至少要能提醒使用者：

1. dynamic recall 注入可能污染 prompt
2. approval 与 clarify 容易打架
3. cron 的执行与交付必须分离
4. fallback 触发层级必须覆盖 auth 层
5. compression 与 context metadata 强耦合
6. plugin / provider 扩展会扩大攻击面

一个真正强的 expert skill，应该让用户在设计前就看到这些坑，而不是踩完再补。
