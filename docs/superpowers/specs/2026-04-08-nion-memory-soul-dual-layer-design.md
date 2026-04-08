# Nion 双层记忆内核与灵魂系统重构设计

## 背景

Nion 当前的 Memory / Soul 体系已经具备一批可见表面：

- `/api/memory` 与 `/api/memory/growth` 的兼容 API
- `memory_os` 目录下的 models / repository / soul / growth / retention / automation bridge
- `/workspace/memory/*` 与 `/workspace/memory/growth` 等产品入口
- prompt 注入中的 memory block 与 soul runtime block

但这些能力尚未组成一个真正可长期运行的个人 agent 认知内核。当前问题不是“有没有 Memory OS 这个名字”，而是：

1. 长期记忆真相源不清晰
2. 自动写入链路不完整，且旧链路与新链路存在双轨风险
3. 证据、记忆、灵魂、procedure、relationship 的层次混在一起
4. 运行时仍然偏向把 active summary 直接拼进 prompt，而不是分层召回
5. 用户虽然能看到一些记忆表面，但还没有真正获得“可追溯、可改写、可回滚”的治理能力
6. 灵魂机制更接近 prompt 片段拼接，而不是稳定人格、关系姿态与短期适配的分层治理机制

用户对新系统的明确要求是：

- Nion 是 **单用户、单主智能体** 的个人 agent，不是多租户平台
- 子智能体本质上是执行器，可以读取记忆，但只能把候选和证据交给主智能体，不得直接写长期记忆
- 长期记忆默认自动写入，但必须由主智能体裁决升格
- 用户拥有长期记忆与灵魂层的**直接编辑权**，包括冻结、删除、改写
- 能利用现有可复用能力，但不能继续走补丁式改造路线
- 检索层希望采用**本地嵌入式向量能力**，同时支持第三方 embedding provider，面向普通用户的操作必须傻瓜化

同时，基于对 MemPalace 的研究，已经可以确认：

- MemPalace 不适合作为 Nion 的主记忆真相源
- MemPalace 非常适合作为 Nion 的 **原文证据层思想来源**，尤其是：
  - 分层加载
  - 结构化导航
  - 原文可回溯

因此，Nion 新的 Memory / Soul 体系必须从底层重新定义边界，但不是推倒重来，而是把现有可用骨架重新安置到正确层次。

## 目标

本设计的目标是把 Nion 的 Memory / Soul 从“功能集合”升级成一个真正的认知内核，并同时满足以下目标：

1. **自动记忆**：用户与主智能体的高价值互动能够自动进入长期认知体系
2. **证据可追溯**：任意一条长期记忆都能回答“为什么记住了这件事”
3. **用户可治理**：用户可以直接冻结、删除、改写具体记忆，也可以查看灵魂变化的原因
4. **主智能体主脑化**：子智能体只能读长期记忆、写 evidence/proposal，不得直接污染 canonical memory
5. **灵魂真正参与策略**：灵魂不仅影响语气和人设，还要影响“记什么、如何排序、如何遗忘”
6. **运行时分层召回**：每次回答只装配必要的热记忆与证据，而不是把长期仓库整包塞进 prompt
7. **本地优先**：默认本地可用、可下载本地 embedding 模型、可离线运行；同时支持远程增强 provider
8. **可迁移、可回滚**：新系统必须能通过 feature flag 和分阶段切流平滑接管旧系统

## 非目标

本设计明确不覆盖以下范围：

- 多用户、多租户、多 agent 团队共享记忆
- notebook 重新定义为 memory 真相源
- 把 MemPalace 直接接入为 canonical memory store
- 一次性大爆炸替换整个现有记忆系统
- 以向量数据库替代治理型主库
- 在第一阶段就引入复杂外部微服务依赖
- 直接重做前端视觉风格或 redesign 整个工作区壳

## 用户与产品定位

### 目标用户

- 单一普通用户
- 非技术用户也应能开启、使用、管理记忆系统
- 用户使用 Nion 作为长期陪伴与执行型个人 agent

### 主智能体定位

- 主智能体是唯一长期记忆拥有者
- 主智能体是唯一灵魂治理拥有者
- 主智能体是唯一长期理解的 canonical producer

### 子智能体定位

- 子智能体是执行器与观察者
- 子智能体可以读取长期记忆
- 子智能体只能写 `evidence` 和 `proposal`
- 子智能体不能直接写 `MemoryNode`、不能直接改 `Soul`

## 设计原则

### 1. 证据、记忆、灵魂必须彻底解耦

- `Evidence Vault` 保存“发生过什么”
- `Memory OS` 保存“主智能体现在认为什么是真的”
- `Soul Engine` 保存“主智能体应当以什么价值和关系姿态运作”

