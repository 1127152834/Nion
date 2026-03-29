# Project 模块数据模型设计

## 目标

定义 Nion `Project` 模块 v1 的核心数据模型，为后续：

- 数据库存储设计
- Gateway / daemon API 设计
- 前端状态模型与查询模型
- hooks / automation 事件模型

提供稳定的对象边界。

本设计不直接落到 SQL 表结构，但要求每个对象都具备足够明确的字段语义，避免后续在实现阶段继续摇摆。

## 设计原则

### 1. Project 是长期容器，不是一次性线程包装

Project 必须有自己的稳定身份、状态、阶段、时间线和记忆，不依赖单一聊天线程存在。

### 2. 用户级最小执行对象是实施计划

用户在产品中管理的是 `实施计划`，不是内部子任务。

内部子任务可以存在于 agent 运行时，但不作为 v1 核心产品对象。

### 3. 时间线与当前态必须分离

任何关键对象都不能只保留“当前态”，必须保留足够的历史记录以支持：

- 回溯
- 返工
- 恢复
- 记忆提炼
- 自动推进

### 4. 默认采用 append-only 思路

对以下对象，优先采用追加式建模而不是覆盖式建模：

- 阶段快照
- 实施计划结果
- 产物版本
- 项目记忆条目
- 时间线事件

### 5. 用户心智优先于底层技术实现

即使后续某些类型的项目底层接 Git，也不能让 Git 反过来定义 Project 的核心模型。

## 一、核心对象总览

v1 建议固定 7 个核心对象：

1. `Project`
2. `ProjectPhaseSnapshot`
3. `ExecutionPlan`
4. `ProjectThreadLink`
5. `ManagedArtifact`
6. `ProjectMemoryEntry`
7. `ProjectTimelineEvent`

对象关系总览：

- `Project` 是根对象
- `ProjectPhaseSnapshot` 记录 Project 的阶段历史
- `ExecutionPlan` 记录 Project 内可管理的执行单元
- `ProjectThreadLink` 记录线程与 Project / 实施计划的关联
- `ManagedArtifact` 记录受管产物与版本归属
- `ProjectMemoryEntry` 记录稳定项目记忆
- `ProjectTimelineEvent` 记录项目关键历史事件

## 二、Project

`Project` 是长期工作容器的根对象。

### 建议字段

- `id`
- `name`
- `description`
- `goal`
- `lifecycle_status`
- `current_phase`
- `current_primary_plan_id`
- `current_primary_thread_id`
- `active_phase_snapshot_id`
- `project_memory_summary`
- `created_by`
- `created_at`
- `updated_at`
- `completed_at`
- `archived_at`

### 字段说明

#### `id`

Project 的稳定主键。

#### `name`

用户可见项目名称。v1 创建时可只要求项目名。

#### `description`

项目简述，可为空。

#### `goal`

项目目标摘要，用于 Project 共享上下文包与列表概览。

#### `lifecycle_status`

Project 生命周期状态，建议枚举：

- `active`
- `completed`
- `archived`
- `abandoned`

#### `current_phase`

当前阶段，建议枚举：

- `头脑风暴`
- `设计`
- `计划`
- `实施`
- `完成`

#### `current_primary_plan_id`

当前主进行实施计划。

允许为空，例如项目刚创建或已完成但暂未开启新计划。

#### `current_primary_thread_id`

当前默认继续推进的主会话。

#### `active_phase_snapshot_id`

指向当前生效的阶段快照。

#### `project_memory_summary`

压缩后的 ProjectMemory 概要，用于快速列表和新会话上下文注入。

它不是 ProjectMemory 的替代品，只是读优化层。

### 不建议放入 Project 主表的内容

以下内容不要塞进 Project 主对象：

- 全部阶段历史
- 全部实施计划详情
- 全部线程 ID 数组
- 全部产物版本历史
- 全部记忆明细

这些应该通过独立对象管理。

## 三、ProjectPhaseSnapshot

`ProjectPhaseSnapshot` 用于记录阶段历史。

