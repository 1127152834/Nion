# Memory OS Runtime Flows

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第六篇。

它负责冻结：

- hot path 时序
- post-turn extraction 时序
- heartbeat / maintenance loops
- consolidation pipeline 的运行顺序
- context assembly 的读取边界

它**不**负责：

- 数据表定义
- 审批矩阵
- 前台 UI 交互

## 2. Inputs

本篇依赖：

- [01-memory-os-domain-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/01-memory-os-domain-model.md)
- [02-memory-os-business-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/02-memory-os-business-rules.md)
- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [05-memory-os-governance-and-permissions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/05-memory-os-governance-and-permissions.md)
- [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)

## 3. Decisions

本篇冻结以下关键决策：

1. 主对话热路径只做读取、响应、capture、enqueue，不做重 consolidation。
2. post-turn extraction 是独立阶段，不与回答生成混在一起。
3. heartbeat 是 daemon-owned background loop，不放进聊天线程热路径。
4. context assembly 只读取 `active / warm` 层，不直接消费 `candidate`。
5. consolidation 永远发生在异步维护阶段，而不是主响应阶段。

## 4. Runtime Actors

Memory OS 运行时参与者冻结为：

1. `chat runtime`
2. `post-turn extractor`
3. `candidate queue`
4. `heartbeat scheduler`
5. `consolidation engine`
6. `learning planner`
7. `procedure crystallizer`
8. `automation governance bridge`
9. `prompt context assembler`

## 5. Hot Path

## 5.1 目标

热路径目标只有三个：

1. 保证回答质量
2. 保证延迟可控
3. 保证证据被捕获

## 5.2 热路径步骤

### Step 1. Load thread working state

来源：

- LangGraph thread state
- checkpointer

### Step 2. Load continuity evidence

来源：

- `recall` domain
- `knowledge_projection` domain

### Step 3. Load bounded durable context

来源：

- `user_model.active`
- `relationship.active`
- `procedure.active`
- `soul.active overlay`

约束：

- 不读取 `candidate`
- 不读取 `archived`，除非显式 debug/recovery

### Step 4. Assemble context pack

输出：

- 一个 bounded context pack
- 带 provenance summary

### Step 5. Generate response

### Step 6. Capture recall exchange

输出：

- 写入 `recall`

### Step 7. Enqueue extraction

输出：

- 写入 `candidate queue`

## 5.3 热路径禁止事项

以下动作禁止出现在 hot path：

1. 大规模 consolidation
2. soul overlay 变更
3. learning plan activation
4. procedure approval
5. agent-owned automation 创建

## 6. Post-Turn Extraction Flow

## 6.1 目标

从本轮交互中生成：

- evidence
- candidate
- diary inputs

而不是直接生成长期 truth。

## 6.2 输入

- 当前轮 user/assistant exchange
- 本轮工具执行摘要
- 当前 thread metadata

## 6.3 输出

### 必产出

1. recall append
2. candidate records
3. diary evidence block

### 可选产出

1. contradiction hints
2. learning signals
3. procedure signals
4. automation signals

## 6.4 提取顺序

1. filter ephemeral noise
2. produce raw evidence refs
3. classify candidate domain
4. assign initial confidence
5. push to candidate queue
6. append diary evidence

## 7. Context Assembly Flow

## 7.1 读取优先级

context assembly 读取优先级冻结为：

1. thread working state
2. relationship
3. user_model
4. procedure
5. recall
6. knowledge_projection
7. soul

说明：

- `relationship` 优先于 `user_model`，因为它直接影响交互方式
- `procedure` 高于 `recall`，因为 procedure 更稳定、更高价值
- `soul` 不是动态检索大块正文，而是已批准的行为基线

## 7.2 读取范围

默认只读取：

- `active`
- `warm`

默认不读取：

- `candidate`
- `invalidated`
- `purged`

条件性读取：

- `archived`
  - 仅在回溯、调试、恢复、用户明确要求时

## 7.3 组装原则

1. 先高价值低噪音
2. 先稳定语义再具体证据
3. 尽量 summary-first
4. 必须保留 provenance

## 8. Heartbeat / Maintenance Loops

## 8.1 总体原则

heartbeat 是 daemon-owned background loop，不是聊天线程子流程。

它的职责是：

- consolidate
- reprioritize
- archive
- propose

不是：

- 直接替代对话回答

## 8.2 `micro` cadence

### 触发

- 对话后空闲短窗口

### 目标

- 快速收口本轮记忆副产物

### 动作