三者彼此耦合，但不共享真相源。

### 2. 自动写入发生在证据层，长期升格发生在裁决层

系统可以自动记录证据，但不能直接让原文跳成长期记忆。  
任何长期记忆都必须经过 `Memory Judge`。

### 3. 用户拥有治理权，但不直接改写事实层

用户可以冻结、删除、改写长期记忆和灵魂层。  
用户默认不直接编辑原始 evidence 文档；若删除原始 evidence，系统必须显式重评下游记忆。

### 4. 灵魂不是 prompt 装饰，而是记忆策略器

灵魂要影响：

- 信息敏感度
- 记忆升格概率
- 召回排序偏置
- 遗忘策略偏好

### 5. 真相源可持久，索引可重建，热层可变化

- canonical data 永远可持久
- FTS / 向量 / taxonomy 索引都可重建
- prompt hot layer 是运行时装配产物，不是长期真相

### 6. Session Policy 必须是一等公民

Nion 当前已经存在稳定运行时契约：

- `session_mode`
- `memory_read`
- `memory_write`

新系统必须把这组约束视为**架构层硬门**，而不是实现细节。后续所有 evidence capture、proposal、judge、Memory OS write 都必须先经过 session policy gate。

具体规则：

- `memory_write = true`
  - 允许 durable Evidence Vault write
  - 允许 proposal / judge / durable Memory OS write
- `memory_write = false`
  - 允许 session-local trace
  - 允许 ephemeral evidence，仅用于本轮运行
  - 禁止 durable Evidence Vault write
  - 禁止 Memory OS write
- `temporary_chat` 或其他 read-only session
  - 允许长期记忆读取
  - 允许本轮 runtime trace
  - 禁止 durable memory pollution
- embedded / scheduler / inherited runtime
  - 必须继承调用方传入的 `session_mode / memory_read / memory_write`
  - 不得自行放宽 durable write 权限

自动写入的真实含义应是：**所有会话都走统一写入流水线，但 durable 落盘由 session policy 决定。**

读取侧也必须服从同一组 runtime contract：

- `memory_read = true`
  - 允许 Runtime Memory Engine 读取长期 Memory OS
  - 允许读取 durable Evidence Vault
  - 允许执行 L0-L3 分层召回
- `memory_read = false`
  - 禁止读取长期 Memory OS
  - 禁止读取 durable Evidence Vault
  - 只允许使用本轮 session-local context、当前线程即时上下文和显式用户输入

因此，`memory_read` 与 `memory_write` 是相互独立的两个硬门：

- 可以 `read=true, write=false`
- 也可以 `read=false, write=false`
- 不允许在 spec 中默认把读取视为永远开放

### 7. 先可见，再可强

在全面切换自动写入和深度召回前，必须先建立：

- runtime trace
- decision audit
- evidence explorer
- memory ledger

否则系统越自动，错误只会积累得越快。

## 总体架构

### 总图

```text
User / Lead Agent / Subagents / Tools
        |
        v
  Evidence Capture
        |
        v
   Evidence Vault
   |     |      |
   |     |      +--> FTS Index
   |     +---------> Taxonomy Index
   +---------------> Vector Index
        |
        v
 Memory Extraction
        |
        v
   Memory Judge ---------> Soul Signal Extractor
        |                           |
        v                           v
     Memory OS <-------------- Soul Engine
        |
        v
 Runtime Memory Engine
        |
        v
 Prompt Section Assembly / Runtime Trace
        |
        v
      Answer
```

### 三层真相结构

```text
Layer A: Evidence Truth
  - 原始对话
  - 执行结论
  - 文件片段
  - 外部结果摘要

Layer B: Canonical Memory Truth
  - preference
  - habit
  - relationship
  - procedure
  - user model
  - soul-linked objects

Layer C: Runtime Assembly
  - constitution
  - hot memories
  - scoped recall
  - verbatim evidence
```

## 核心对象模型

## 1. Evidence Vault

### 1.1 EvidenceDocument

原始证据对象，是事实层最小真相单位。

建议字段：

- `evidence_id`
- `source_type`
  - `human_message`
  - `assistant_final`
  - `subagent_result`
  - `tool_summary`
  - `file_excerpt`
  - `external_result`
  - `system_event`
- `thread_id`
- `turn_id`
- `actor`
- `created_at`
- `content_raw`
- `content_normalized`
- `artifact_uri`
- `sensitivity`
- `retention_class`
- `durability_scope`
  - `session_ephemeral`
  - `durable_user_memory`
- `checksum`
- `metadata`