它必须存在，但默认不直接暴露为用户主视图，而是作为系统内部权威记录与前台摘要来源。

### 建议字段

- `id`
- `project_id`
- `phase`
- `entered_at`
- `exited_at`
- `entered_by`
- `transition_reason`
- `trigger_plan_id`
- `summary`
- `next_action`
- `status_at_time`

### 字段说明

#### `phase`

对应 Project 当前阶段枚举。

#### `entered_by`

记录触发者：

- `agent`
- `user`
- `system`

#### `transition_reason`

说明为什么进入该阶段。

例如：

- 需求与约束已收敛，可进入设计
- 已形成可执行设计，可开始拆计划
- 计划链路已建立，可进入实施

#### `trigger_plan_id`

若该阶段切换由某个关口实施计划推动，记录对应 `ExecutionPlan.id`。

#### `summary`

该阶段的阶段摘要，供：

- 时间线摘要
- 新建 Project Chat 的共享上下文包
- 项目页摘要卡

#### `next_action`

进入本阶段后的建议第一动作。

### 关键规则

- 每次阶段变化都新建一条快照，不覆盖旧快照
- `Project.current_phase` 只表示当前态
- 历史态以 `ProjectPhaseSnapshot` 为准

## 四、ExecutionPlan

`ExecutionPlan` 是用户可管理的最小执行对象。

### 建议字段

- `id`
- `project_id`
- `phase`
- `title`
- `description`
- `plan_type`
- `execution_mode`
- `is_gate_plan`
- `is_primary`
- `sort_order`
- `lifecycle_status`
- `queue_status`
- `hold_status`
- `hold_reason`
- `outcome_status`
- `outcome_summary`
- `depends_on_plan_ids`
- `branch_routes`
- `primary_thread_id`
- `primary_artifact_id`
- `rework_of_plan_id`
- `derived_from_outcome_id`
- `created_at`
- `updated_at`
- `started_at`
- `completed_at`

### 字段说明

#### `phase`

该实施计划所属阶段。

#### `plan_type`

可选轻分类，建议支持：

- `normal`
- `rework`
- `review`
- `completion`

#### `execution_mode`

执行方式：

- `manual`
- `auto`

#### `is_gate_plan`

是否为关口计划。

#### `is_primary`

是否为当前阶段下的主进行实施计划。

V1 同一阶段只允许一个主进行计划。

#### `sort_order`

在全局实施计划看板中的用户手动排序值。

#### `lifecycle_status`

- `draft`
- `ready`
- `running`
- `completed`
- `failed`
- `canceled`
- `archived`

#### `queue_status`

- `not_queued`
- `queued`
- `dispatched`

#### `hold_status`

- `none`
- `paused`
- `blocked`
- `waiting_confirmation`
- `review_pending`
- `waiting_manual_start`

#### `hold_reason`

- `rate_limited`
- `dependency`
- `manual`
- `missing_input`
- `tool_error`
- `human_decision`

#### `outcome_status`

实施计划结束后的结构化结果：

- `done`
- `done_with_followups`
- `needs_revision`
- `blocked`
- `canceled`

#### `outcome_summary`

计划结果摘要，用于：

- 结果确认卡
- 时间线事件
- ProjectMemory 草稿

#### `depends_on_plan_ids`

前置依赖实施计划 ID 列表。

V1 支持简单依赖图。

#### `branch_routes`

结果驱动分支定义。

建议语义为：

- `done -> plan_id`
- `needs_revision -> rework_plan_id`
- `blocked -> diagnosis_plan_id`

不要求 v1 就做复杂 DSL，可先用结构化 JSON 表达。

#### `primary_thread_id`

该实施计划默认继续推进的主会话。

#### `primary_artifact_id`

该实施计划的主产物，可为空。

#### `rework_of_plan_id`

若该实施计划是返工计划，指向原计划。

#### `derived_from_outcome_id`

若该计划由某次结果结论或恢复动作派生，记录来源。

### 关键规则

- 一个阶段可以有多个实施计划
- 同一阶段同一时刻只允许一个 `is_primary=true`
- 默认不重开旧计划，返工走新计划

