# Project 模块 API 契约设计

## 目标

定义 Nion `Project` 模块 v1 的 API 契约，为后续：

- Gateway 路由设计
- 前端查询与 mutation client
- daemon / thread / project 联动
- 高影响动作确认模型

提供明确的接口边界。

本设计聚焦产品契约，不绑定具体 HTTP 框架实现细节，但默认面向现有 Nion `/api/*` 风格。

## 设计原则

### 1. Project 是一级资源

Project 不能只作为 thread metadata 的附属字段暴露，必须有独立的资源面。

### 2. 前台读取接口优先返回“驾驶舱视图”

Project 详情接口不应要求前端拼装 6 次请求后才能渲染主页面。

v1 应直接提供“Project 驾驶舱”所需的聚合数据。

### 3. 高影响动作采用 suggestion-first + confirmation

以下动作默认不直接执行，而是走“建议卡 / 确认动作”模型：

- 关口计划结果定性
- 新建返工计划
- 提炼长期记忆
- 提炼 skill
- 项目完成 / 归档 / 放弃

### 4. 普通读取与高影响动作分离

不要把“读取状态”和“触发高影响工作流变化”混在同一接口里。

## 一、资源总览

v1 API 资源建议分为 6 组：

1. `Projects`
2. `Execution Plans`
3. `Project Threads`
4. `Project Timeline`
5. `Managed Artifacts`
6. `Project Decisions / Confirmations`

建议基础路径：

- `/api/projects/*`

## 二、Projects

### 1) 获取项目列表

`GET /api/projects`

### 用途

用于渲染：

- 项目列表页
- 项目选择器
- 主聊天创建项目后的跳转卡片

### Query 参数建议

- `lifecycle_status`
- `current_phase`
- `q`
- `sort`
- `limit`
- `cursor`

### 返回建议

```json
{
  "items": [
    {
      "id": "proj_123",
      "name": "Project Alpha",
      "goal": "Build project module",
      "lifecycle_status": "active",
      "current_phase": "实施",
      "progress": {
        "phase_index": 4,
        "phase_count": 5,
        "percent": 62
      },
      "current_primary_plan": {
        "id": "plan_1",
        "title": "实现项目聊天绑定"
      },
      "stats": {
        "plan_total": 8,
        "plan_active": 1,
        "thread_total": 5,
        "managed_artifact_total": 12
      },
      "last_active_at": "2026-03-30T01:00:00Z"
    }
  ],
  "next_cursor": null
}
```

### 2) 创建项目

`POST /api/projects`

### 请求体建议

```json
{
  "name": "Project Alpha",
  "description": "optional",
  "goal": "optional"
}
```

### 语义

- v1 只强制要求 `name`
- 创建成功后，系统自动进入 `头脑风暴` 阶段
- 同时创建首个 `ProjectPhaseSnapshot`

### 返回建议

返回完整 Project 简述对象，而不是只返回 ID。

### 3) 获取项目详情驾驶舱

`GET /api/projects/{project_id}`

### 用途

这是 Project 详情页主接口。

它应直接返回驾驶舱视图所需聚合数据：

- Project 基础信息
- 当前阶段与进度
- 当前主进行实施计划
- 阻塞与待确认事项
- 最近会话
- 最近时间线

### 返回建议

```json
{
  "project": {
    "id": "proj_123",
    "name": "Project Alpha",
    "description": "optional",
    "goal": "Build project module",
    "lifecycle_status": "active",
    "current_phase": "实施",
    "project_memory_summary": {
      "brief": "Project summary",
      "decisions": ["..."],
      "constraints": ["..."],
      "learnings": ["..."]
    },
    "created_at": "2026-03-30T00:00:00Z",
    "updated_at": "2026-03-30T01:00:00Z"
  },
  "progress": {
    "phase_track": [
      { "phase": "头脑风暴", "status": "completed" },
      { "phase": "设计", "status": "completed" },
      { "phase": "计划", "status": "completed" },
      { "phase": "实施", "status": "current" },
      { "phase": "完成", "status": "pending" }
    ],
    "percent": 62
  },
  "current_primary_plan": {
    "id": "plan_1",
    "title": "实现项目聊天绑定",
    "execution_mode": "manual",
    "status": {
      "lifecycle_status": "running",
      "queue_status": "dispatched",
      "hold_status": "none",
      "hold_reason": null
    }
  },
  "next_action": {
    "type": "continue_primary_thread",
    "label": "继续当前主会话"
  },
  "blockers": [],
  "pending_confirmations": [],
  "recent_threads": [],
  "recent_timeline": []
}
```

