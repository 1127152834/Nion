# Nion Personal Memory OS 最终架构方案

## 1. 总判断

我认为 Nion 的最终可行方案已经可以确定为：

**一个本地优先、分 owner、分 scope、分时态、分热路径/后台路径的 Personal Memory OS。**

它不是单个数据库，不是单个向量库，也不是 `memory.json 2.0`。

它是一套统一系统，负责：

- 理解这个用户
- 维护 assistant 自己的成长
- 把高频经验升级成更强的服务能力
- 在不失控的前提下运行 heartbeat、自我学习与 agent-owned automation

## 2. 设计原则

## 2.1 先中轴，后特性

先立：

- domain model
- owner model
- scope model
- lifecycle model

再补：

- heartbeat
- diary
- soul evolution
- learning plan
- memory -> skill

## 2.2 Notebook 不是 Memory

Notebook 始终是用户资产。

它可以被索引、引用、抽取，但不是 agent memory 的 canonical store。

## 2.3 Agent 内部成长材料必须 artifact 化

下面这些都不能只当 JSON facts：

- soul
- diary
- learning plan
- procedures
- postmortems

它们必须是版本化工件。

## 2.4 长期记忆必须经过 consolidation

对话之后可以抽取 candidate，但不能立刻把所有内容写成 truth。

真正的长期记忆必须经过：

- extraction
- consolidation
- invalidation / supersede

## 2.5 Agent 自发成长必须被治理

agent 可以：

- 学
- 记
- 反思
- 建自动化

但这些都必须有：

- ownership
- provenance
- access control
- start/stop governance

## 3. 顶层模型

## 3.1 四个正交维度

未来所有 durable memory 都统一落在四个维度上：

### A. `domain`

- `user_model`
- `relationship`
- `recall`
- `knowledge_projection`
- `agent_self`
- `procedure`
- `automation`
- `soul`
- `learning`

### B. `owner_type`

- `user`
- `agent`
- `shared`
- `system`

### C. `scope`

- `thread`
- `session`
- `user`
- `agent`
- `workspace`
- `project`

### D. `memory_type`

- `working`
- `episodic`
- `semantic`
- `procedural`

这四维不分清，后面的心跳、灵魂、自动化都会乱掉。

## 3.2 统一 Memory Record 元数据

建议所有 durable memory 统一拥有下面字段：

```json
{
  "memory_id": "mem_xxx",
  "domain": "user_model",
  "subtype": "communication_preference",
  "owner_type": "agent",
  "scope": "user",
  "memory_type": "semantic",
  "subject_id": "user:default",
  "target_id": "agent:main",
  "confidence": 0.91,
  "salience": 0.84,
  "status": "active",
  "language": "zh-CN",
  "source_refs": ["thread:abc#msg_14", "notebook:people/leader.md"],
  "artifact_uri": "nion://memory/user-model/communication/preference.md",
  "structured_payload": {},
  "created_at": "2026-04-04T10:00:00Z",
  "updated_at": "2026-04-04T10:00:00Z",
  "last_used_at": "2026-04-04T10:10:00Z",
  "valid_from": "2026-04-04T10:00:00Z",
  "invalid_at": null,
  "archived_at": null,
  "supersedes": [],
  "provenance": {
    "source_type": "conversation",
    "generated_by": "post_turn_extractor"
  }
}
```

## 4. 领域架构

## 4.1 Working Memory

### 作用

- 当前线程状态
- 当前任务上下文
- 临时工具结果
- 当前 focus

### 载体

- LangGraph thread state / checkpointer
- sandbox 当前工作上下文

### 规则

- 不进入 durable truth
- 生命周期最短

## 4.2 Recall Domain

### 作用

- 保存原始/半原始对话片段
- 支撑 continuity retrieval

### 当前承接

- 直接复用 `recall.sqlite3`

### 必须升级

- 中文检索能力
- 混合检索
- last_used/update metrics

### 生命周期

- `hot -> warm -> archived`

Recall 不是 user model，但它是 user model 和 diary 的证据层。

## 4.3 User Model Domain