### 1.2 EvidenceChunk

Evidence 的检索单位，不是治理单位。

建议字段：

- `chunk_id`
- `evidence_id`
- `chunk_text`
- `chunk_summary`
- `tokens`
- `time_anchor`
- `topic_tags`
- `wing`
- `room`
- `importance_score`
- `embedding_ref`

### 1.3 EvidenceIndex

Evidence 的索引层，只负责找，不负责定义“什么是真的”。

组成：

- SQLite FTS5 词面索引
- taxonomy 导航索引
- 本地嵌入式向量索引
- 时间线索引

## 2. Memory OS

### 2.1 MemoryNode

长期记忆的稳定身份。

建议字段：

- `memory_id`
- `domain`
  - `user_model`
  - `relationship`
  - `learning`
  - `procedure`
  - `soul`
  - `automation_projection`
- `kind`
  - `preference`
  - `habit`
  - `profile`
  - `active_arc`
  - `boundary`
  - `identity_fact`
  - `reminder_rule`
  - `procedure_rule`
- `status`
  - `candidate`
  - `active`
  - `frozen`
  - `superseded`
  - `forgotten`
  - `archived`
- `stability`
  - `volatile`
  - `stable`
  - `core`
- `owner`
- `subject`
- `current_revision_id`
- `first_seen_at`
- `last_confirmed_at`
- `last_used_at`
- `salience_score`
- `confidence_score`
- `traceability_state`
  - `full`
  - `legacy_unverified`
  - `redacted`
  - `degraded`
- `user_override`
- `forget_policy`
- `read_policy`

### 2.2 MemoryRevision

MemoryNode 的一次版本，不允许原地覆盖。

建议字段：

- `revision_id`
- `memory_id`
- `claim`
- `structured_payload`
- `rationale`
- `created_by`
  - `lead_agent`
  - `user`
  - `system`
- `created_at`
- `supersedes_revision_id`

### 2.3 MemoryLink

连接记忆与记忆、记忆与证据。

关系包括：

- `supports`
- `contradicts`
- `derived_from`
- `supersedes`
- `triggered_by`
- `used_with`

### 2.4 MemoryDecision

记录这条记忆为何被接受、冻结、删除、降权、回滚。

作用：

- 自动写入审计
- 用户改写审计
- 决策可追溯

### 2.5 UserOverride

用户直接治理动作。

动作包括：

- `freeze`
- `delete`
- `rewrite`
- `restore`
- `downgrade_to_short_term`

### 2.6 LearningTopic

`learning` 在新 canonical 设计中继续保留为一等域，不并入 `procedure`。

它的职责应收敛为：

- 长期学习主题
- 长周期观察议题
- procedure 的上游输入之一
- soul reflection 的慢变量输入之一

迁移规则：

- 现有 `/api/memory/growth` 中的 `learning` 记录继续保留
- M2 backfill 时，现有 learning records 必须映射到 `MemoryNode.domain = learning`
- M9 之后，再稳定 `learning -> procedure / automation / soul reflection` 的投影关系

## 3. Soul Engine

### 3.1 Soul Constitution

最稳定的一层，包含：

- 基本价值观
- 服务哲学
- 人格底色
- 不可突破的边界

### 3.2 Soul Identity Narrative

长期自我叙事层，定义：

- “我是谁”
- “我如何帮助你”
- “我在这段长期关系中扮演什么角色”

### 3.3 Soul Relationship Stance

针对当前唯一用户的关系层，定义：

- 亲密度边界
- 称呼方式
- 主动性边界
- 情绪支持力度
- 提醒强度

### 3.4 Soul Adaptive Overlay

短中期适配层，定义：

- 当前阶段表达调整
- 当前阶段节奏调整
- 当前阶段提醒倾向
- 当前阶段支持方式偏置

### 3.5 SoulRevision

灵魂每次变化都以 revision 记录，不允许原地覆盖。

## 自动写入与主智能体裁决

## 1. 全链路

新系统采用 7 段式写入流水线：

1. `Capture`
2. `Segment`
3. `Extract`
4. `Judge`
5. `Consolidate`
6. `Project`
7. `Audit`

### 1.1 Capture

主智能体 turn 结束后，自动捕获：

- 用户消息
- 主智能体最终回复
- 子智能体任务结果摘要
- 工具执行精炼摘要
- 关键文件变更摘要
- 关键外部搜索结论摘要

但 capture 不得无条件 durable 落盘，必须先经过 **Session Memory Policy Gate**：

- 当 `memory_write = true` 时：
  - 允许写 durable `EvidenceDocument`
  - 允许后续 proposal / judge / durable Memory OS write
