# Project 模块 Hooks / Automation 设计

## 目标

定义 Nion `Project` 模块 v1 的 hooks / automation 设计，明确：

- 哪些事件可以被监听
- 哪些动作可以自动执行
- 哪些动作只能生成建议
- 哪些动作必须用户确认

本设计的目标不是把 Project 做成“全自动 BPM 引擎”，而是让它成为一个**可以持续推进的工作系统**。

## 设计原则

### 1. 自动化服务于推进，不服务于替用户做路线决策

自动化可以：

- 推动后继实施计划进入可执行状态
- 生成提醒
- 生成记忆草稿
- 生成建议卡

自动化不应：

- 直接改变主路线
- 直接提炼长期记忆并生效
- 直接发布 skill
- 直接重排用户优先级

### 2. V1 先监听“工作推进事件”，不监听细粒度文件事件

V1 只监听：

- 实施计划事件
- 阶段事件

不监听：

- 细粒度产物版本事件
- 文件级微小修改

### 3. 高影响动作统一走 confirmation model

自动化命中高影响场景时，不直接执行，只生成 `decision / confirmation` 请求。

### 4. 自动推进必须建立在显式可观察状态之上

Hooks 不能依赖模糊的自然语言猜测，必须建立在：

- 实施计划状态
- 结果确认
- 阶段快照
- 生命周期状态

这些结构化信号上。

## 一、V1 监听范围

V1 hooks / automation 只监听两层事件：

1. `ExecutionPlan` 事件
2. `ProjectPhaseSnapshot` / Project 阶段事件

原因：

- 这两层足够表达“项目是否在推进”
- 这两层与用户心智一致
- 可以覆盖自动接棒、结果确认、阶段摘要、完成阶段提炼等核心能力

## 二、实施计划事件

### 建议事件清单

- `plan_created`
- `plan_ready`
- `plan_started`
- `plan_paused`
- `plan_blocked`
- `plan_completed`
- `plan_outcome_confirmed`
- `rework_plan_created`

### 1) `plan_created`

#### 触发时机

- 新建实施计划后

#### 可自动执行的动作

- 写入时间线事件
- 若当前阶段无主计划，可更新“候选主计划建议”
- 生成记忆草稿（可选）

#### 不应自动执行的动作

- 不自动设为主计划
- 不自动进入执行

### 2) `plan_ready`

#### 触发时机

- 依赖满足，计划进入可执行状态

#### 可自动执行的动作

- 若 `execution_mode = auto`，且满足全局资源条件，标记为可调度
- 生成“可启动”提示
- 更新 Project 的下一步动作

#### 条件限制

- 若计划为 `manual`，只能进入 `waiting_manual_start`
- 不直接越过用户对 manual 计划的控制

### 3) `plan_started`

#### 触发时机

- manual 计划被用户启动
- auto 计划被系统调度启动

#### 可自动执行的动作

- 写入时间线
- 更新 `Project.current_primary_plan_id`
- 如需要，同步更新 `Project.current_primary_thread_id`
- 生成执行开始摘要

### 4) `plan_paused`

#### 触发时机

- 用户手动暂停
- 系统因条件不足暂停

#### 可自动执行的动作

- 写入时间线
- 生成提醒
- 更新 Project 的阻塞/暂停摘要

### 5) `plan_blocked`

#### 触发时机

- 依赖未满足
- 缺少输入
- 工具失败
- 用户决策缺失

#### 可自动执行的动作

- 写入时间线
- 生成阻塞提醒
- 生成待处理原因卡
- 更新 Project 详情页 blocker 区

#### 不应自动执行的动作

- 不自动绕过阻塞
- 不自动改计划依赖

### 6) `plan_completed`

#### 触发时机

- 实施计划执行结束

#### 可自动执行的动作

- 写入时间线
- 生成结果摘要
- 生成 ProjectMemory 草稿

#### 分流规则

- 若是普通计划，可自动收口
- 若是关口计划，转入 `pending_outcome_confirmation`

### 7) `plan_outcome_confirmed`

#### 触发时机

- 用户确认关口计划结果

#### 可自动执行的动作

- 写入时间线
- 将相关记忆草稿压缩写入稳定 ProjectMemory
- 若存在后继 `auto` 计划且条件满足，触发后继计划进入 `ready` / `running`
- 评估是否触发阶段切换

#### 这是 V1 最重要的 hooks 事件之一

它代表一条结果从“agent 建议”升级为“项目共识”。

### 8) `rework_plan_created`

#### 触发时机

- 基于旧计划结果或产物恢复新建返工计划

#### 可自动执行的动作

- 写入时间线
- 生成返工原因摘要
- 将相关返工经验写入记忆草稿
- 如果 Project 当前阶段是 `完成`，可自动回退到 `计划` 或 `实施`

## 三、阶段事件

### 建议事件清单

- `phase_entered`
- `phase_exited`
- `phase_regressed`

### 1) `phase_entered`

#### 触发时机

- Project 新进入某个阶段

#### 可自动执行的动作

- 写入时间线
- 生成阶段摘要
- 更新 Project 总览的阶段轨道
- 更新 Project 的下一步动作

#### 特殊处理