这是未来最核心的长期用户模型。

### 子域

- `identity_profile`
- `work_profile`
- `communication_profile`
- `rhythm_profile`
- `interest_profile`
- `service_preference_profile`
- `goal_profile`

### 示例

- 用户是财务负责人
- 用户周报偏好结论先行
- 用户习惯中文、直接、少废话
- 用户每月月底有报表/分析节律

### 规则

- 只保存 durable 且跨场景仍成立的信息
- 所有写入先经 consolidation

## 4.4 Relationship Domain

这个域单独存在，不与普通 user facts 混写。

### 子域

- `initiative_policy`
- `teaching_tolerance`
- `warmth_preference`
- `nickname_policy`
- `interruption_preference`

### 为什么独立

因为这些不是世界知识，而是 interaction contract。

## 4.5 Knowledge Projection Domain

### 作用

- 把 Notebook / 文档 / 工作资料索引成可检索投影

### canonical ownership

- canonical source 仍是 notebook / file system
- memory 只保留投影、索引、抽取结果

### 当前承接

- OpenViking chunk store

### 未来升级

- richer metadata
- project/entity linking
- provenance surfacing

## 4.6 Agent Self Domain

这是 Nion 作为陪伴型 assistant 必须拥有的一层。

### 子域

- `diary`
- `reflection`
- `service_mistakes`
- `heuristics`
- `project_operating_notes`
- `growth_milestones`

### canonical form

- markdown artifacts + indexed metadata

### 示例

- 今天用户连续三次问财务汇报结构，说明该主题应升为学习候选
- 今天回答过于泛泛，被用户纠正了
- 针对这类用户，先给结论再给细节效果更好

## 4.7 Procedure Domain

### 作用

- 保存从多次服务中沉淀出的 playbook / skill draft / reusable procedure

### 子域

- `service_playbook`
- `tool_recipe`
- `checklist`
- `skill_candidate`
- `approved_skill`

### 规则

- 单次成功经验不能直接升格
- 至少需要 repeated evidence 或明确用户需求

## 4.8 Soul Domain

Soul 最终应拆为三层：

### `core_soul`

- 系统设定
- 低频变更
- 明确 guardrails

### `adaptive_overlay`

- 基于长期互动自动形成
- 只允许落在安全可控的行为维度

### `soul_proposals`

- 由 self-maintenance 生成
- 记录候选变更与依据

### 运行时

Prompt 中注入的 soul = `core_soul + approved adaptive overlay`

## 4.9 Learning Domain

### 作用

- 识别值得系统学习的主题
- 维护 learning backlog 和 learning plan

### 子域

- `learning_candidate`
- `learning_backlog`
- `learning_plan`
- `learning_note`
- `domain_brief`

### 规则

- 学习必须服务用户
- 不能变成“无边界自我进化”

## 4.10 Automation Domain

这层不只是现有 automation job 列表，而是加上 ownership 与记忆来源。

### 子域

- `user_job`
- `agent_job`
- `maintenance_job`
- `learning_job`

### 必须新增字段

在现有 `AutomationJob` 上新增：

- `owner_type`
- `owner_id`
- `mutability`
- `provenance_memory_id`
- `provenance_learning_id`
- `retention_policy`
- `visible_in_ui`

## 5. 存储架构

## 5.1 不是单一后端，而是混合底座

### A. Structured Metadata Store

建议：

- SQLite 为主

负责：

- memory records
- ownership
- status/lifecycle
- linkage graph
- access log

### B. Artifact Store

建议：

- 本地 markdown / yaml / json artifacts

负责：

- soul
- diary
- learning plans
- procedures
- postmortems

### C. Retrieval Store

建议：

- 先 FTS + metadata filters
- 再逐步接入 hybrid semantic retrieval

负责：

- recall
- notebook chunks
- artifact search

### D. Optional Graph Layer

图层不是 P0，但 schema 必须 graph-ready。

这样未来若需要：

- people/project relationship
- temporal fact graph

就能平滑补上。

## 5.2 Canonical 文件布局

建议未来在 `~/.nion-data` 下形成如下目录：