- 当 `memory_write = false` 时：
  - 只允许写 session-local trace 与 ephemeral evidence
  - 不允许写 durable Evidence Vault
  - 不允许写 Memory OS

这条规则是为了保留当前 `temporary_chat`、scheduler、embedded client 等路径已存在的会话隔离保证。

### 1.2 Extract

Extractor 输出三类结果：

- `Memory Proposal`
- `Soul Signal`
- `No-op`

Proposal 必须结构化，而不是一句 summary。

建议字段：

- `proposal_id`
- `proposed_domain`
- `proposed_kind`
- `candidate_claim`
- `candidate_payload`
- `supporting_evidence_ids`
- `estimated_stability`
- `estimated_salience`
- `estimated_confidence`
- `change_type`
  - `new`
  - `reinforce`
  - `revise`
  - `contradict`
  - `expire`
- `judge_hints`

### 1.3 Memory Judge

Judge 是唯一允许把 proposal 升格为长期记忆的模块。

Judge 需要判断：

- 这条候选值不值得长期化
- 它属于什么类型
- 是新建、强化、修订、替换还是驳回
- 是否与已有记忆冲突
- 是否受用户 override 约束
- 是否应触发 soul / procedure / relationship 投影

Judge 输出动作：

- `accept`
- `accept_as_revision`
- `reinforce_existing`
- `freeze_existing_and_replace`
- `reject`
- `defer`

### 1.4 记忆判定维度

Judge 的判定至少综合：

- `utility`
- `stability`
- `specificity`
- `evidence_strength`
- `identity_alignment`

其中 `identity_alignment` 必须受当前 Soul 层影响。

### 1.5 冲突处理

冲突不允许原地覆盖，只允许：

- `reinforce`
- `revise`
- `supersede`
- `invalidate`

### 1.6 用户 direct edit 融入 Judge

用户动作是 Judge 的硬约束：

- 用户冻结过的记忆，Judge 不得自动重新激活
- 用户改写过的记忆，Judge 后续必须优先参考用户 revision
- 用户删除 evidence 时，Judge 必须重评下游记忆强度

### 1.7 子智能体参与方式

子智能体可以：

- 写 evidence
- 提 proposal
- 提 soul signal

子智能体不能：

- 直接写 MemoryNode
- 直接改 Soul
- 直接强化 canonical 画像

## 运行时读取与 MemPalace 思想融合

## 1. 基本原则

运行时不再做“把所有 active summary 塞进 prompt”，而采用：

- 按层读取
- 按需召回
- 按问题装配

## 2. 四层读取模型

### L0: Constitution Layer

常驻极小层，包含：

- soul constitution
- 核心关系边界
- 少量 core 偏好

### L1: Canonical Memory Layer

稳定热层，包含：

- 高置信用户偏好
- 稳定习惯
- relationship stance
- relevant procedures
- identity narrative
- active overlay

### L2: Scoped Recall Layer

按 `wing / room / time / domain / kind` 收窄范围后进行 scoped recall。

`wing / room` 是借鉴 MemPalace 的**检索导航层**，不替代 governance domain。

### L3: Verbatim Evidence Layer

高成本深搜层，仅在以下场景启用：

- 历史追溯
- 记忆核验
- 记忆冲突排查
- 高风险回答
- 用户要求回顾原话或过去决策

## 3. Runtime Memory Engine

Runtime 阶段新增统一组件：

- `Intent Classifier`
- `Memory Depth Planner`
- `Candidate Retrieval`
- `Search Fusion / Ranking`
- `Prompt Context Assembly`
- `Runtime Trace Logger`

### 3.1 读取路径

每轮回答前：

1. 判定问题类型
2. 决定启用哪几层
3. 并行拉取：
   - Memory OS 热层候选
   - taxonomy route
   - FTS route
   - vector route
   - link route
4. 统一排序
5. 装配成 section 化 prompt block

### 3.2 排序因素

排序至少综合：

- `query_relevance`
- `stability`
- `salience`
- `freshness`
- `confidence`
- `soul_bias`

其中 `soul_bias` 表示灵魂层对召回优先级的偏置。

### 3.3 Prompt Sections

新的 memory/soul 注入建议拆分为：

- `<constitution>`
- `<relationship_stance>`
- `<identity_narrative>`
- `<hot_memories>`
- `<relevant_procedures>`
- `<scoped_recall>`
- `<verbatim_evidence>`

每个 section 必须有独立预算，不再共用一个粗糙的大 block。

## 灵魂机制重构

## 1. 灵魂的系统定义

灵魂不是记忆，也不是 prompt。  
灵魂是主智能体的：