- 若进入 `完成` 阶段，可生成提炼建议卡

### 2) `phase_exited`

#### 触发时机

- Project 结束当前阶段

#### 可自动执行的动作

- 生成该阶段的阶段总结草稿
- 写入时间线摘要

### 3) `phase_regressed`

#### 触发时机

- Project 从更后阶段回退到更前阶段

例如：

- `完成 -> 实施`
- `实施 -> 计划`

#### 可自动执行的动作

- 写入时间线
- 标明回退原因
- 生成返工/回退摘要

#### 不应自动执行的动作

- 不自动静默删除旧阶段结论

## 四、自动动作分级

为了避免自动化越界，建议把动作分成 3 级：

1. 自动执行
2. 生成建议卡
3. 必须用户确认

### A. 自动执行

这些动作 v1 可以直接执行：

- 写时间线事件
- 更新 Project 总览字段
- 更新下一步动作
- 生成 ProjectMemory 草稿
- 生成阻塞提醒
- 普通计划自动收口
- 后继 `auto` 计划在条件满足后进入 `ready`
- 后继 `auto` 计划在条件满足且资源可用后进入 `running`

### B. 生成建议卡

这些动作不直接执行，但可以主动建议：

- 建议设某个计划为主计划
- 建议从恢复版本新建返工计划
- 建议提炼长期记忆
- 建议提炼 skill
- 建议进入完成阶段

### C. 必须用户确认

以下动作必须经过用户确认：

- 关口计划结果定性
- 跨阶段关键推进
- 新建返工计划
- 项目完成
- 项目归档
- 项目放弃
- 提炼长期记忆
- 提炼 skill
- 路线切换

## 五、自动推进规则

### 1) manual / auto 只影响“后继计划是否自动接棒”

它不决定：

- 结果由谁裁决
- 阶段由谁切换

这些仍然由确认模型与 agent 状态机控制。

### 2) 后继计划自动接棒条件

一个后继实施计划自动接棒，至少需要满足：

- 前置依赖计划已完成且结果已确认
- 本计划 `execution_mode = auto`
- 本计划不处于阻塞
- 全局执行资源允许
- 当前没有更高优先级的用户手动调整冲突

### 3) manual 计划的自动化边界

manual 计划最多只能被自动推进到：

- `waiting_manual_start`

不应被系统直接开始执行。

## 六、限流与资源受限处理

### 429 / provider 并发受限

当执行计划时遇到：

- `429`
- provider concurrency limit
- model temporary unavailable

建议自动触发：

- 状态进入 `paused + rate_limited`
- 写入时间线
- 生成通知
- 更新 blocker 卡

不应自动触发：

- 自动改模型
- 自动改变队列优先级
- 自动切换路线

## 七、ProjectMemory 写入自动化

### 两层模型

- `memory_drafts`
- `stable memory entries`

### 草稿自动写入时机

可在以下事件后生成草稿：

- `plan_completed`
- `plan_blocked`
- `phase_exited`
- `rework_plan_created`

### 稳定写入时机

只在关键节点压缩写入 stable memory：

- `plan_outcome_confirmed`
- `phase_entered`
- `phase_regressed`
- `project_completed`
- 用户显式提炼

## 八、完成阶段自动化

当 Project 进入 `完成` 阶段时，可自动做：

- 生成项目完成摘要草稿
- 汇总关键受管产物
- 汇总阶段摘要
- 生成提炼建议卡

### 建议卡建议包括

- `提炼为长期记忆`
- `提炼为 skill`
- `生成项目总结`

### 不应自动做

- 不直接写入长期记忆
- 不直接发布 skill
- 不自动归档项目

## 九、与现有 Nion 能力的关系

### 1) 与 threads / stream

Project automation 不替代线程流式执行。

它只负责：

- 结构化状态推进
- 自动触发建议卡
- 调度后继实施计划

### 2) 与 Notebook

Project automation 不应自动写 Notebook。

最多只生成“建议沉淀为笔记”的动作。

### 3) 与长期记忆

Project automation 可以生成长期记忆候选，但不能自动生效。

### 4) 与 skills

Project automation 可以生成 skill 提炼建议，但不能自动安装/启用 skill。

## 十、建议的内部事件总线载荷

虽然 v1 不一定要先做成完整事件总线产品，但建议内部事件统一带这些字段：

- `event_id`
- `event_type`
- `project_id`
- `phase`
- `plan_id`
- `thread_id`
- `artifact_id`
- `timestamp`
- `triggered_by`
- `payload`

这样后续做：

- daemon diagnostics
- project telemetry
- replay / audit
- hooks 扩展

都不需要重新补字段。

## 十一、V1 明确不做

以下自动化能力建议明确排除：

- 自动跨项目调度
- 自动优先级排序
- 基于产物细粒度变更的复杂触发器
- 自动写 Notebook
- 自动发布 skill
- 自动写长期记忆
- 自动改变用户设置的主路线

## 十二、后续文档建议

下一篇建议补：

`docs/project/02-planning/2026-03-30-project-module-mvp-plan.md`

需要明确：

- MVP 必做功能
- 可延后能力
- 与现有 threads / notebook / openviking / settings 的接入顺序