```text
memory-os/
  index.sqlite3
  access_logs.sqlite3
  artifacts/
    user-model/
    relationship/
    soul/
      core/
      adaptive/
      proposals/
    agent-self/
      diary/
      reflections/
      postmortems/
    learning/
      backlog/
      plans/
      notes/
    procedures/
      drafts/
      approved/
```

同时保留：

- `notebook/` 作为用户资产
- `automation/` 作为执行系统

但它们都要与 `memory-os` 建链接。

## 6. 运行时流水线

## 6.1 Chat Hot Path

主响应链只做必须做的事情：

1. 读取 thread state
2. continuity retrieval
3. user model / relationship / procedure 的 bounded context assembly
4. 响应用户
5. capture recall exchange
6. enqueue post-turn extraction job

**不在热路径里做复杂 consolidation。**

## 6.2 Post-Turn Extraction

每次对话后做轻量抽取：

- new facts candidates
- correction candidates
- recurring topic signals
- relationship signals
- service quality signals
- possible learning triggers

产物写入：

- candidate queue
- evidence log

## 6.3 Heartbeat / Maintenance Loop

Heartbeat 统一承载后台维护。

### Cadence 1: `micro`

触发：

- 对话后空闲一段时间

职责：

- 写 diary
- 合并本轮 candidates
- 更新 recent focus

### Cadence 2: `daily`

职责：

- consolidate user model
- 检查 stale memory
- 生成 learning candidates
- 刷新 agent-owned jobs

### Cadence 3: `weekly`

职责：

- procedure crystallization
- soul overlay proposals
- archive sweep
- learning plan reprioritization

## 6.4 Consolidation Pipeline

真正写入长期 truth 时统一走下面步骤：

1. dedupe
2. conflict check
3. contradiction / supersede detection
4. confidence calibration
5. write active or invalidate old one
6. update artifact if needed

## 7. 自我成长机制

## 7.1 Diary

每个微周期至少生成一篇 diary entry。

建议结构：

```md
# 2026-04-04 / thread-abc

## What happened
## What seems important about the user
## What I got wrong
## Repeated needs
## Candidate learnings
## Candidate automations
## Candidate procedure upgrades
```

Diary 只对 self-maintenance 开放写入，不让用户手工编辑。

## 7.2 Learning Candidate Scoring

建议用统一主题评分：

`topic_score = frequency * recency * criticality * cross-session-spread * user-value - transient_penalty`

### 进入 learning backlog 的条件

- 多次出现
- 跨会话稳定
- 明显服务用户核心工作
- 不是一次性兴趣

### 不进入 learning backlog 的例子

- 一次性问菜谱
- 突发性的短期闲聊问题
- 没有复现的随机 curiosity

## 7.3 Procedure / Skill Crystallization

当某类场景多次出现并且已有稳定服务方式时：

1. 聚合案例
2. 形成 draft procedure
3. 标注 evidence
4. 在后续服务中复用验证
5. 升格为 approved procedure / skill

这是“记忆转 skill”的唯一合理路径。

## 7.4 Soul Evolution

只有符合下面条件的变化才允许进入 adaptive soul：

- 与长期互动风格强相关
- 不改变安全边界
- 不改变核心身份
- 有 repeated evidence

比如：

- 更偏直接
- 更偏结论先行
- 更少解释性废话

但不允许：

- 自行改核心价值观
- 自行突破政策边界

## 8. 遗忘与淘汰

## 8.1 生命周期状态

建议所有 durable memory 统一状态：

- `candidate`
- `active`
- `warm`
- `cold`
- `archived`
- `invalidated`
- `purged`

## 8.2 典型规则

### 用户模型事实

- 被新事实覆盖 -> `invalidated`
- 长期不用但仍可能成立 -> `cold`
- 已明显失效 -> `invalidated`

### Diary / reflection

- 默认保留，但降索引优先级

### Procedures

- 长期不用 -> `archived`
- 被新版本替代 -> `superseded`

### Learning topics

- 长期未再出现 -> `archived`

## 8.3 删除策略