1. consume fresh candidates
2. write diary entry
3. update recent focus artifacts
4. record access/provenance logs

### 禁止

- soul approval
- procedure approval
- external automation creation

## 8.3 `daily` cadence

### 目标

- consolidation 和主题识别

### 动作

1. merge duplicate candidates
2. promote qualified `user_model` / `relationship` items
3. invalidate contradicted memory
4. create/update learning topics
5. create/update procedure drafts
6. refresh maintenance/review jobs

## 8.4 `weekly` cadence

### 目标

- 更高层次的成长收口

### 动作

1. evaluate procedure drafts for suggestion
2. generate soul proposals
3. archive stale items
4. reprioritize learning backlog
5. review agent-owned automation usefulness

## 9. Consolidation Pipeline Flow

## 9.1 输入

- candidate records
- linked evidence
- existing active/warm records

## 9.2 顺序

1. dedupe by domain/subtype/subject
2. conflict detection
3. confidence recalibration
4. decision by governance/business rules
5. write `active / invalidated / archived / reject`
6. emit consolidation event

## 9.3 输出

- updated memory records
- invalidated memory records
- consolidation events
- optional suggestions/proposals

## 10. Learning Flow

## 10.1 产生 learning signal

来源：

- repeated user asks
- repeated correction areas
- repeated notebook/project themes
- diary pattern mentions

## 10.2 进入 backlog

条件：

- 满足 `02` 中 learning candidate business rules

## 10.3 激活 learning plan

流程：

1. backlog topic ranked
2. governance check
3. suggest or confirm if required
4. write learning artifacts

## 11. Procedure Crystallization Flow

## 11.1 输入

- diary evidence
- repeated successful cases
- repeated user preference patterns

## 11.2 流程

1. create procedure candidate
2. attach evidence bundle
3. observe reuse/validation counts
4. suggest promotion if criteria met

## 11.3 输出

- procedure draft
- suggestion item
- approved procedure after acceptance

## 12. Soul Flow

## 12.1 输入

- long-term behavior evidence
- user corrections on style
- service quality patterns

## 12.2 流程

1. detect stable style delta
2. generate `soul_proposal`
3. governance route to `CONFIRM`
4. only after approval write overlay artifact

## 12.3 禁止

- auto-apply soul proposal
- directly deriving soul from single conversation

## 13. Automation Projection Flow

## 13.1 输入

- learning topic
- procedure reuse pattern
- stale review need
- maintenance need

## 13.2 流程

1. generate automation candidate
2. classify risk class
3. governance decision
4. if allowed, write/update `AutomationProjection`
5. bridge to automation service to create/update actual job

## 13.3 关键边界

Memory OS 只生成治理投影和意图，不直接替代 scheduler / executor。

## 14. Failure And Degrade Paths

## 14.1 recall unavailable

降级为：

- 无 recall context
- 仍可用 user_model / procedure / relationship

## 14.2 candidate queue failure

降级为：

- 本轮回答正常
- extraction 暂停
- 记录 incident

## 14.3 heartbeat failure

降级为：

- 热路径继续
- growth functions 暂停
- 不阻断用户主使用流程

## 14.4 artifact write failure

降级为：

- 不晋升为 stable artifact-backed state
- 保留 candidate/evidence，等待重试

## 15. Runtime Ownership Map

| 运行时层 | Owner |
|---|---|
| thread state / checkpointer | LangGraph |
| hot path orchestration | LangGraph + prompt runtime |
| recall capture | Memory OS bridge on runtime path |
| candidate queue | Memory OS |
| heartbeat | daemon-owned service |
| automation execution | automation runtime |
| memory governance | Memory OS |

## 16. Rules / Contracts

本篇冻结以下硬规则：

1. hot path 不做重 consolidation。
2. candidate 只能在异步维护阶段晋升。
3. heartbeat 是 daemon-owned，不是聊天线程附属逻辑。
4. Memory OS 不平行重做 LangGraph 的 state/checkpoint/orchestration。
5. Memory OS 不重做 automation executor，只治理其投影。

## 17. Impacts

本篇会直接约束：

- `06-memory-os-interaction-model.md`
- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 18. Open Questions

本篇仍未冻结的问题：

1. 各 cadence 的默认时间窗口
2. heartbeat 预算和重试上限
3. context pack 的 token budgeting 策略
4. recall 与 projection 的 hybrid retrieval 细节

## 19. 结论

到这一篇为止，Memory OS 的主要运行时流已经冻结。

后续的交互、迁移、风险与实施方案都必须建立在这条时序骨架之上。