- 长期价值约束
- 自我叙事
- 关系姿态
- 短期适配策略

## 2. 四层治理

### 2.1 Constitution

季度级变化，默认只读，高门槛治理。

### 2.2 Identity Narrative

月级变化，缓慢演化。

### 2.3 Relationship Stance

周级变化，由 relationship memory 稳定归纳。

### 2.4 Adaptive Overlay

天级或事件级变化，可过期、可回滚。

## 3. 灵魂演化链路

灵魂变化永远走：

`Evidence -> Memory Signals -> Soul Reflection -> Soul Proposal -> Soul Judge -> Soul Revision`

聊天文本不能直接修改灵魂层。

## 4. Soul Judge

Soul Judge 负责判断：

- 变化属于哪一层
- 是短期 overlay 还是长期 relationship stance
- 是否与 constitution 冲突
- 是否只是暂时情绪，不应长期化
- 是否已有类似 adaptation
- 是否应设置过期时间

输出动作：

- `accept_overlay`
- `extend_overlay`
- `promote_to_relationship_stance`
- `promote_to_identity_narrative`
- `reject`
- `expire_existing_overlay`

## 5. 灵魂反向影响记忆

灵魂必须反向影响：

- `Sensitivity`
- `Compression Style`
- `Recall Bias`
- `Forgetting Preference`

## 产品面与治理面设计

## 1. 总体原则

Memory Workspace 必须升级为治理控制台，而不是展示页。

用户必须同时具备：

- 可见性
- 可追溯性
- 可编辑性
- 可恢复性

## 2. 四大工作台

### 2.1 Memory Ledger

展示 canonical memory nodes，并支持：

- 冻结
- 删除
- 改写
- 查看 revision history
- 查看 evidence chain
- 查看使用记录

### 2.2 Evidence Explorer

浏览原始证据，支持按：

- 时间线
- wing
- room
- source_type
- thread
- actor
- 是否被某条记忆引用

### 2.3 Soul Console

按四层展示 soul：

- constitution
- identity narrative
- relationship stance
- adaptive overlay

支持：

- 查看当前版本
- 查看变化原因
- 编辑 relationship stance
- 编辑 overlay
- 回滚 recent adaptation
- 冻结某层不自动演化

### 2.4 Runtime Trace

展示每次回答使用的记忆与证据：

- 启用了哪些层
- 召回了哪些 memory
- 召回了哪些 evidence
- 哪些候选被排除
- 最终注入了哪些 sections

## 3. 用户编辑语义

用户改写不能只有一个“编辑”动作。

建议动作为：

- `纠正`
- `细化`
- `降级为短期`
- `彻底删除`
- `冻结不再自动改`
- `用我的版本替代系统版本`

## 4. 灵魂编辑语义

- Constitution：默认只读
- Identity Narrative：可编辑，但必须附理由
- Relationship Stance：常规可编辑
- Adaptive Overlay：可编辑、可过期、可回滚

## 存储、索引、生命周期与遗忘

## 1. 物理存储布局

本设计的物理布局应当**对齐现有 `Paths` 合约**，不再引入第三套脱离 `base_dir` 的 memory root。

Canonical root：

- `get_paths().memory_os_dir`
- 当前实现下即 `{base_dir}/memory-os`

在这个 root 下扩展子目录：

- `{memory_os_dir}/index.sqlite3`
- `{memory_os_dir}/evidence/`
- `{memory_os_dir}/indexes/fts/`
- `{memory_os_dir}/indexes/vector/`
- `{memory_os_dir}/artifacts/`

Desktop 场景下，`base_dir` 本身可能已落在 `~/.nion-data/...` 下；Web / test / embedded 场景则继续由 `Paths` 统一裁定。  
这里表达的是**逻辑布局**，不是要求额外创建一套平行于当前 `memory-os/` 的全新根路径。

## 2. 向量层

### 2.1 设计原则

- 向量层是检索增强层，不是长期记忆真相源
- SQLite 继续承担 canonical governance store
- 向量层采用本地嵌入式 sidecar，默认本地可用

### 2.2 Provider 设计

支持三类 provider：

- `local_managed`
- `remote_managed`
- `custom_compatible`

产品设置页只向普通用户暴露：

- `本机推荐`
- `云端增强`
- `高级自定义`

### 2.3 默认本地体验

- 第一次开启“智能记忆增强”时，后台自动下载默认轻量双语 embedding 模型
- 模型下载期间，系统继续走 taxonomy + FTS
- 模型就绪后，后台增量建立向量索引

### 2.4 可选增强

- 更高质量本地 embedding 模型作为增强包
- reranker 作为“高精度记忆检索”增强模式，不作为默认依赖