## 五、ProjectThreadLink

不要把 Project / 实施计划关联字段全部塞进线程表本身。

建议使用 `ProjectThreadLink` 作为线程关系对象。

### 建议字段

- `id`
- `project_id`
- `thread_id`
- `role`
- `linked_plan_ids`
- `is_primary_thread`
- `created_at`
- `updated_at`
- `last_active_at`

### 字段说明

#### `role`

线程在 Project 内的角色建议支持：

- `primary`
- `exploration`
- `implementation`
- `review`
- `temporary`

这只是系统内部关系语义，不要求前台重点暴露“用途”概念。

#### `linked_plan_ids`

当前线程关联的实施计划列表。

#### `is_primary_thread`

是否为当前 Project 的主会话。

### 关键规则

- 一个 Project 可以有多个线程
- 一个实施计划可以关联多个线程
- 每个 Project 只应有一个当前主会话

## 六、ManagedArtifact

`ManagedArtifact` 用于表达受管产物及其归属。

### 建议字段

- `id`
- `project_id`
- `artifact_type`
- `title`
- `path`
- `mime_type`
- `is_managed`
- `primary_plan_id`
- `linked_plan_ids`
- `current_version_id`
- `created_by`
- `created_at`
- `updated_at`
- `archived_at`

### 字段说明

#### `artifact_type`

建议支持：

- `document`
- `code`
- `config`
- `table`
- `report`
- `automation`
- `other`

#### `is_managed`

是否为受管产物。

V1 只对 `is_managed=true` 建版本链。

#### `primary_plan_id`

主归属实施计划。

#### `linked_plan_ids`

关联过该产物的其他实施计划。

### 关键规则

- 一个受管产物可以被多个实施计划关联
- 但必须有一个主归属计划
- V1 不强制为“仅引用产物”建立版本链

## 七、ManagedArtifactVersion

虽然它不在 7 个核心对象列表里单独强调，但落地时必须存在版本对象。

建议作为 `ManagedArtifact` 的子对象建模。

### 建议字段

- `id`
- `artifact_id`
- `version_number`
- `created_at`
- `created_by`
- `change_type`
- `summary`
- `content_ref`
- `diff_ref`
- `related_plan_id`
- `restored_from_version_id`
- `restore_reason`

### `change_type`

建议支持：

- `create`
- `update`
- `restore`
- `rework_output`

### 关键规则

- 恢复采用追加式恢复
- 恢复生成新版本，不覆盖旧版本
- 若产物来自已完成实施计划，恢复后可触发“是否新建返工计划”的建议动作

## 八、ProjectMemoryEntry

`ProjectMemoryEntry` 是稳定项目记忆，不是聊天总结仓库。

### 建议字段

- `id`
- `project_id`
- `category`
- `title`
- `content`
- `confidence`
- `source_event_type`
- `source_plan_id`
- `source_phase_snapshot_id`
- `supersedes_entry_id`
- `created_at`
- `updated_at`

### `category`

建议固定为：

- `brief`
- `decisions`
- `constraints`
- `learnings`
- `handoff`

### 字段说明

#### `confidence`

记录该记忆条目的稳定度，便于后续提炼长期记忆时做筛选。

#### `source_event_type`

记录该条目来自哪个关键节点，例如：

- `phase_entered`
- `plan_outcome_confirmed`
- `rework_plan_created`
- `project_completed`
- `user_explicit_extract`

#### `supersedes_entry_id`

若当前条目修正了旧结论，则指向被替代的条目。

### 写入原则

ProjectMemory 采用“两层写入”：

- `drafts`
- `stable entries`

只有在关键节点压缩整理后，才写入稳定条目。

关键节点建议固定为：

- 阶段切换
- 关口计划结果确认
- 新建返工计划
- 恢复关键受管产物版本
- 进入完成阶段
- 用户显式要求提炼

## 九、ProjectTimelineEvent

`ProjectTimelineEvent` 是 Project 的用户级历史视图基础。

### 建议字段

