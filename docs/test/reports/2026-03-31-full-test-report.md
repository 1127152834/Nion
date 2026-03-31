# Nion 全方位测试报告

- 测试日期：2026-03-31
- 测试依据：`docs/test/README.md` 及 01-10 模块文档
- 测试范围：现有自动化、关键 API 巡检、`agent-browser` 页面链路验证
- 测试环境：
  - 仓库路径：`/Users/zhangtiancheng/Documents/项目/agent/nion`
  - Web 开发面：`make dev`
  - 本地 daemon：`http://127.0.0.1:43115`

## 一、结论摘要

- 自动化回归整体可运行，项目模块自动化全通过。
- 跨模块自动化发现 4 个失败项：
  - 后端真实失败 1 个
  - 前端契约/回归失败 3 个
- 关键 API 大部分可用，`config`、`projects`、`tool-policy`、`notebook`、`automation`、`agents check` 均返回正常。
- 浏览器 E2E 被前端开发工具链问题阻塞：
  - `/workspace/chats?thread=new`
  - `/workspace/projects`
  - `/workspace/bridge`
  - 在 `next dev --turbo` 下全部返回 500
- 500 的根因不是业务接口，而是 Turbopack 在当前中文目录路径下发生 panic，导致 workspace 页面编译失败。

## 二、已执行测试

### 1. 项目模块自动化

后端：

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_projects_router.py tests/test_runtime_app_factory.py -q
```

结果：

- `9 passed in 2.50s`

前端：

```bash
cd frontend
pnpm exec node --test src/components/workspace/recent-chat-list.contract.test.ts src/components/workspace/projects/project-routes.contract.test.ts src/core/navigation/desktop-routes.test.ts
pnpm exec tsc --noEmit -p tsconfig.json
```

结果：

- `10` 个 node contract test 全通过
- `tsc --noEmit` 通过

### 2. 跨模块后端自动化

执行了 01-09 模块文档中列出的主要后端测试集合，包括：

- threads / uploads / artifacts / suggestions
- permission request / guardrail / thread permissions
- cli catalog / cli tools runtime gating
- runtime profile / files / tool policy
- config center
- notebook
- automation / hooks
- custom agents
- desktop helper / local daemon / daemon diagnostics / channels

命令：

```bash
cd backend
UV_LINK_MODE=copy uv run pytest \
  tests/test_threads_router.py \
  tests/test_thread_repository.py \
  tests/test_thread_event_logging.py \
  tests/test_uploads_router.py \
  tests/test_files_api.py \
  tests/test_artifacts_router.py \
  tests/test_suggestions_router.py \
  tests/test_guardrail_middleware.py \
  tests/test_thread_permission_router.py \
  tests/test_thread_permissions_store.py \
  tests/test_cli_catalog_api.py \
  tests/test_cli_tools_service.py \
  tests/test_cli_tools_runtime_gating.py \
  tests/test_cli_tool_guardrail_policy.py \
  tests/test_runtime_profile_api.py \
  tests/test_runtime_profile_repository.py \
  tests/test_tool_policy_router.py \
  tests/test_gateway_config_api.py \
  tests/test_config_repository.py \
  tests/test_config_store.py \
  tests/test_config_event_logging.py \
  tests/test_notebook_api.py \
  tests/test_notebook_history.py \
  tests/test_notebook_service.py \
  tests/test_automation_router.py \
  tests/test_automation_repository.py \
  tests/test_automation_events_router.py \
  tests/test_automation_tool.py \
  tests/test_event_task_dispatch.py \
  tests/test_event_task_builtin_actions.py \
  tests/test_event_task_script_actions.py \
  tests/test_hook_packages.py \
  tests/test_custom_agent.py \
  tests/test_desktop_helper_health.py \
  tests/test_local_daemon_api.py \
  tests/test_daemon_diagnostics_api.py \
  tests/test_daemon_channels_api.py \
  -q
```

结果：

- `233 passed`
- `1 skipped`
- `1 failed`

### 3. 跨模块前端自动化

执行了 01-09 模块文档中列出的主要前端 contract / node test 集合，包括：

- chats / permission request / cli tools
- settings
- notebook
- automation
- agents
- bridge / terminal / desktop routes
- projects

结果：

- `103 passed`
- `3 failed`

## 三、失败项明细

### A. 后端失败 1

1. `backend/tests/test_thread_event_logging.py::test_embedded_agent_stream_records_run_events`

- 现象：
  - `NionClient.stream()` 内部构造 `HumanMessage` 时传入了 `additional_kwargs=None`
  - `langchain_core` / `pydantic` 校验失败
- 失败位置：
  - `backend/packages/harness/nion/client.py`
- 关键报错：

```text
ValidationError: HumanMessage additional_kwargs
Input should be a valid dictionary
```

- 判断：
  - 这是明确的真实缺陷，不是测试过时。
  - 当 `human_message_payload` 未提供 `additional_kwargs` 时，当前实现会生成非法消息对象。

### B. 前端失败 3

1. `frontend/src/components/workspace/cli-tools/cli-tools.contract.test.ts`

- 失败点：
  - 测试期望 `tool.displayName?.trim() || toolId`
  - 当前实现为 `tool.displayName?.trim() ?? toolId`
- 影响判断：
  - 这里不是纯风格差异。
  - 当 `displayName` 存在但 `trim()` 后为空字符串时，当前实现不会回退到 `toolId`，会产生空 label。
  - 因此这是一个有实际风险的前端回归点。

2. `frontend/src/components/workspace/notebook-routes.test.ts`

- 失败点：
  - 该测试仍要求 `NotebookPage` 包含 `buildNotebookAssistPrompt`
- 现状：
  - `frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts` 明确要求 `NotebookPage` 不再直接持有这段旧逻辑
  - 当前 notebook 实现已经拆分为 shell + panel 结构
- 判断：
  - 这是陈旧测试与新结构冲突，不是当前产品回归。
  - 需要更新测试，而不是回滚 notebook 页面实现。

3. `frontend/src/core/bridge/client-availability.test.ts`

- 失败点：
  - 测试期望 Bridge fallback 使用 i18n 文案 `t.bridge.desktopOnly`
  - 当前 `BridgeSection.tsx` 直接硬编码英文：

```text
Bridge is only available in the desktop app.
```

- 判断：
  - 这是明确的前端契约回退。
  - 代码已经有 locale 字段 `desktopOnly`，但组件未使用。

## 四、关键 API 巡检

以下接口在 `make dev` 环境下验证通过：

```bash
GET /api/config/runtime-status
GET /api/desktop/health
GET /api/projects
GET /api/tool-policy
GET /api/notebook/tree
GET /api/automation/status
GET /api/agents/check?name=release-helper
GET /api/cli/catalog
```

抽样结果：

- `/api/config/runtime-status`
  - `is_in_sync: true`
  - `gateway / langgraph / runtime` 均为 `ok`
- `/api/desktop/health`
  - 返回 `{"status":"healthy","mode":"desktop","service":"nion-desktop-helper"}`
- `/api/projects`
  - 返回项目列表，结构完整
- `/api/tool-policy`
  - `scope=configured-tools-v1`
- `/api/notebook/tree`
  - 可返回目录和文件统计
- `/api/automation/status`
  - scheduler 状态、job 计数、run 计数可返回
- `/api/agents/check`
  - 返回 `available=true`

### daemon API 备注

- `http://127.0.0.1:43115/health` 正常
- `http://127.0.0.1:43115/api/daemon/runtime-info` 正常
- `http://127.0.0.1:2026/api/daemon/runtime-info` 在当前 Web 开发面返回 `404`

