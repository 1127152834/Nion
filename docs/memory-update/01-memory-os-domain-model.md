# Memory OS Domain Model

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第二篇。

它负责冻结：

- domain model
- owner model
- scope model
- memory type model
- lifecycle vocabulary
- source of truth / canonical source

它**不**负责：

- 具体 candidate 晋升规则
- 具体数据表字段
- 具体运行时流水线
- 具体 UI 交互

这些分别留给后续文档。

## 2. Inputs

本篇依赖：

- [00-memory-os-scope-and-principles.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/00-memory-os-scope-and-principles.md)
- [current-memory-system-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/current-memory-system-audit.md)
- [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)

## 3. Decisions

本篇冻结以下决策：

1. Memory OS 的核心 domain 固定为 8 个主域。
2. 每类信息只能有一个 canonical source，不允许多域并列为真。
3. `Notebook` 不属于 Memory domains，但可以被 Memory OS 投影和引用。
4. `Soul`、`Diary`、`Learning Plan`、`Procedure` 都是一等 memory artifacts，不再降级成普通 facts。
5. `Recall` 是 evidence domain，不是 truth domain。
6. `Relationship` 与 `User Model` 分离，避免互动约束与世界事实混写。
7. `Automation` 作为执行系统独立存在，但其 owner/provenance 进入 Memory OS domain model。

## 4. Domain Taxonomy

## 4.1 顶层主域

Memory OS 顶层主域冻结为：

1. `recall`
2. `user_model`
3. `relationship`
4. `knowledge_projection`
5. `agent_self`
6. `procedure`
7. `soul`
8. `learning`
9. `automation_projection`

说明：

- 这里把原架构稿里的 `automation` 明确成 `automation_projection`，因为 automation executor 本体不归 Memory OS 所有，Memory OS 只治理它的 owner/provenance/value。

## 4.2 各域定义

### A. `recall`

**定义：**

- 对话历史和交互片段的可检索证据层

**它是什么：**

- episodic evidence
- continuity substrate

**它不是什么：**

- 用户长期 truth
- agent 自我成长工件

### B. `user_model`

**定义：**

- 关于用户长期稳定特征的结构化模型

**它是什么：**

- role / work / goals / style / rhythm / preferences

**它不是什么：**

- 临时上下文
- 单次事件片段
- diary

### C. `relationship`

**定义：**

- 用户与 agent 之间的互动边界、许可、容忍度与关系约束

**它是什么：**

- initiative policy
- teaching tolerance
- warmth preference
- interruption preference

**它不是什么：**

- 用户世界事实
- agent personality 本体

### D. `knowledge_projection`

**定义：**

- 用户资产、文档、外部资料在 Memory OS 中的检索投影

**它是什么：**

- notebook chunk index
- resource index
- extractable projection layer

**它不是什么：**

- canonical notebook body
- truth domain

### E. `agent_self`

**定义：**

- agent 自己的经验、反思、失误、启发、成长记录

**它是什么：**

- diary
- reflection
- postmortem
- heuristics

**它不是什么：**

- 用户笔记
- 用户 profile

### F. `procedure`

**定义：**

- agent 从重复服务中沉淀出的可复用方法

**它是什么：**

- playbook
- checklist
- recipe
- skill candidate

**它不是什么：**

- 一次性事实
- 任意 diary 片段

### G. `soul`

**定义：**

- agent 的身份、行为基线与经批准的适应性风格层

**它是什么：**

- core soul
- adaptive overlay
- soul proposals

**它不是什么：**

- relationship rules
- user preference facts

### H. `learning`

**定义：**

- agent 面向当前用户服务质量而进行的主题学习系统

**它是什么：**

- learning candidates
- backlog
- plans
- notes

**它不是什么：**

- 任意开放探索
- 无边界长期研究库

### I. `automation_projection`

**定义：**

- automation system 中与长期价值、owner、来源、保留策略相关的投影层

**它是什么：**

- user-owned vs agent-owned metadata
- provenance linkage
- retention policy

**它不是什么：**

- scheduler 本体
- executor 本体

## 5. Owner Model

## 5.1 owner_type 枚举

owner_type 冻结为：

- `user`
- `agent`
- `shared`
- `system`

## 5.2 各 owner 的语义

### `user`

- 用户拥有最终控制权
- 用户可读
- 用户通常可编辑/删除

典型对象：

- notebook assets
- user-owned automation

### `agent`

- agent 负责生成和维护
- 用户不直接编辑内部内容
- 用户拥有启停、冻结、纠正等上位控制权

典型对象：

- diary
- reflection
- learning plans
- procedure drafts

### `shared`

- 用户和 agent 都会消费
- 但不意味着双方都可同权编辑

典型对象：

- 某些长期工作画像
- 某些可被用户确认的服务偏好

### `system`

- 运行时或平台级对象
- 不表现为用户资产

典型对象：

- provenance logs
- internal access records

## 6. Scope Model

scope 冻结为：

- `thread`
- `session`
- `user`
- `agent`
- `workspace`
- `project`

## 6.1 各 scope 的定义

### `thread`

- 单条会话线程

### `session`

- 一次连续交互窗口

### `user`

- 跨线程、跨任务仍成立的用户级范围

### `agent`

- agent 自身长期内部状态范围

### `workspace`

- 当前工作空间内成立的知识或经验

### `project`

- 某个明确项目对象内成立的上下文与经验

## 6.2 Scope 约束

1. `thread/session` 级对象默认不得直接晋升为 user-level truth。
2. `workspace/project` 级经验默认不自动外溢到 global user model。
3. `agent` 级 artifacts 默认不暴露给用户作为可编辑正文。

## 7. Memory Type Model