- `id`
- `project_id`
- `event_type`
- `title`
- `summary`
- `phase`
- `related_plan_id`
- `related_thread_id`
- `related_artifact_id`
- `related_memory_entry_id`
- `visibility`
- `created_by`
- `created_at`
- `payload`

### `event_type`

建议至少支持：

- `project_created`
- `phase_entered`
- `phase_regressed`
- `plan_created`
- `plan_started`
- `plan_paused`
- `plan_blocked`
- `plan_completed`
- `plan_outcome_confirmed`
- `rework_plan_created`
- `artifact_restored`
- `project_completed`
- `memory_extracted`
- `skill_extracted`

### `visibility`

建议支持：

- `user_visible`
- `summary_only`
- `internal_only`

不是所有内部事件都应该进入用户时间线。

### 关键规则

- 时间线以实施计划推进事件为主
- 阶段事件可见，但只展示摘要
- 内部中间状态可仅记录在 payload，不一定前台显示

## 十、对象之间的关键关系

### 1) Project 与 PhaseSnapshot

- `Project` 1:N `ProjectPhaseSnapshot`
- `Project.active_phase_snapshot_id` 指向当前快照

### 2) Project 与 ExecutionPlan

- `Project` 1:N `ExecutionPlan`
- `Project.current_primary_plan_id` 指向当前主计划

### 3) Project 与 Thread

- `Project` 1:N `ProjectThreadLink`
- `Project.current_primary_thread_id` 指向当前主会话

### 4) ExecutionPlan 与 Thread

- 一个实施计划可关联多个线程
- 但有一个 `primary_thread_id`

### 5) ExecutionPlan 与 Artifact

- 一个受管产物可关联多个实施计划
- 但必须有一个 `primary_plan_id`

### 6) Project 与 MemoryEntry

- `Project` 1:N `ProjectMemoryEntry`
- `Project.project_memory_summary` 是这些条目的投影摘要

### 7) Project 与 TimelineEvent

- `Project` 1:N `ProjectTimelineEvent`
- TimelineEvent 是用户级历史视图来源

## 十一、隐式状态机与对象的关系

隐式状态机不是一个单独对象，而是由这些对象共同表达：

- 当前阶段：`Project.current_phase`
- 阶段历史：`ProjectPhaseSnapshot`
- 当前主线：`Project.current_primary_plan_id`
- 执行推进：`ExecutionPlan`
- 用户可见历史：`ProjectTimelineEvent`
- 稳定工作记忆：`ProjectMemoryEntry`

这样可以避免单独再造一个“巨大状态机对象”，同时保留足够的审计能力。

## 十二、长期记忆与 skill 提炼出口

### 长期记忆提炼候选

只应从 `ProjectMemoryEntry` 中筛选：

- 跨项目稳定偏好
- 经多次验证的方法
- 用户明确确认值得记住的规则

### skill 提炼候选

应从以下对象联合提炼：

- `ExecutionPlan`
- `ProjectTimelineEvent`
- `ProjectMemoryEntry`

skill 提炼关注的是：

- 步骤是否稳定
- 输入输出是否清晰
- 是否跨项目可复用
- 是否存在明确关口与成功标准

## 十三、V1 明确不做

以下内容建议明确排除在 v1 之外：

- 内部子任务的产品级持久化管理界面
- 完整 Git 分支/合并/冲突产品模型
- 跨项目 `@会话`
- 全自动长期记忆写入
- 全自动 skill 提炼并直接生效
- 系统自动优先级排序
- 基于产物细粒度变更的复杂自动化编排

## 十四、后续实现建议

建议下一篇文档继续补：

1. `2026-03-30-project-module-api-contract-design.md`
   - API 输入输出模型
   - Project 列表、详情、实施计划、时间线、会话、版本恢复接口

2. `2026-03-30-project-module-hooks-automation-design.md`
   - 实施计划事件
   - 阶段事件
   - 自动推进边界
   - 高影响动作确认模型

3. `2026-03-30-project-module-mvp-plan.md`
   - MVP 拆分
   - 与现有 threads / notebook / openviking 的集成顺序
