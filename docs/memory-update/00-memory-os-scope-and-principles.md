# Memory OS Scope And Principles

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第一篇。

它只做四件事：

1. 定义 Memory OS 的目标范围
2. 定义不在本期范围内的内容
3. 冻结核心术语
4. 冻结全套规格包后续必须遵守的原则

它**不**定义：

- 具体数据结构
- 具体运行时流水线
- 具体 UI 页面
- 具体实施任务拆分

这些会在后续文档里继续冻结。

## 2. Inputs

本篇的上游输入是：

- [current-memory-system-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/current-memory-system-audit.md)
- [mature-memory-systems-matrix.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/mature-memory-systems-matrix.md)
- [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)
- [specification-package-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/specification-package-plan.md)

## 3. Decisions

本篇冻结以下关键决策：

1. Nion 的目标不是“更大的 memory store”，而是 `Personal Memory OS`。
2. Memory OS 服务对象是**单个用户**，不是多租户 bot 平台。
3. Memory OS 是通用个人办公 agent 基础设施，不是 code agent 专属系统。
4. Notebook、Memory、Soul、Learning、Automation 必须严格分域。
5. 长期记忆写入采用 `candidate-first, consolidate-later`。
6. agent 可以成长，但必须被治理。

## 4. Scope

## 4.1 本期 Memory OS 包含什么

本期 Memory OS 包含以下系统能力：

### A. 用户长期理解

- 用户角色、工作、偏好、节律、目标的长期模型

### B. 连续性记忆

- thread/session continuity
- recall retrieval
- 最近上下文衔接

### C. Agent 自我维护

- diary
- reflection
- learning backlog
- learning plan
- growth proposals

### D. 经验升级

- procedure crystallization
- skill candidate formation
- automation candidate formation

### E. 记忆生命周期

- candidate
- consolidation
- invalidation
- archive
- purge

### F. 治理与权限

- user-owned vs agent-owned
- 可见性
- 可控制性
- approval / suggestion / auto-run 等级

## 4.2 本期不包含什么

以下内容不属于本期 Memory OS 核心范围：

### A. Notebook 产品重设计

Notebook 是输入资产源和索引源，但不是本轮的主要产品重设计对象。

### B. 全量图数据库架构

Memory OS 的 schema 要 graph-ready，但本期不做 graph-first 实现。

### C. 多租户 bot 平台

本期目标是个人 assistant，不是 multi-bot / multi-user control plane。

### D. Marketplace / Plugin 商业层

即便未来 memory 可以沉淀成 skill，本期也不做 marketplace 级能力。

### E. 完整组织记忆云服务

本期优先 desktop-first、local-first，不做云中心托管优先架构。

## 5. 核心术语表

这份术语表是后续文档唯一允许引用的基准定义。

## 5.1 Memory

`Memory` 指 agent runtime 可以消费、更新、治理的长期认知层信息。

它不是简单文件集合，也不是所有资料的总称。

## 5.2 Recall

`Recall` 指对历史对话片段的可检索连续性记忆。

它是 evidence layer，不等于 user model。

## 5.3 Notebook

`Notebook` 指用户拥有的个人知识与工作材料库。

它是用户资产，不是 agent memory 的 canonical source。

## 5.4 Soul

`Soul` 指 agent 的人格/行为工件层。

它包含：

- core identity
- adaptive behavior overlay
- soul proposals

它不是普通 fact，也不是任意自动改写的 prompt 文本。

## 5.5 Diary

`Diary` 指 agent 的自我记录工件。

它记录：

- 发生了什么
- 学到了什么
- 做错了什么
- 后续该学什么

Diary 面向 self-maintenance，不是用户 notebook。

## 5.6 Learning

`Learning` 指 agent 为了更好服务当前用户而进行的受约束的补课与积累。

它不是无边界的自我进化。

## 5.7 Procedure

`Procedure` 指从重复服务经验中沉淀出的可复用服务方法。

它是 skill 的上游形态，不是单条 memory。

## 5.8 User-Owned Automation

由用户明确创建、可被用户编辑和删除的自动化。

## 5.9 Agent-Owned Automation

由 agent 自发形成、服务于自我维护或更好服务用户的自动化。

用户只能启停，不能直接编辑内部逻辑。

## 5.10 Candidate

`Candidate` 指从对话、资料、运行结果中提取出的候选长期记忆。

它还不是真实长期 truth。

## 5.11 Consolidation

`Consolidation` 指将 candidate 变成 durable memory 的过程。

它至少包括：

- 去重
- 冲突检查
- 置信度校准
- 覆盖旧事实或保留历史

