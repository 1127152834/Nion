# Nion 记忆系统升级方向 V1

## 1. 一句话主张

Nion 下一轮记忆系统升级，应该从“结构化长期记忆 + 对话召回”升级为：

**面向单个用户的 Personal Memory OS**

它的核心不是让 agent 更“全能”，而是让 agent：

- 越来越懂这个用户
- 越来越会服务这个用户
- 越来越会自我维护和自我升级

## 2. 升级目标

结合你这次的要求，我认为目标应该明确成六件事。

### 2.1 形成真正的用户模型

不是只记住偏好，而是形成：

- 职位 / 角色
- 工作职责
- 工作节律
- 性格与沟通风格
- 兴趣与放松偏好
- 长期目标
- 高置信服务约束

### 2.2 形成 agent 自己的成长系统

agent 不只是被动应答，而是要有：

- diary
- reflection
- learning backlog
- learning plan
- service playbooks
- improvement proposals

### 2.3 形成后台自我维护回路

需要 heartbeat 驱动的后台 maintenance loop，负责：

- 反思最近服务质量
- 识别长期主题
- 发现该学什么
- 把经验沉淀成 procedure / skill
- 做记忆归档与淘汰

### 2.4 形成双轨自动化治理

自动化必须分两类：

1. **用户拥有的自动化**
   - 用户创建
   - 用户可编辑
2. **agent 拥有的自动化**
   - agent 自发创建
   - 用户只能启停
   - 用户不能直接改内容

### 2.5 形成记忆淘汰机制

长期不用的知识与偏好不能永远挂着，需要：

- 降权
- 归档
- 删除

### 2.6 形成记忆到能力的升级链

目标不是“记住用户”，而是：

**把记忆转成更好的服务。**

这条链应该是：

`interaction -> memory -> reflection -> plan -> skill/procedure -> automation/service behavior`

## 3. 目标架构

## 3.1 顶层结构

建议未来的 Memory OS 至少包含下面 8 层。

### A. Thread Working Memory

作用：

- 当前线程状态
- 当前任务 scratchpad
- 临时推理上下文

特点：

- thread-scoped
- 高速
- 可丢弃

### B. Continuity / Recall Memory

作用：

- 对历史对话做 thread/global recall
- 支撑连续聊天和最近上下文连接

特点：

- 以对话片段为主
- 偏 episodic
- 可检索不可长期常驻

### C. User Model Memory

作用：

- 用户长期 profile
- 稳定角色、偏好、工作方式、目标

建议子域：

- identity_profile
- work_profile
- communication_profile
- rhythm_profile
- interest_profile
- service_preferences

### D. Relationship Memory

作用：

- 用户与 agent 的互动边界
- 亲密度、主动性容忍度、教学容忍度

注意：

这类信息不能和普通 facts 混写，应单独治理。

### E. Knowledge / Asset Memory

作用：

- notebook、文档、资料、外部知识源

特点：

- 偏 material / reference
- 不默认等于 memory truth

### F. Agent Self Memory

作用：

- assistant diary
- reflection log
- service mistakes
- user feedback patterns
- self-improvement notes

这层是你要的“灵魂”和“成长感”的基础。

### G. Procedural / Skill Memory

作用：

- 从高频服务经验中沉淀出的稳定 procedure
- skill candidate
- reusable playbook

这层不再是“记住了一件事”，而是“学会了一种服务方式”。

### H. Automation Memory

作用：

- 自动化任务元数据
- 所属 owner
- 成败反馈
- 是否仍值得保留

## 3.2 每条记忆必须有统一元数据

无论未来底层是文档、JSON、SQLite、向量库还是图谱，建议每条 durable memory 都带上这些元信息：

- `memory_id`
- `domain`
- `owner_type`
  - `user`
  - `agent`
  - `shared`
- `scope`
  - `thread`
  - `session`
  - `user`
  - `agent`
  - `workspace`
- `memory_type`
  - `working`
  - `episodic`
  - `semantic`
  - `procedural`
- `confidence`
- `source_refs`
- `created_at`
- `updated_at`
- `last_used_at`
- `stale_after`
- `archived_at`
- `invalidated_at`
- `supersedes`
- `tags`

没有这些字段，后续的归档、淘汰、提炼、冲突处理都会很难做。

## 4. 关键机制设计

## 4.1 Heartbeat

Heartbeat 不是简单 cron。

它应该是 agent 的后台维护入口，至少负责：