真正 `purged` 只用于：

- 低价值临时记忆
- 无引用的旧 candidate
- 用户明确要求遗忘

## 9. 自动化 Ownership 最终方案

## 9.1 User-Owned Automation

### 来源

- 用户明确创建
- 用户要求 assistant 创建

### 权限

- 用户可编辑
- 用户可删除
- 用户可停启

## 9.2 Agent-Owned Automation

### 来源

- heartbeat
- learning planner
- maintenance planner

### 类型

- `maintenance`
- `learning`
- `review`
- `refresh`

### 权限

- 用户可暂停
- 用户可恢复
- 用户不可直接编辑 prompt/schedule/body
- 用户可以通过聊天提出高层指令，系统再重建任务

这完全符合你要的原则：

- 用户只能启停
- 不能手改 agent 内部成长任务

## 9.3 与当前 AutomationService 的对接

当前 [backend/packages/harness/nion/automation/models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py) 已有足够骨架。

推荐在现有模型上增量补这些字段：

```python
owner_type: Literal["user", "agent"] = "user"
owner_id: str = "user:default"
mutability: Literal["editable", "pause_only"] = "editable"
provenance_memory_id: str | None = None
provenance_learning_id: str | None = None
policy_flags: dict[str, Any] = Field(default_factory=dict)
```

这样不需要重做自动化系统，只需要把它纳入 Memory OS 治理。

## 10. 与当前 Nion 代码的落点

## 10.1 可直接复用

- `recall_capture_middleware`
- `continuity_middleware`
- `memory_middleware` 的 post-turn enqueue 思路
- OpenViking chunk store
- automation runtime
- current notebook boundary

## 10.2 必须替换

- `memory.json` 作为长期 memory canonical backend
- flat prompt memory injection
- 事实无限追加、缺少时态

## 10.3 必须重建

- heartbeat service
- self-maintenance service
- consolidation engine
- diary writer
- learning planner
- procedure crystallizer
- access log / provenance log

## 11. 实施顺序

## Phase 0: Contract Foundation

- 定义 memory domains
- 定义 unified metadata
- 定义 owner/scope/lifecycle
- 定义 artifact paths

## Phase 1: Memory OS Substrate

- 建 SQLite metadata store
- 建 artifact store
- 建 context assembly service
- 建 candidate queue

## Phase 2: Replace `memory.json`

- 先兼容导入 legacy memory
- 改 prompt 注入为 context pack
- recall / notebook / user model 统一组装

## Phase 3: Heartbeat And Self-Maintenance

- daemon-owned heartbeat
- diary writer
- consolidation jobs
- stale sweep

## Phase 4: Learning / Procedure / Soul

- learning backlog
- procedure drafts
- skill crystallization
- adaptive soul overlay

## Phase 5: Agent-Owned Automation

- automation ownership fields
- maintenance jobs
- learning jobs
- UI split user/agent automation

## 12. 为什么这是完整且可行的

我认为这个方案是完整且可行的，原因不是它最复杂，而是它满足了所有关键约束：

### 完整

- 有 storage model
- 有 domain model
- 有 lifecycle
- 有 background maintenance
- 有 soul / diary / learning / automation ownership
- 有 forget / archive / invalidate
- 有 migration path

### 可行

- 能复用 Nion 现有 recall、notebook、automation 基础
- 不要求一开始就引入重型 graph stack
- 不要求一开始就完全替换产品面
- 可以分阶段迁移

### 不会走偏

- 不会把 notebook 变成 memory
- 不会把 Nion 变成纯 code agent
- 不会让 agent 无边界自我进化
- 不会继续在 `memory.json` 上补丁叠补丁

## 13. 最终结论

Nion 该做的不是“更大的记忆系统”，而是：

**一个围绕单个用户持续形成 user model、持续维护 agent 自身成长、持续把经验升级成更强服务能力的 Personal Memory OS。**

如果只用一句工程化的话来概括这个最终方案，那就是：

**`candidate-first, consolidate-later, artifact-backed, owner-governed, heartbeat-maintained, procedure-oriented memory system`**