memory_type 冻结为：

- `working`
- `episodic`
- `semantic`
- `procedural`

## 7.1 类型定义

### `working`

- 为当前推理和任务服务的短暂记忆

### `episodic`

- 具体事件、具体对话、具体案例

### `semantic`

- 经抽象后稳定成立的事实、偏好、知识

### `procedural`

- 可复用方法、流程、服务套路

## 7.2 类型约束

1. `working` 不直接成为长期 truth。
2. `episodic` 可以成为 `semantic` 或 `procedural` 的证据。
3. `procedural` 必须有 repeated evidence，不允许单次事件直接晋升。

## 8. Lifecycle Vocabulary

本篇只冻结生命周期词汇，不定义具体转移规则。

统一状态词汇为：

- `candidate`
- `active`
- `warm`
- `cold`
- `archived`
- `invalidated`
- `purged`
- `superseded`

说明：

- `superseded` 是覆盖关系标记，不是所有对象都必须使用。
- `candidate` 是 pre-truth 阶段。
- `invalidated` 表示“不再成立”，不是“物理删除”。

## 9. Canonical Source Rules

这是本篇最关键的部分。

## 9.1 单一事实源原则

每类信息只能有一个 canonical source。

允许：

- 多处引用
- 多处投影
- 多处检索

不允许：

- 多处并列为 truth

## 9.2 Canonical Source Matrix

| 信息类型 | 所属 domain | canonical source | owner_type | primary writer | primary consumers |
|---|---|---|---|---|---|
| 用户笔记正文 | 不属于 Memory domain | Notebook files | `user` | user | user, retrieval pipeline |
| 对话片段 | `recall` | recall archive | `system` | post-turn capture | continuity, consolidation |
| 用户长期职业/目标/偏好 | `user_model` | memory metadata store + model artifacts | `agent/shared` | consolidation engine | chat context, learning planner |
| 互动容忍度/主动性边界 | `relationship` | relationship records | `agent/shared` | consolidation engine + explicit correction path | runtime policy, interaction layer |
| Notebook 检索投影 | `knowledge_projection` | projection index | `system` | indexer | retrieval/context assembly |
| diary / reflection | `agent_self` | agent-self artifacts | `agent` | self-maintenance | self-maintenance, learning planner |
| procedure / skill draft | `procedure` | procedure artifacts | `agent` | crystallization pipeline | runtime, automation suggestions |
| core soul | `soul` | core soul artifact | `system/agent` | product/runtime owner | prompt runtime |
| adaptive overlay | `soul` | approved overlay artifact | `agent` | soul maintenance pipeline | prompt runtime |
| learning backlog/plan | `learning` | learning artifacts | `agent` | learning planner | heartbeat, review surfaces |
| automation ownership/provenance | `automation_projection` | automation metadata projection | `agent/shared` | automation governance layer | automation UI, maintenance runtime |

## 10. Domain Boundary Rules

## 10.1 `user_model` vs `relationship`

如果一条信息描述的是：

- 用户是谁
- 用户做什么
- 用户偏好什么

则进入 `user_model`。

如果一条信息描述的是：

- 用户允许 agent 多主动
- 用户是否喜欢被提醒
- 用户是否喜欢教学式输出

则进入 `relationship`。

## 10.2 `relationship` vs `soul`

`relationship` 描述的是用户侧约束。  
`soul` 描述的是 agent 侧人格与行为基线。

用户喜欢简洁，是 `relationship`/`user_model` 证据。  
agent 因此形成“默认结论先行”的行为，是 `soul overlay` 结果。

两者不能写成同一记录。

## 10.3 `agent_self` vs `procedure`

Diary / reflection 中记录“今天这样回答更好”时，它还属于 `agent_self`。

只有当这种经验经过重复验证并稳定下来，才进入 `procedure`。

## 10.4 `learning` vs `procedure`

`learning` 关注的是“该学什么、如何学”。  
`procedure` 关注的是“已经学会了什么服务方式”。

二者不应混写。

## 10.5 `knowledge_projection` vs `user_model`

从 notebook 中抽到的材料，默认先进入 `knowledge_projection`。

只有经过 consolidation，才可能形成 `user_model` 事实。

## 11. Rules / Contracts

本篇冻结以下硬性合同：

1. 所有后续文档必须复用本篇的 domain / owner / scope / type / lifecycle 词汇。
2. 不允许新增平行顶层 domain，除非回写本篇。
3. 不允许在后续文档中把 Notebook 改写为 Memory canonical source。
4. 不允许把 `recall` 直接当作 truth domain。
5. 不允许把 `relationship`、`soul`、`user_model` 混成一个 profile。
6. 不允许把 automation executor 本体归到 Memory OS 域内。

## 12. Impacts

本篇会直接约束：

- `02-memory-os-business-rules.md`
- `03-memory-os-data-contracts.md`
- `04-memory-os-runtime-flows.md`
- `05-memory-os-governance-and-permissions.md`
- `06-memory-os-interaction-model.md`
- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 13. Open Questions

本篇刻意留空的问题：

1. 哪些 business signals 触发 `candidate`
2. 哪些 evidence 足以把 `agent_self` 经验升格到 `procedure`
3. `shared` owner 的编辑权矩阵怎么定义
4. `project` 是否需要独立 artifact root
5. `automation_projection` 是否要拆成 `user_job_projection` 与 `agent_job_projection`

这些放到后续文档继续冻结。

## 14. 结论

从这篇开始，Memory OS 不再是一个泛泛的“大记忆系统”概念，而是一个有清晰边界的域模型。

后续所有规则、结构、时序、迁移、交互都必须围绕这张 domain map 展开。