### 4) 更新项目基础信息

`PATCH /api/projects/{project_id}`

### 用途

仅用于低风险字段更新：

- 名称
- 描述
- 目标

不用于高影响状态变化。

### 5) 完成 / 归档 / 放弃项目

这类动作建议不要直接做 `PATCH lifecycle_status`。

改为高影响动作接口：

- `POST /api/projects/{project_id}/complete`
- `POST /api/projects/{project_id}/archive`
- `POST /api/projects/{project_id}/abandon`

这些接口建议走 confirmation model，见后文。

## 三、Execution Plans

### 1) 获取项目内实施计划列表

`GET /api/projects/{project_id}/plans`

### Query 参数建议

- `phase`
- `status`
- `is_primary`
- `include_archived`

### 返回建议

返回该项目下全部实施计划的轻列表，供：

- Project 详情页计划区
- 实施计划二级页
- Project 内计划筛选视图

### 2) 创建实施计划

`POST /api/projects/{project_id}/plans`

### 请求体建议

```json
{
  "phase": "计划",
  "title": "拆分聊天绑定实施计划",
  "description": "optional",
  "plan_type": "normal",
  "execution_mode": "manual",
  "depends_on_plan_ids": ["plan_prev"],
  "is_gate_plan": false
}
```

### 关键规则

- 创建计划不要求立即进入队列
- 若创建的是返工计划，应通过专用接口或携带：
  - `plan_type = rework`
  - `rework_of_plan_id`
  - `derived_from_outcome_id`

### 3) 获取实施计划详情

`GET /api/projects/{project_id}/plans/{plan_id}`

### 返回建议

应返回：

- 计划基础信息
- 当前状态
- 依赖关系
- 分支路由
- 主会话
- 关联会话
- 主产物
- 关联产物
- 最近结果摘要

### 4) 更新实施计划

`PATCH /api/projects/{project_id}/plans/{plan_id}`

### 可更新字段建议

- `title`
- `description`
- `execution_mode`
- `is_gate_plan`
- `depends_on_plan_ids`
- `branch_routes`
- `sort_order`

### 不建议通过此接口直接更新的字段

- `outcome_status`
- `lifecycle_status` 的关键终态
- `rework_of_plan_id`

这些应通过专门动作接口完成。

### 5) 设为当前主进行计划

`POST /api/projects/{project_id}/plans/{plan_id}/set-primary`

### 语义

- 同阶段其他计划的 `is_primary` 自动清除
- 同步更新 `Project.current_primary_plan_id`

### 6) 启动实施计划

`POST /api/projects/{project_id}/plans/{plan_id}/start`

### 语义

- 用于 manual 计划的显式启动
- 校验依赖是否满足
- 校验是否为可启动状态

### 7) 暂停实施计划

`POST /api/projects/{project_id}/plans/{plan_id}/pause`

### 请求体建议

```json
{
  "reason": "manual"
}
```

### 8) 恢复实施计划

`POST /api/projects/{project_id}/plans/{plan_id}/resume`

### 语义

- 用于 `paused` / `waiting_manual_start` / `rate_limited` 等状态恢复
- 不改变全局排序，只恢复执行资格

### 9) 确认实施计划结果

`POST /api/projects/{project_id}/plans/{plan_id}/confirm-outcome`

### 用途

用于关口计划结果确认。

### 请求体建议

```json
{
  "outcome_status": "done",
  "outcome_summary": "optional override",
  "selected_next_plan_id": "plan_next_optional"
}
```

### 语义

- 这是高影响动作
- 结果确认后可触发：
  - 后继 `auto` 计划进入 ready / running
  - 阶段切换
  - ProjectMemory 稳定写入

### 10) 新建返工计划

`POST /api/projects/{project_id}/plans/{plan_id}/create-rework`

### 请求体建议

```json
{
  "title": "返工：重新梳理项目聊天绑定",
  "description": "optional",
  "execution_mode": "manual"
}
```