### 2.5 模型切换

每个模型必须生成 `model_fingerprint`：

- provider
- model_id
- dimensions
- normalization
- chunking_policy
- embedding_version

fingerprint 变化时：

- 后台重建向量索引
- 老索引保留到新索引完成
- 前台显示“记忆增强正在后台更新”

## 3. 生命周期

### 3.1 MemoryNode 生命周期

- `candidate`
- `active`
- `frozen`
- `superseded`
- `forgotten`
- `archived`

### 3.2 Evidence 生命周期

建议 retention class：

- `core`
- `supporting`
- `ephemeral`
- `sensitive`
- `derived_only`

### 3.3 删除语义

必须区分：

- `forget memory`
- `detach evidence`
- `purge evidence`
- `archive`

其中 `purge evidence` 不能等于“什么都不留的物理消失”。  
为了同时满足用户清除原始证据与系统最小审计能力，purge 后仍必须保留 **Evidence Tombstone**：

- `evidence_id`
- `source_type`
- `created_at`
- `deleted_at`
- `deleted_by`
- `checksum/digest`
- `redaction_reason`
- `affected_memory_ids`

purge 后的系统行为：

- evidence 原文内容被移除
- 下游 MemoryNode / MemoryRevision 的 `traceability_state` 必须转为 `redacted` 或 `degraded`
- Judge 不再把这类记忆视为 `full traceability`

因此，系统的承诺应是：**purge 之后保留最小证明壳，而不是继续假装拥有完整可追溯链。**

### 3.4 自动归档

自动归档不能只看 `updated_at`，还要综合：

- 使用频率
- 用户确认
- 证据强度
- 稳定性
- 下游依赖
- 当前主题活跃度

## 4. 可恢复性

系统必须支持：

- 索引重建
- 记忆 revision 回滚
- soul overlay 回滚

## 模块边界与实现切分

## 1. 核心模块

建议拆成 8 个核心模块：

1. `Evidence Capture`
2. `Evidence Vault`
3. `Memory Extraction`
4. `Memory Judge`
5. `Memory OS`
6. `Soul Engine`
7. `Runtime Memory Engine`
8. `Memory Governance UI`

## 2. 现有代码归类

### 2.1 直接保留并升级

- `memory_os/contracts.py`
- `memory_os/models.py`
- `memory_os/soul_artifacts.py`
- `memory_os/soul_runtime.py`
- `routers/memory.py`
- `routers/memory_growth.py`
- 前端 `/workspace/memory/*` 路由骨架

### 2.2 保留名字，重写内部

- `memory_os/repository.py`
- `memory_os/context_assembler.py`
- `continuity_middleware.py`
- `retention.py`
- `soul_governance.py`
- `memory_growth` 前后端实现

### 2.3 退役或降级兼容

- `memory_os/extractor.py`
- `memory_os/heartbeat.py`
- `memory_os/consolidation.py`
- 旧的 `agents/memory/*` summary-memory 主线职责

## 3. 新增目录建议

- `backend/packages/harness/nion/memory/evidence_capture/`
- `backend/packages/harness/nion/memory/evidence_vault/`
- `backend/packages/harness/nion/memory/extraction/`
- `backend/packages/harness/nion/memory/judge/`
- `backend/packages/harness/nion/memory/runtime_engine/`
- `backend/packages/harness/nion/memory/embedding/`
- `backend/packages/harness/nion/memory/search_fusion/`
- `backend/packages/harness/nion/memory/governance/`

## 4. API 切分

建议后端暴露：

- `/api/memory/ledger`
- `/api/memory/evidence`
- `/api/memory/runtime-trace`
- `/api/memory/soul`
- `/api/memory/settings`
- `/api/memory/admin`

### 4.1 现有产品契约兼容窗口

新增 API 不能直接替换当前产品面，必须把现有客户端硬编码依赖纳入显式迁移表。

当前必须继续稳定维护的契约包括：

- `/api/memory`
- `/api/memory/facts/*`
- `/api/memory/export`
- `/api/memory/growth`
- `/api/memory/growth/{memory_id}/freeze`
- `/api/memory/growth/{memory_id}/reject`
- `/api/memory/growth/{memory_id}/resume`
- `/api/memory/growth/{memory_id}/accept`
- `/api/memory/growth/user-model`
- `/api/memory/growth/user-model/{memory_id}/freeze`
- `/api/memory/growth/user-model/{memory_id}/forget`
- `/api/memory/growth/user-model/{memory_id}/reject`
- `/api/memory/growth/user-model/{memory_id}/correct`
- `/api/memory/growth/soul`
- `/api/memory/growth/soul/proposals`
- `/api/memory/growth/soul/proposals/{memory_id}/accept`
- `/api/memory/growth/soul/proposals/{memory_id}/reject`
- `/api/memory/growth/soul/events`
- `/api/memory/growth/soul/overlay/rollback`

