# Hermes 的服务化运行时与时间模型

最后更新：2026-04-15

这一页关注 Hermes 最容易被低估的一层：它不是一个本地聊天器，而是一个长期运行的 service runtime，并且它的时间模型不只包含“当前回合”，还包含会话连续性、后台执行和定时调度。

## 1. Gateway 说明 Hermes 的目标是常驻服务，而不是单机助手

官方 `gateway-internals.md` 直接把 gateway 定义成：

- long-running process
- connects Hermes to 14+ external messaging platforms
- unified architecture

这意味着 Hermes 的世界观不是：

> 用户打开一个前端，跟 agent 聊一会。

而是：

> agent 持续在线，多个外部平台把事件送进来，runtime 负责持续路由、持久化和回应。

## 2. Gateway 的核心不是“适配平台”，而是“维护会话连续性”

`GatewayRunner` 的架构重点不只是 adapter，而是：

1. `_handle_message()` 统一处理入口事件
2. `SessionStore` 负责会话持久化
3. `_running_agents` / `_pending_messages` 负责忙时输入与中断
4. `_agent_cache` 负责按 session 复用 `AIAgent`，保持 prompt cache
5. `_session_model_overrides` 负责会话级模型分流

这里最重要的工程判断是：

> 消息平台不是 UI 层，而是 session event source。

所以 gateway 的真实职责，是在多平台、多用户、多线程、多并发情况下，维护 agent session 的一致性。

## 3. Session Key 设计说明 Hermes 把“对话边界”当架构问题处理

`gateway/session.py` 的 `build_session_key()` 很值得学。
它明确区分：

1. DM
2. group/channel
3. thread-aware platforms
4. per-user isolation
5. shared thread sessions

这不是字符串细节，而是在回答：

> “什么叫同一个会话？”

很多 agent 产品默认这个问题很简单，但 Hermes 已经承认它是平台相关、线程相关、用户隔离相关的。

## 4. 两层消息守卫说明“中断”不是 UX 小功能，而是 runtime 协议

gateway 文档明确有 two-level guard：

1. base adapter 层先判断 session 是否 active
2. gateway runner 层再决定是 queue、interrupt，还是让 `/approve`、`/stop` 等命令 inline bypass

这说明 Hermes 已经把“用户在 agent 正忙时又发了一条消息”视为一等运行时问题。
issue 线索也证明了这点：

- 消息不能只覆盖 latest pending message
- approval 不能误拦截普通回答
- 长对话 session 要有 hygiene 机制

所以 Hermes 在这里处理的不是界面交互，而是并发消息协议。

## 5. `_agent_cache` 很关键：Gateway 真正共享的是“同一个 session 的 agent 前缀”

`gateway/run.py` 里有一句非常重要的注释：

- 如果每条消息都新建一个 `AIAgent`
- system prompt（包括 memory）每次都重建
- 会打破 prefix cache
- 成本可能高 10x

这说明 Hermes 在 gateway 场景下并不只是“每次来消息就起个 agent”，而是尽可能在同一 session 中复用 agent runtime 实例。

这背后的方法论是：

> 会话连续性不仅是历史连续，也是缓存连续。

## 6. Cron 让 Hermes 从“事件驱动 agent”走向“时间驱动 agent”

`cron-internals.md` 明确支持：

- relative delay
- interval
- cron expression
- ISO timestamp

并且统一通过 `cronjob` 工具建模。
这说明 Hermes 的 agent 生命周期已经从“用户发消息 -> 回复”扩展成：

- 时间到了 -> 启动 fresh session -> 执行任务 -> 投递结果

也就是说，Hermes 把时间本身变成了 agent 的驱动器。

## 7. Cron 的关键设计：每次运行都是 fresh session

官方文档明确写：

- no conversation history
- no memory of previous cron executions（除非主动持久化）
- prompt must be self-contained
- `clarify` 不可用
- `cronjob` toolset 禁止递归

这非常重要，因为它表明 Hermes 对 cron 的理解不是“后台继续跑当前会话”，而是：

> 用新的 agent session 执行一个自包含任务。

这是一种非常克制但正确的设计。
因为一旦让 cron 继承旧的、模糊的、不可控的会话状态，整个调度系统就会迅速失真。

## 8. Skill-backed Cron 说明 Hermes 在连接“能力模板”和“时间调度”

cron job 可以附带 `skills`，执行时按顺序加载 skill 内容再追加 prompt。
这件事很有启发性，因为它意味着：

1. skill 不只是交互时被动触发
2. skill 也可以作为自动化任务的能力模板
3. scheduler 不只是调 prompt，而是在调一套具备方法论的 agent capability

这已经很接近“autonomous capability templates”的思路。

## 9. Cron 交付模型暴露出另一类典型张力：执行成功不等于交付成功

issue 线索里已经出现：

- cron jobs hang after output
- silent delivery failure
- formatting on specific platform 丢失
- subdirectory hints 泄漏到最终交付

这说明 Hermes 的 cron 不是一个单体执行器，而是由三段链路组成：

1. 任务执行
2. 结果包装
3. 跨平台交付

真正成熟的 agent runtime 必须分别观察这三段，而不能只看“模型有没有返回文本”。

## 10. 服务型 agent 的关键架构原则

从 Hermes 可以提炼出几条很强的原则：

1. 会话边界必须显式建模。
2. 忙时输入、中断、审批、排队都必须是 runtime 协议的一部分。
3. 长期运行的入口（gateway）和时间驱动入口（cron）要共享底层运行时，但保持执行隔离。
4. 自动任务必须 self-contained，不能依赖含糊的继承上下文。
5. 交付是一个独立子系统，不能被当成“顺手 send 一下”。

## 11. 对 expert skill 的直接启发

未来那个 agent 应用专家 skill，必须能指导使用者回答下面这些问题：

1. 你的 agent 是单入口还是多入口？
2. 你的 session key 如何定义？
3. 忙时消息是覆盖、排队、拒绝还是中断？
4. 你的 gateway 是 stateless relay，还是 session runtime？
5. 你的 cron 继承旧上下文吗？
6. 自动任务的能力模板如何组织？
7. 结果交付失败如何区分于任务执行失败？