### 语义

- 默认不重开旧计划
- 新建 `rework` 类型计划
- 自动关联：
  - `rework_of_plan_id`
  - `derived_from_outcome_id`

## 四、Project Threads

### 1) 获取项目会话列表

`GET /api/projects/{project_id}/threads`

### Query 参数建议

- `role`
- `linked_plan_id`
- `sort`

### 用途

用于：

- Project 详情页会话管理区
- 项目聊天分类列表

### 返回建议

每条记录返回：

- `thread_id`
- `title`
- `role`
- `is_primary_thread`
- `linked_plan_ids`
- `last_active_at`

### 2) 创建项目会话

`POST /api/projects/{project_id}/threads`

### 请求体建议

```json
{
  "title": "optional",
  "role": "temporary",
  "linked_plan_ids": ["plan_1"],
  "inherit_project_context": true
}
```

### 语义

- 创建一个 `thread_type=project` 的线程
- 自动绑定 `project_id`
- 默认继承 Project 共享上下文包
- 不默认继承上一会话摘要

### 3) 设为主会话

`POST /api/projects/{project_id}/threads/{thread_id}/set-primary`

### 语义

- 更新 `Project.current_primary_thread_id`
- 其他线程的 `is_primary_thread` 清除

### 4) 关联实施计划到会话

`POST /api/projects/{project_id}/threads/{thread_id}/link-plan`

### 请求体建议

```json
{
  "plan_id": "plan_1",
  "as_primary_for_plan": false
}
```

### 语义

- 用于将某条线程显式挂到某个实施计划下
- 若 `as_primary_for_plan=true`，更新 `ExecutionPlan.primary_thread_id`

### 5) 获取会话快照候选

`GET /api/projects/{project_id}/threads/{thread_id}/mention-candidates`

### 用途

供 `@会话` 自动完成使用。

限制：

- 只返回当前项目内的其他线程

### 6) 导入会话快照

`POST /api/projects/{project_id}/threads/{thread_id}/imports`

### 请求体建议

```json
{
  "source_thread_id": "thread_2"
}
```

### 语义

- 生成一次性会话快照
- 注入当前线程
- 不建立动态同步关系

## 五、Project Timeline

### 1) 获取项目时间线

`GET /api/projects/{project_id}/timeline`

### Query 参数建议

- `event_type`
- `visibility`
- `limit`
- `cursor`

### 用途

用于 Project 时间线主视图。

### 返回建议

```json
{
  "items": [
    {
      "id": "evt_1",
      "event_type": "plan_outcome_confirmed",
      "title": "已确认计划结果",
      "summary": "聊天绑定计划确认完成",
      "phase": "实施",
      "related_plan_id": "plan_1",
      "created_at": "2026-03-30T01:00:00Z"
    }
  ],
  "next_cursor": null
}
```

### 2) 获取单条时间线详情

`GET /api/projects/{project_id}/timeline/{event_id}`

### 用途

用于展开时间线卡片时查看：

- 更完整的摘要
- 关联计划
- 关联产物
- 可执行动作

## 六、Managed Artifacts

### 1) 获取项目产物列表

`GET /api/projects/{project_id}/artifacts`

### Query 参数建议

- `is_managed`
- `artifact_type`
- `linked_plan_id`

### 用途

用于：

- Project 详情页产物区
- 实施计划详情页的关联产物区

### 2) 获取单个产物详情

`GET /api/projects/{project_id}/artifacts/{artifact_id}`

### 返回建议

应包含：

- 产物基础信息
- 主归属计划
- 关联计划
- 当前版本
- 最近版本摘要

### 3) 获取产物版本列表

`GET /api/projects/{project_id}/artifacts/{artifact_id}/versions`

### 用途

用于版本时间线。

### 4) 恢复产物版本

`POST /api/projects/{project_id}/artifacts/{artifact_id}/restore`

### 请求体建议

```json
{
  "version_id": "ver_3",
  "restore_reason": "Use previous stable version"
}
```

### 语义

- 采用追加式恢复
- 创建新版本
- 不覆写历史
- 若归属于已完成实施计划，可生成返工建议卡

### 5) 将产物绑定到实施计划

`POST /api/projects/{project_id}/artifacts/{artifact_id}/link-plan`