- memory compaction
- stale memory scan
- user-model refinement
- learning candidate discovery
- automation candidate creation
- diary / reflection generation
- skill crystallization proposals

建议把 heartbeat 定义成：

**后台维护总线，而不是单一“定时跑一次 dream”。**

## 4.2 Soul

Soul 不应该继续只是静态 `SOUL.md` 文本。

建议未来拆成三层：

1. `core_soul`
   - 系统级、稳定、低频变更
2. `adaptive_soul_overlay`
   - 根据用户长期互动形成的风格和行为微调
3. `proposal_log`
   - 后台 maintenance 产生的人格/行为调整提案

也就是说，soul 需要从“静态 prompt 片段”升级成“版本化人格工件系统”。

## 4.3 Diary

Diary 是 agent 自己的日记，不是用户 notebook。

建议记录：

- 今天学到了什么
- 今天服务哪里做得不好
- 哪些用户需求是重复出现的
- 哪些知识值得系统学习
- 哪些自动化可能应该建立

Diary 的价值不是展示情绪，而是：

**作为 self-maintenance 的工作底稿。**

## 4.4 Learning Plan

当系统发现某类问题高频出现时，不应立即“学很多”，而应：

1. 识别主题
2. 判断是否长期
3. 建立 learning candidate
4. 排进 learning backlog
5. 由 heartbeat 逐步执行

学习计划必须与用户服务相关，而不是泛化为“什么都学”。

## 4.5 Memory -> Skill

你提的“记忆转 skill”我认为非常对。

建议定义一个 `skill crystallization pipeline`：

1. 高频服务场景被识别
2. 相关对话、笔记、成功案例被聚合
3. 生成 procedure draft
4. 经过多次复用验证
5. 升格为稳定 skill / playbook

这一步会让 agent 真正“能力成长”，而不是只“知道更多”。

## 4.6 Forgetting / Archive / Delete

建议把淘汰做成三级：

1. `active`
   - 正常参与检索和注入
2. `archived`
   - 不默认注入，但保留
3. `purged`
   - 真正删除

触发依据可以包括：

- 长期未使用
- 被更新事实覆盖
- 明显只是临时兴趣
- 用户目标已结束
- 学习主题不再相关

## 5. 自动化 ownership 设计

这部分必须明确。

## 5.1 User Automation

特征：

- 来源是用户明确创建或要求创建
- 用户可编辑
- 用户可停启
- 用户拥有完整控制权

## 5.2 Agent Automation

特征：

- 来源是 heartbeat / self-maintenance / learning planner
- 只服务 agent 自我维护或更好服务用户
- 用户只能启停
- 用户不能直接改 prompt / schedule / logic

如果用户不同意，就关掉；但不能把 agent 自发形成的内部维护任务随便改写成别的东西。

## 6. 数据形态建议

我建议不要押注单一底层，而是混合：

### 6.1 文档层

适合：

- soul
- diary
- learning plans
- procedural notes
- self-maintenance reports

### 6.2 结构化存储层

适合：

- user profile
- relationship state
- automation ownership
- lifecycle fields

### 6.3 检索层

适合：

- notebook / external documents
- episodic archives
- semantic search

### 6.4 图层

如果后面要做更强的关系和时间处理，可以逐步引入 temporal graph thinking，但不建议一开始就全盘图化。

## 7. 升级顺序建议

这里我只给研究阶段的方向顺序，不展开成 implementation plan。

### P0：先立中轴

1. 统一 memory domain model
2. 统一 memory metadata
3. 明确 user / agent / shared ownership
4. 明确 thread / session / user / agent scopes
5. 明确 notebook / memory / soul / automation 边界

### P1：补成长骨架

1. heartbeat runtime
2. self-maintenance service
3. diary / reflection artifacts
4. archive / delete lifecycle
5. agent automation ownership

### P2：补能力进化

1. learning backlog
2. learning plan execution
3. memory -> skill crystallization
4. adaptive soul overlay
5. stronger temporal invalidation

## 8. 最终判断

你要的不是“一个更会记东西的 agent”，而是：

**一个会围绕你这个人持续形成用户模型、持续优化服务方式、持续维护自己成长路线的长期 personal assistant。**

这件事成立的关键不在“记忆更多”，而在四个词：

- `ownership`
- `maintenance`
- `evolution`
- `governance`

只要这四个词立住，心跳、灵魂、自我升级、记忆转 skill、agent 自发自动化，都会自然变成同一套系统里的不同表象。
