# Memory OS 实施前置规格包计划

## 1. 目的

这份计划不是实施方案本身。

它的作用是：

- 冻结在进入正式实施方案前必须先写完的文档包
- 明确每份文档的职责、依赖、产出边界
- 保证后续文档之间不会在业务逻辑、数据结构、运行时边界上互相冲突

换句话说，这份计划要解决的是：

**如何把现有的目标架构，收敛成一组可被实施方案直接消费的规格文档。**

## 2. 总判断

现在还不应该直接写最终实施方案。

原因不是方向不清楚，而是下面这些层还没有冻结成正式规格：

- 业务逻辑
- 数据合同
- 运行时合同
- 治理与权限合同
- 交互与可见性合同
- 迁移与回滚合同

如果现在直接写实施方案，会出现三个问题：

1. 多个任务默认依赖隐含假设
2. 文档之间容易重复定义同一个概念
3. 实现阶段会再次回到“边做边补边改”

因此当前正确顺序是：

`架构目标 -> 规格包 -> 实施方案 -> 执行`

## 3. 文档包总体结构

规格包分三层：

1. **基础冻结文档**
2. **系统合同文档**
3. **落地保障文档**

只有当前两层冻结后，最后一层里的实施方案才会稳定。

## 4. 文档清单

## 4.1 基础冻结文档

### 00-memory-os-scope-and-principles.md

**目的：**

- 冻结目标、边界、非目标、术语表、核心原则

**回答的问题：**

- 什么属于 Memory OS
- 什么不属于 Memory OS
- Notebook / Memory / Soul / Learning / Automation 的基本边界是什么

**上游依赖：**

- `current-memory-system-audit.md`
- `nion-memory-os-final-architecture.md`

**下游影响：**

- 所有后续文档

### 01-memory-os-domain-model.md

**目的：**

- 冻结 domain、owner、scope、memory_type、lifecycle

**回答的问题：**

- 一类信息到底属于哪个域
- 谁拥有它
- 谁是 canonical source

**上游依赖：**

- `00-memory-os-scope-and-principles.md`

**下游影响：**

- `02` 到 `09`

### 02-memory-os-business-rules.md

**目的：**

- 冻结业务规则和判断逻辑

**回答的问题：**

- 什么进入 `candidate`
- 什么晋升 `active`
- 什么 `invalidated / archived / purged`
- 什么能进入 `soul / learning / automation`

**上游依赖：**

- `00`
- `01`

**下游影响：**

- `03` 到 `09`

## 4.2 系统合同文档

### 03-memory-os-data-contracts.md

**目的：**

- 冻结所有核心数据结构

**回答的问题：**

- Memory Record 长什么样
- Artifact metadata 长什么样
- Candidate queue / access log / provenance log 长什么样
- Automation ownership 字段怎么定义

**上游依赖：**

- `01`
- `02`

**下游影响：**

- `04` 到 `09`

### 04-memory-os-runtime-flows.md

**目的：**

- 冻结内部运行逻辑和时序

**回答的问题：**

- hot path 怎么跑
- post-turn extraction 怎么跑
- heartbeat cadences 怎么跑
- consolidation pipeline 怎么跑

**上游依赖：**

- `01`
- `02`
- `03`

**下游影响：**

- `07`
- `08`
- `09`

### 05-memory-os-governance-and-permissions.md

**目的：**

- 冻结治理、权限、控制等级

**回答的问题：**

- 哪些动作可以静默执行
- 哪些动作必须建议
- 哪些动作必须确认
- user-owned / agent-owned automation 的权限边界是什么

**上游依赖：**

- `01`
- `02`
- `03`

**下游影响：**

- `06`
- `07`
- `08`
- `09`

### 06-memory-os-interaction-model.md

**目的：**

- 冻结用户可见交互模型

**回答的问题：**

- 用户能看到哪些 memory 面
- 用户能控制哪些成长行为
- agent-owned automation 前台怎么解释
- 用户如何纠正、反馈、冻结

**上游依赖：**

- `02`
- `03`
- `05`

**下游影响：**

- `09`

## 4.3 落地保障文档

### 07-memory-os-migration-and-compatibility.md

**目的：**

- 冻结迁移和兼容路径

**回答的问题：**

- `memory.json` 怎么导入
- `recall.sqlite3` 怎么延续
- OpenViking chunk store 怎么继续承接
- 双写、兼容、回滚怎么做

**上游依赖：**

- `03`
- `04`
- `05`

**下游影响：**

- `09`

### 08-memory-os-observability-and-risk.md

**目的：**

- 冻结可观测性和风险策略

**回答的问题：**

- heartbeat 预算怎么控
- memory drift 怎么发现
- provenance/access log 怎么打
- 故障如何降级

**上游依赖：**

- `03`
- `04`
- `05`

**下游影响：**

- `09`

### 09-memory-os-implementation-plan.md

**目的：**

- 产出正式实施方案

**回答的问题：**

- 每个阶段改哪些模块
- 验收标准是什么
- 测试和回滚怎么做