迁移规则：

- **M0-M4**
  - 旧路由继续作为前端主入口
  - 新 `ledger / evidence / soul / runtime-trace / settings / admin` 路由并行建设
- **M5-M7**
  - 旧路由改由 v2 canonical store + compatibility adapter 驱动
  - payload 与前端行为保持稳定
  - mutation endpoints 也必须继续保持稳定语义，不允许先切读后切写导致治理动作失效
- **M8-M9**
  - 新 UI 面板逐步切到新路由
  - `/api/memory` 与 `/api/memory/growth/soul*` 继续作为兼容 facade 保留
  - `/api/memory/growth/*` 的 mutation facade 继续保留，直到前端所有治理动作迁移完成
- **M10**
  - 只允许退役旧内部实现
  - 不允许在缺少 adapter 的情况下直接删除产品契约

## 5. Runtime 插点

### 写入插点

主智能体 turn 完成后：

- evaluate session policy gate
- capture evidence
- generate proposals
- run Memory Judge
- write Memory OS
- emit audit log

### 读取插点

主智能体 model 调用前：

- evaluate `memory_read` gate
- run Runtime Memory Engine
- assemble sections
- inject traceable memory blocks

## 迁移路线与里程碑

## 迁移铁律

- 任一阶段最多只切一件大事：主写入或主读取，不能同时切
- 原始证据先落地，再谈长期记忆；长期记忆先稳定，再谈 soul 演化；soul 稳定后，再谈 procedure/automation 投影
- 向量检索绝不进入第一阶段关键路径
- 旧链路必须等新链路满足“可观测 + 可回滚 + 可审计”后再退役
- 用户纠错权必须早于自动写入全面放量

## 阶段总表

### M0：冻结边界与建立观测

目标：

- feature flags
- runtime trace
- memory audit log
- 兼容契约冻结

### M1：Evidence Vault 上线，但只做影子采集

目标：

- EvidenceDocument / EvidenceChunk
- 文档落盘
- FTS 索引
- 不接管主行为

Checkpoint 2026-04-08：

- canonical v2 tables landed：`MemoryNode / MemoryRevision / MemoryDecision / MemoryLink / UserOverride` 基础表结构已落地
- Evidence Vault exists：durable / ephemeral evidence 存储能力已存在
- session durability gates enforced：read-only / temporary session 不允许 durable evidence 或 Memory OS 写入
- ledger/evidence/runtime-trace read surfaces exist：已提供 ledger、evidence、runtime trace 的只读治理表面
- no primary read/write cutover yet：`/api/memory` 与 `/api/memory/growth*` 仍保持既有主读写路径，新 v2 能力尚未接管主读或主写

### M2：Canonical Memory v2 数据模型落地

目标：

- `MemoryNode / MemoryRevision / MemoryDecision / MemoryLink / UserOverride`
- 旧数据 backfill
- legacy adapter

补充要求：

- backfill 不允许伪造 evidence
- 对现有只有 summary / 稀疏 provenance 的 legacy 记录，必须显式落为：
  - `traceability_state = legacy_unverified`
  - `import_source = legacy_memory_os_record`
- 只有在后续 evidence re-anchor 成功后，才允许升级为 `traceability_state = full`

M2 的目标不是“让所有旧记录看起来像原生 v2 记录”，而是**如实导入并暴露证据缺口**。

Checkpoint 2026-04-09：

- canonical judge exists：M2 已具备 canonical proposal extraction、judge、revision、decision 主链路，canonical judge 不再只是影子判定器
- compatibility adapters back existing growth/soul routes：现有 `/api/memory/growth*` 与 soul 相关 mutation 路由继续保留外部契约，但底层由 v2 canonical compatibility adapter 承接
- user overrides are real canonical actions：`rewrite / freeze / delete` 不再只是 legacy 入口上的附加逻辑，而是写入 canonical `UserOverride` 与 revision/decision 治理链的真实动作
- `learning` remains first-class：`learning` 继续作为独立 canonical domain 存在，并维持对 growth 治理与后续 projection 的上游身份
- ledger/evidence governance UI exists：Memory Ledger 与 Evidence Explorer 已作为真实治理 UI 存在，用户可查看 canonical nodes、revision 细节、evidence chain 与治理入口
- verification evidence：2026-04-09 已先后通过后端 memory governance 相关 pytest（63 passed）与前端 memory ledger/evidence/home contract tests（9 passed），随后才更新本 checkpoint