判断：

- daemon control plane 当前可通过本地 daemon 直连验证
- 但未通过 `2026` Web 入口暴露
- 模块 09 的完整验证仍需在桌面/daemon 上下文继续做

## 五、页面 / E2E 验证结果

### 已验证页面

使用 `agent-browser` 打开：

- `/workspace/chats?thread=new`
- `/workspace/projects`
- `/workspace/bridge`

结果：

- 三个页面均未进入正常业务 UI
- 页面实际渲染为 Next.js `_error` 500
- `snapshot` 只能看到 `alert`

### 根因

`logs/frontend.log` 中可以稳定复现以下 panic：

```text
TurbopackInternalError: Failed to write app endpoint /workspace/...
Caused by:
- start byte index 12 is not a char boundary; it is inside '项'
```

触发条件：

- 当前仓库路径包含中文目录：`/Users/zhangtiancheng/Documents/项目/...`
- `frontend/package.json` 的 `dev` 脚本使用 `next dev --turbo`

影响：

- workspace 页面在当前开发环境下无法完成真实浏览器 E2E
- 这属于前端开发工具链 / 路径兼容性问题，不是后端 API 故障

### 附加现象

`logs/frontend.log` 还出现了开发态跨源限制提示：

```text
Blocked cross-origin request to Next.js dev resource ... from "127.0.0.1"
```

但该问题不是主阻塞。主阻塞仍是 Turbopack 在中文路径下直接 panic。

## 六、模块覆盖结论

### 已完成

- 模块 01：自动化覆盖完成，E2E 被 workspace 500 阻塞
- 模块 02：自动化覆盖完成
- 模块 03：自动化覆盖完成，发现 1 个 CLI label fallback 风险
- 模块 04：自动化覆盖完成，关键 API 可用
- 模块 05：自动化覆盖完成，关键 API 可用
- 模块 06：自动化覆盖完成，发现 1 个旧测试未同步
- 模块 07：自动化覆盖完成，关键 API 可用
- 模块 08：后端自动化覆盖完成，`agents/check` API 可用
- 模块 09：后端/daemon 自动化部分完成；桌面/renderer 完整 E2E 未完成
- 模块 10：自动化完整通过

### 未完全完成

- 基于浏览器的 workspace 主链路 E2E
- 基于桌面 renderer 的模块 09 完整 UI/E2E
- 需要真实页面交互的 create / edit / save / run-now 等长链路

## 七、建议后续动作

### P0

1. 修复 `backend/packages/harness/nion/client.py` 中 `HumanMessage(additional_kwargs=None)` 问题。
2. 修复 `frontend/src/components/workspace/bridge/BridgeSection.tsx` 的 fallback i18n 回退。
3. 修复 `frontend/src/components/workspace/input-box.tsx` 的 CLI label fallback 语义。

### P1

1. 更新 `frontend/src/components/workspace/notebook-routes.test.ts`，与当前 notebook shell 架构保持一致。
2. 为前端开发面提供一个不依赖 Turbopack 中文路径安全性的运行方式：
   - 关闭 `--turbo`
   - 或迁移到纯 ASCII 路径工作树
   - 或显式提供稳定的非 Turbopack dev/preview E2E 启动脚本

### P2

1. 补齐模块 09 的 desktop renderer / Electron 自动化链路。
2. 在可用页面环境下重跑 `docs/test` 中的 P0 页面场景：
   - chats new thread
   - settings save
   - automation create reminder
   - custom agent bootstrap
   - projects dashboard

## 八、最终判断

- 如果只看自动化与 API，当前仓库处于“多数主模块可用，但存在少量明确回归”的状态。
- 如果把真实页面可操作性算入发布门槛，当前 Web 开发面不通过，因为 workspace 页面在当前路径下稳定 500。
- 本次测试已产出可复现证据，后续建议先修复 P0 三项代码问题和 Turbopack 路径问题，再重跑浏览器 E2E。