### 请求体建议

```json
{
  "plan_id": "plan_2",
  "as_primary": false
}
```

### 语义

- 用于显式维护 `primary_plan_id` / `linked_plan_ids`

## 七、Project Memory

### 1) 获取项目记忆摘要

`GET /api/projects/{project_id}/memory`

### 返回建议

```json
{
  "summary": {
    "brief": [],
    "decisions": [],
    "constraints": [],
    "learnings": [],
    "handoff": []
  },
  "entries": []
}
```

### Query 参数建议

- `category`
- `include_entries`

### 2) 显式提炼项目记忆

`POST /api/projects/{project_id}/memory/extract`

### 请求体建议

```json
{
  "source_type": "plan",
  "source_id": "plan_1",
  "category": "learnings"
}
```

### 语义

- 这是用户主动触发的“提炼这个”
- 写入 stable memory entry 或生成 suggestion，取决于 source_type 与风险等级

## 八、高影响动作确认模型

建议引入统一资源：

- `ProjectDecisionRequest`

或直接提供统一列表入口：

- `GET /api/projects/{project_id}/decisions`

每一条 decision 都代表一个待用户确认的高影响动作。

### 1) 获取待确认动作列表

`GET /api/projects/{project_id}/decisions`

### 返回建议

```json
{
  "items": [
    {
      "id": "decision_1",
      "type": "confirm_plan_outcome",
      "title": "确认计划结果",
      "summary": "聊天绑定计划已完成，建议进入下一计划",
      "related_plan_id": "plan_1",
      "actions": [
        { "id": "approve", "label": "确认完成" },
        { "id": "rework", "label": "转入返工" },
        { "id": "blocked", "label": "标记阻塞" }
      ]
    }
  ]
}
```

### 2) 响应高影响动作

`POST /api/projects/{project_id}/decisions/{decision_id}/resolve`

### 请求体建议

```json
{
  "action_id": "approve",
  "payload": {
    "selected_next_plan_id": "plan_2"
  }
}
```

### 建议纳入 decision flow 的动作类型

- `confirm_plan_outcome`
- `create_rework_plan`
- `extract_long_term_memory`
- `extract_skill`
- `complete_project`
- `archive_project`
- `abandon_project`
- `confirm_route_change`

## 九、与线程流式接口的关系

Project API 不替代现有 threads/stream 接口。

建议关系为：

- 线程流式对话仍走现有 `/api/threads/{thread_id}/stream`
- Project 只负责提供 Project 语义、关联和共享上下文

建议在 thread runtime/context 中增加：

- `project_id`
- `project_phase`
- `primary_plan_id`

但 Project 的权威状态仍以 `/api/projects/*` 为准。

## 十、建议的错误语义

### 1) 状态冲突

例如：

- 试图启动一个依赖未满足的实施计划
- 试图确认一个已处理的 decision

建议返回：

- `409 Conflict`

### 2) 非法归属

例如：

- 试图在项目 A 中 `@` 项目 B 的会话
- 试图将外部计划关联到错误项目

建议返回：

- `400 Bad Request`

### 3) 资源不存在

建议返回：

- `404 Not Found`

## 十一、前端读取模型建议

为减少前端聚合负担，建议至少提供 3 个高价值聚合接口：

1. `GET /api/projects`
   - Project 列表视图

2. `GET /api/projects/{project_id}`
   - Project 驾驶舱视图

3. `GET /api/projects/{project_id}/decisions`
   - 待确认高影响动作视图

其余接口可围绕二级页面按需查询。

## 十二、V1 明确不做

以下契约建议明确不进入 v1：

- 跨项目会话引用接口
- 自动优先级排序 API
- 直接暴露内部子任务 CRUD
- Git 分支/提交/冲突管理 API
- 完全自动的长期记忆写入接口
- 完全自动的 skill 发布接口

## 十三、后续文档建议

建议下一篇继续补：

1. `2026-03-30-project-module-hooks-automation-design.md`
   - 计划事件
   - 阶段事件
   - 自动推进边界
   - 高影响动作触发逻辑

2. `2026-03-30-project-module-mvp-plan.md`
   - MVP 分层
   - 与现有 threads / notebook / openviking 的接入顺序