说明：

- 下述 M3 / M4 / M5 是该设计文档早期对 Milestone B 内部能力的拆分草案
- 截至 2026-04-09，其中 canonical judge、governance UI、以及 v2-backed compatibility adapter 已随当前 M2 checkpoint 一并落地
- 因此后续小节保留其能力分解价值，但不应再被解读为“这些能力尚未存在”

### M3：新 Extractor + Proposal + Judge 进入影子裁决

目标：

- 新 extractor
- proposal pipeline
- Memory Judge shadow run
- judgment audit

### M4：用户治理台先上线，再放开新写入

目标：

- Memory Ledger
- Evidence Explorer
- 用户 freeze / delete / rewrite / restore

### M5：新写入链正式接管

目标：

- `Evidence -> Proposal -> Judge -> Memory OS` 正式成为主写入链
- 旧 extractor / queue / summary 主线停止接管 canonical memory

### M6：Runtime Memory Engine 接管读路径

目标：

- L0/L1 热层读路径接管
- Runtime Trace 上线
- 旧 continuity 保留 fallback

### M7：向量层与 L2/L3 Recall 上线

目标：

- 本地 embedding provider
- VectorIndexStore
- taxonomy + FTS + vector + fusion
- L2 scoped recall
- L3 verbatim evidence recall

### M8：Soul Engine 切换到新治理模型

目标：

- 四层 soul
- Soul Judge
- soul bias 接入 Judge 与 runtime ranking
- Soul Console 接管旧 surfaces

### M9：Procedure / Automation Projection 迁移

目标：

- procedure 由 canonical memory + evidence 派生
- automation projection 由新 Memory OS 派生
- provenance 全链路可追溯

### M10：退役旧链路与清债

目标：

- 退役旧 extractor / queue / summary 主线
- 保留必要 compatibility adapter
- 清理废旧 schema / prompt / 假语义页面

## 验收指标

### 1. 数据正确性

- 任意一条 **v2 原生长期记忆** 都能追到 `evidence -> proposal -> judge -> revision`
- 任意一条 backfill 导入记忆都必须显式标注 `traceability_state`，不得伪装成 full traceability
- 任意一条 soul 变化都能追到 `memory -> soul signal -> soul decision -> active layer`
- 用户删除、冻结、改写均对运行时产生正确影响

### 2. 系统稳定性

- 向量层关闭后系统仍可运行
- FTS / 向量索引可重建
- 索引重建不阻塞主对话
- 读写切流可单独回滚

### 3. 自动写入质量

- `reinforce / revise` 比例高于“无脑新增”
- 明显错误记忆率显著下降
- 同义表达不会产生大量重复记忆
- 已被用户否定的记忆不会重复自动激活

### 4. 运行时质量

- L0/L1 热层命中率提升
- 历史追溯问题可命中 L3 证据层
- runtime trace 可解释为何使用某条记忆

### 5. 产品可治理性

- 用户可在 3 步内找到一条记忆并改写
- 用户可在 3 步内看到该记忆来源证据
- 用户可在 3 步内回滚一条 recent overlay
- 普通用户可在 1 分钟内启用本地智能记忆增强

## 风险清单

### 风险 1：自动写入过早放量

应对：

- 先 shadow
- 再小流量接管主写入
- 治理台先于正式写入切主

### 风险 2：双真相源长期并存

应对：

- 定义旧链路退役点
- 所有新功能不得继续接旧 summary 主线

### 风险 3：向量层喧宾夺主

应对：

- 向量层永远是增强层，不是 canonical store
- 向量相关指标与记忆正确性指标分开评估

### 风险 4：灵魂层过早切换

应对：

- soul 切换放到 M8
- constitution 默认只读

### 风险 5：UI 先漂亮，治理没做透

应对：

- 先做 ledger / evidence / trace / override
- 再做体验打磨

### 风险 6：删除语义不清

应对：

- 严格区分 forget / detach / purge / archive
- 删除前显示影响范围

## 结论

Nion 的最佳路线不是继续补丁式增强现有 Memory/Soul，而是采用 **双层记忆内核**：

- `Evidence Vault` 作为原始证据真相源
- `Memory OS` 作为治理后长期理解真相源
- `Runtime Memory Engine` 作为分层召回与 prompt 装配中轴
- `Soul Engine` 作为记忆策略与人格演化上位层

这条路线既复用当前已有骨架，也明确淘汰概念正确但实现不合格的模块，能够在不推翻整个 Nion 的前提下，把 Memory / Soul 从“半成品功能集合”升级成真正可长期运行的个人 agent 认知内核。