## 6. Memory OS 的产品定位

Memory OS 的产品定位不是：

- “更聪明的记忆设置页”
- “一个更大的向量库”
- “一个更会聊天的 companion gimmick”

它的产品定位应是：

**Nion 作为个人办公 AI agent 的长期认知与自我维护基础设施。**

这意味着它要同时服务：

- 当下任务质量
- 长期用户理解
- agent 自我成长
- 长期服务能力沉淀

## 7. 核心原则

## 7.1 通用办公优先

Memory OS 必须优先服务 Nion 的通用个人办公 agent 目标。

任何只强化 code agent 身份、却不能增强办公场景能力的设计，都不能占据 P0。

## 7.2 Local-First And User Trust First

默认优先：

- 本地所有权
- 可审计
- 可冻结
- 可回滚

如果用户不信任这套系统，再强的 memory 也没有意义。

## 7.3 Notebook 与 Memory 严格分离

Notebook 是用户资产。  
Memory 是 agent cognition。  
二者可以连接，不能混同。

## 7.4 Candidate First

长期记忆不是 turn 结束时直接生成的。

turn 结束时只产生 `candidate`。  
长期 truth 必须经过 `consolidation`。

## 7.5 State Is Not Memory

线程状态、当前任务上下文、工具返回结果不自动等于长期记忆。

否则系统一定会积累大量噪音。

## 7.6 Artifact-Backed Self Growth

agent 的成长材料必须 artifact 化，包括：

- soul
- diary
- learning plan
- procedures
- postmortems

它们不能退化成不可解释的内存黑盒。

## 7.7 Governance Before Autonomy

agent 可以有成长能力，但治理优先于自主性。

这意味着：

- 先定义权限等级
- 再定义自动行为

而不是反过来。

## 7.8 Time Matters

长期记忆必须有时间语义。

至少要支持：

- 何时生效
- 何时被覆盖
- 何时失效
- 何时归档

## 7.9 Procedure Over Trivia

Memory OS 的终局不是“知道更多”，而是“服务更强”。

因此系统要优先把长期重复价值沉淀成：

- procedure
- skill candidate
- automation candidate

而不是无限扩张 facts。

## 7.10 Runtime Contract Over Prompt Tricks

Memory OS 不应该主要靠 prompt 文案维持。

它必须建立在：

- structured contracts
- lifecycle
- runtime flows
- governance

之上。

这点与 Claude Code operating model 的借鉴方向一致：

先中轴 contract，再补表层能力。

## 8. Memory OS 与其他系统的边界

## 8.1 与 LangGraph 的边界

LangGraph 负责：

- thread state
- checkpointer
- graph orchestration
- middleware interception

Memory OS 负责：

- 长期认知语义
- candidate / consolidation / lifecycle
- self-maintenance
- provenance / ownership / governance

结论：

**Memory OS 不应平行重做 LangGraph 的状态与编排。**

## 8.2 与 Automation 的边界

Automation 负责：

- durable job definition
- scheduling
- execution
- runs / status

Memory OS 负责：

- 为什么产生这个 job
- 它属于谁
- 用户能否编辑
- 它是否还值得存在

结论：

**Memory OS 治理 automation 的 owner 与来源，不重做 automation executor。**

## 8.3 与 Notebook 的边界

Notebook 负责：

- 用户笔记与资料本体

Memory OS 负责：

- 索引投影
- 抽取候选
- 引用 provenance

## 8.4 与 Prompt Runtime 的边界

Prompt runtime 负责：

- session-specific context assembly
- dynamic injection boundary

Memory OS 负责：

- 提供被注入的结构化 context pack

## 9. Impacts

本篇冻结后，将直接约束下面几篇文档：

- `01-memory-os-domain-model.md`
- `02-memory-os-business-rules.md`
- `03-memory-os-data-contracts.md`
- `04-memory-os-runtime-flows.md`
- `05-memory-os-governance-and-permissions.md`
- `06-memory-os-interaction-model.md`
- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 10. Open Questions

本篇刻意不回答的问题：

1. 哪些具体字段进入 Memory Record
2. candidate 的精确晋升阈值
3. approval level 的完整矩阵
4. diary / soul / learning 的具体前台交互方式
5. 与现有 `memory.json` 的精确迁移步骤

这些会在后续文档里继续冻结。

## 11. 结论

从这一篇开始，后续所有规格都必须围绕一个统一判断展开：

**Nion 正在建设的不是“记忆功能”，而是一套 Personal Memory OS。**

它的目标不是存更多，而是：

- 更懂用户
- 更稳地服务用户
- 更可治理地成长
