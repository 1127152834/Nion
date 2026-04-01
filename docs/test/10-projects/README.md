# 模块 10：Projects 长期工作容器

## 模块职责

Projects 是顶层 Workspace 模块，用于管理长期工作的项目容器。

当前 v1 范围包括：

- 项目列表页
- 项目驾驶舱
- 项目会话
- 实施计划
- 项目时间线
- 决策/确认流
- 受管产物与版本恢复入口
- 完成阶段提炼建议
- 候选式导出到 Notebook / Memory 的对象桥接入口

## 主要前端入口

- `/workspace/projects`
- `/workspace/projects/[project_id]`
- `/workspace/projects/[project_id]/threads/[thread_id]`

## 主要后端入口

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}`
- `POST /api/projects/{project_id}/complete`
- `GET/POST /api/projects/{project_id}/plans*`
- `GET/POST /api/projects/{project_id}/threads*`
- `GET /api/projects/{project_id}/timeline*`
- `GET/POST /api/projects/{project_id}/artifacts*`
- `GET/POST /api/projects/{project_id}/memory*`
- `GET/POST /api/projects/{project_id}/decisions*`
- `POST /api/projects/{project_id}/bridge/notebook-drafts`
- `POST /api/projects/{project_id}/bridge/memory-candidates`
- `POST /api/projects/{project_id}/bridge/skill-candidates`
- `POST /api/projects/{project_id}/references/notebook-notes`

## 核心验证点

### 1. 项目创建链路

- 主聊天 `Create -> 项目` 可创建项目并跳到项目详情页
- `/workspace/projects` 顶层导航可进入项目列表页
- 新建项目后自动进入 `头脑风暴` 阶段

### 2. 项目驾驶舱

- 顶部总览展示项目名、当前阶段、生命周期、总体进度、最近活跃时间
- 当前动作区展示下一步动作、阻塞和待确认事项
- 实施计划区支持主计划、启动、确认结果、新建返工
- 项目会话区支持主会话和新建项目会话
- 时间线区展示最近项目事件
- 受管产物区展示受管产物、版本摘要与恢复入口
- 顶部操作区提供 `导出到笔记`、`提炼长期记忆` 两个候选式 bridge action 入口
- 生成成功后应导向候选中心，而不是在 Projects 驾驶舱直接 apply

### 3. 项目会话

- 项目线程使用独立路由 `/workspace/projects/{project_id}/threads/{thread_id}`
- 新建项目会话默认继承项目上下文
- 最近聊天列表按 `项目 / 桥接 / 普通` 分组
- 项目线程带 `项目` badge 和项目名

### 4. 项目内 `@会话`

- 在项目线程输入框里，`@` 候选包含当前项目内其他线程
- 不能跨项目引用
- 选中后调用项目导入接口，生成一次性快照
- 导入不应污染普通文件/目录 mention 逻辑

### 5. 完成与提炼建议

- 点击 `标记完成` 先生成 `complete_project` 决策
- 决策确认后项目进入 `完成`
- 自动生成：
  - `extract_long_term_memory`
  - `extract_skill`

### 6. 对象桥接入口

- `导出到笔记` 只创建 notebook draft candidate，不直接写 Notebook 正文
- `提炼长期记忆` 只创建 memory candidate，不直接写长期记忆
- `attach notebook note` 必须通过 `/references/notebook-notes`，不能由页面直接改项目对象
- 统一 review/apply 应通过 `/api/object-candidates/*`，不在项目页内复制 apply flow

### 7. 受管产物

- 项目详情页能看到受管产物卡片
- 展示产物标题、类型、路径、主归属计划
- 展示版本摘要与恢复按钮
- 恢复后若产物属于已完成计划，应触发返工建议决策

## 当前自动化验证

后端：

- `UV_LINK_MODE=copy uv run pytest tests/test_projects_router.py tests/test_runtime_app_factory.py -q`
- `uv run pytest tests/test_object_bridge_api.py -q`

前端：

- `pnpm exec node --test src/components/workspace/recent-chat-list.contract.test.ts src/components/workspace/projects/project-routes.contract.test.ts src/core/navigation/desktop-routes.test.ts`
- `pnpm exec node --test src/components/workspace/projects/project-pages.contract.test.ts src/core/object-bridges/api.test.ts`
- `pnpm exec node --test src/components/workspace/candidates/candidate-center.contract.test.ts src/core/object-candidates/api.test.ts`
- `pnpm exec tsc --noEmit -p tsconfig.json`

## 当前缺口

- Project 页面级 contract test 已补到最小驾驶舱入口，但还没有完整交互型 integration / E2E
- 还没有覆盖项目详情页主交互的 E2E
- 受管产物仍然是最小展示，不包含复杂 diff / 预览验证