**上游依赖：**

- `00` 到 `08`

## 5. 依赖关系图

```text
00 Scope & Principles
└── 01 Domain Model
    └── 02 Business Rules
        ├── 03 Data Contracts
        │   ├── 04 Runtime Flows
        │   ├── 05 Governance & Permissions
        │   │   ├── 06 Interaction Model
        │   │   ├── 07 Migration & Compatibility
        │   │   ├── 08 Observability & Risk
        │   │   └── 09 Implementation Plan
        │   └── 09 Implementation Plan
        └── 09 Implementation Plan
```

更直白地说：

- `00-02` 决定业务是什么
- `03-06` 决定系统怎么表达和运作
- `07-08` 决定怎么安全落地
- `09` 才能决定怎么实施

## 6. 写作顺序

推荐顺序如下：

1. `00-memory-os-scope-and-principles.md`
2. `01-memory-os-domain-model.md`
3. `02-memory-os-business-rules.md`
4. `03-memory-os-data-contracts.md`
5. `05-memory-os-governance-and-permissions.md`
6. `04-memory-os-runtime-flows.md`
7. `06-memory-os-interaction-model.md`
8. `07-memory-os-migration-and-compatibility.md`
9. `08-memory-os-observability-and-risk.md`
10. `09-memory-os-implementation-plan.md`

这里故意把 `05` 提前到 `04` 前面，原因是：

- 治理规则先冻结
- 运行时才不会漂

否则 runtime flow 写完后，很可能再被权限模型推翻。

## 7. 每份文档的固定结构

为了让这组文档形成完整系统，而不是十篇独立文章，每篇文档都必须包含固定区块：

### 1. Purpose

- 这篇文档冻结什么，不冻结什么

### 2. Inputs

- 它依赖哪些上游文档

### 3. Decisions

- 它在本篇明确做出的关键决策

### 4. Rules / Contracts

- 本篇真正的规则、结构、时序或交互合同

### 5. Impacts

- 它影响哪些下游文档

### 6. Open Questions

- 本篇尚未冻结的问题

这 6 个区块可以保证：

- 所有文档都接在同一条逻辑链上
- 不会变成“有想法但没人知道影响了哪里”

## 8. 如何保证业务逻辑完整

## 8.1 统一术语表

只允许在 `00-memory-os-scope-and-principles.md` 中定义：

- memory
- recall
- notebook
- soul
- diary
- learning
- procedure
- automation owner

后续文档只能引用，不能重新定义。

## 8.2 单一事实源表

`01-memory-os-domain-model.md` 必须包含一张总表：

- 信息类型
- 所属 domain
- canonical owner
- canonical source
- 可写主体
- 可读主体

这张表是后续所有文档的基准。

## 8.3 生命周期统一

`02` 必须冻结唯一状态机：

- `candidate`
- `active`
- `warm`
- `cold`
- `archived`
- `invalidated`
- `purged`

后续文档不得新增平行状态，除非明确扩展并回写到 `02`。

## 8.4 统一场景走读

后续关键文档至少要覆盖同一组验证场景：

1. 用户多次重复问同一类问题
2. 用户纠正 agent 误记
3. 旧偏好被新偏好覆盖
4. agent 生成 learning candidate
5. agent 想创建 agent-owned automation
6. 用户暂停 agent-owned automation
7. 用户要求遗忘某类信息

如果某篇文档解释不通这几个场景，说明它没有闭环。

## 8.5 变更影响检查

每写完一篇文档，都要检查：

- 这篇变更会不会影响上游假设
- 这篇变更会不会让下游文档失效

尤其要重点盯住：

- owner_type
- source of truth
- lifecycle states
- approval levels
- runtime boundaries

## 9. 如何保证与 Nion 当前代码接轨

规格包不是悬空设计，必须持续对照当前代码现状。

当前明确已存在并可复用的主链路：

- `memory.json`
- `recall.sqlite3`
- OpenViking notebook chunk retrieval
- prompt injection
- automation runtime

因此规格包必须始终带着这三条约束：

1. 不把“未来目标”写成“当前现状”
2. 每份文档都要指出与当前代码的承接点
3. 每份文档都要避免把 LangGraph / daemon / automation 平行重做一套

## 10. 执行方式

从现在开始，按下面节奏推进：

1. 先写本计划
2. 立即开始 `00-memory-os-scope-and-principles.md`
3. 每完成一篇文档：
   - 做一致性自检
   - 更新 `README.md`
   - 再进入下一篇
4. 直到 `00-08` 冻结后，才开始 `09-memory-os-implementation-plan.md`

## 11. 当前执行决策

本轮执行只做两件事：

1. 保存这份规格包计划
2. 开始执行第一篇基础冻结文档：
   - `00-memory-os-scope-and-principles.md`

## 12. 结论

对 Nion 来说，正确路径不是：

- 继续发散想法
- 也不是立刻拆开发任务

而是：

**先把 Memory OS 的实施前置规格包系统化，再基于这组冻结文档生成正式实施方案。**
