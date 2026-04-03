# Memory OS Observability And Risk

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第九篇。

它负责冻结：

- Memory OS 的可观测性要求
- 后台维护的预算与背压规则
- memory drift 风险
- growth loop 风险
- 降级与故障处理要求

它**不**负责：

- 最终实施任务分解
- 具体监控平台选型

## 2. Inputs

本篇依赖：

- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [04-memory-os-runtime-flows.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/04-memory-os-runtime-flows.md)
- [05-memory-os-governance-and-permissions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/05-memory-os-governance-and-permissions.md)
- [06-memory-os-interaction-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/06-memory-os-interaction-model.md)
- [07-memory-os-migration-and-compatibility.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/07-memory-os-migration-and-compatibility.md)

## 3. Decisions

本篇冻结以下关键决策：

1. Memory OS 必须自带 observability，不允许成长系统成为黑箱。
2. heartbeat/background loops 必须有明确预算与背压规则。
3. 主用户路径优先级高于成长路径。
4. 任何成长异常都不允许拖垮聊天主链。
5. memory drift、soul drift、automation drift 都必须可检测。

## 4. 可观测性目标

Memory OS 至少要满足四类可观测性：

1. **数据可观测**
   - 写了什么
   - 改了什么
   - 删了什么
2. **运行时可观测**
   - 哪个 flow 在跑
   - 成功/失败/耗时
3. **治理可观测**
   - 哪些动作自动执行了
   - 哪些建议被接受/拒绝
4. **产品可观测**
   - 用户是否理解
   - 用户是否频繁纠错
   - 用户是否频繁暂停成长行为

## 5. 必须记录的日志

## 5.1 Access Logs

必须记录：

- 哪些 memory 被用于 context assembly
- 哪些 memory 被 heartbeat 读取
- 哪些 artifacts 被 UI 查看

目的：

- 做 provenance
- 做 relevance 与 stale 分析

## 5.2 Consolidation Logs

必须记录：

- 哪些 candidates 被处理
- 为什么变成 active / invalidated / archived / rejected

目的：

- 调试 memory drift
- 支撑用户解释面

## 5.3 Growth Logs

必须记录：

- learning topic 何时出现
- procedure draft 何时生成
- soul proposal 何时生成
- agent-owned automation 何时生成

## 5.4 Governance Logs

必须记录：

- 哪些动作是 `AUTO`
- 哪些动作是 `SUGGEST`
- 哪些动作进入 `CONFIRM`
- 用户的 accept/reject/pause/resume 操作

## 6. 核心监控指标

## 6.1 数据质量指标

- `candidate_count`
- `candidate_reject_rate`
- `active_memory_count`
- `invalidated_memory_count`
- `archived_memory_count`
- `memory_without_provenance_count`

## 6.2 运行时指标

- `context_assembly_latency_ms`
- `post_turn_extraction_latency_ms`
- `heartbeat_run_duration_ms`
- `consolidation_batch_duration_ms`
- `automation_projection_sync_latency_ms`

## 6.3 成长质量指标

- `user_correction_rate`
- `relationship_override_rate`
- `learning_topic_abandon_rate`
- `procedure_promotion_rate`
- `soul_proposal_reject_rate`
- `agent_owned_job_pause_rate`

这些指标非常重要，因为它们能直接揭示：

- 系统是否在学错
- 系统是否太吵
- 系统是否过度主动

## 7. 预算与背压

## 7.1 总原则

主交互优先于成长任务。

一旦资源竞争发生，优先级固定为：

1. chat hot path
2. recall / context assembly
3. post-turn extraction
4. heartbeat
5. learning / procedure / soul proposal

## 7.2 预算分类

### A. Token Budget

需要限制：

- 单次 context pack token
- 单次 diary 写作 token
- 单次 consolidation token
- daily/weekly heartbeat 总 token

### B. CPU / IO Budget

需要限制：

- heartbeat 批处理大小
- artifact 扫描频率
- recall / projection rebuild 并发数

### C. Time Budget

需要限制：

- hot path 最大附加延迟
- post-turn extraction 最大耗时
- heartbeat 单轮最大运行时长

## 7.3 背压策略

### 触发条件

出现任一情况时触发背压：

1. 候选队列积压
2. heartbeat 连续超时
3. UI 线程活跃且系统空闲窗口不足
4. token 预算接近上限

### 处理方式

1. 降级为只 capture evidence，不做 consolidation
2. 暂停 learning/procedure 提案生成
3. 暂停 soul proposal 生成
4. 延后 agent-owned automation 刷新

## 8. Drift 风险

## 8.1 Memory Drift

定义：

- user_model 越写越多，但越来越不准

检测信号：

- 用户纠错频率上升
- 高频 invalidation
- 某类记录反复被覆盖

## 8.2 Relationship Drift

定义：

- 系统对互动风格的理解持续偏离用户真实接受度

检测信号：

- 用户频繁否定主动提醒
- teaching tolerance 被反复下调

## 8.3 Soul Drift

定义：

- agent 行为风格在未经充分证据下偏移

检测信号：

- soul proposal reject rate 高
- overlay rollback 频繁

## 8.4 Automation Drift

定义：

- agent-owned jobs 越来越多，但价值越来越低或噪音越来越大

检测信号：

- pause rate 高
- dismiss rate 高
- run success 低但仍持续刷新

## 9. 故障等级

## 9.1 `SEV-1`

- 聊天主链不可用
- context assembly 崩溃导致无法回答

处理：

- 立即降级到最小上下文模式

## 9.2 `SEV-2`

- recall 不可用
- extraction 队列故障

处理：

- 主聊天继续
- 停止成长功能

## 9.3 `SEV-3`

- heartbeat 某轮失败
- learning/procedure/soul proposal 暂停

处理：

- 记录 incident
- 自动重试

## 10. 降级策略

## 10.1 最小降级

禁用：

- weekly heartbeat
- learning proposals
- procedure promotion
- soul proposals

保留：

- chat
- recall
- notebook retrieval
- basic memory reads

## 10.2 中度降级

禁用：

- all heartbeat writes
- post-turn extraction promotion

保留：

- recall capture
- current stable memory reads

## 10.3 重度降级

回到：

- legacy memory injection
- legacy recall
- no growth loops

## 11. 用户可见风险反馈

以下情况需要有用户可见提示：

1. memory system 已降级
2. growth functions 暂停
3. soul proposal 暂停生成
4. agent-owned automation 管理暂不可用

但不需要把所有内部故障细节暴露给用户。

## 12. 预算合同

本篇冻结以下预算合同：

1. 成长任务不得影响聊天主路径 SLA。
2. 任何 heartbeat 任务都必须可中断、可延后、可跳过。
3. `R2/R3` 风险动作在系统负载高时不得自动升级执行。
4. 当背压触发时，优先停 proposal 类任务，再停 consolidation，再停 capture。

## 13. Rules / Contracts

本篇冻结以下硬规则：

1. Memory OS 的后台成长能力必须可观测。
2. 热路径优先于成长路径。
3. heartbeats 必须有 budget / backpressure。
4. drift 必须可检测。
5. 任何异常都不能拖垮主聊天链路。

## 14. Impacts

本篇会直接约束：

- `09-memory-os-implementation-plan.md`

## 15. Open Questions

本篇尚未冻结的问题：

1. 具体预算阈值的默认值
2. drift 是否需要自动触发 protective freeze
3. 日志保存期限与清理策略

## 16. 结论

到这一篇为止，Memory OS 不仅有结构和流程，还有了运行安全边界。

接下来的实施方案必须把 observability、budget、backpressure 当成主需求，而不是上线后再补的运维细节。
