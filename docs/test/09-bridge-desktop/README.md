# 测试文档 09 - Bridge / Desktop Client 模块

- 文档用途：指导其他 agent 对桌面 preload/IPC、bridge 设置页、daemon diagnostics/incidents/channels、desktop-only terminal 差异链路做测试。
- 适合交给哪类 agent 执行：桌面集成测试 agent、后端 daemon API 测试 agent、bridge E2E/QA agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + Electron/desktop UI + agent-browser 或 electron automation。
- 是否建议先做 contract / integration 再做 E2E：是。

## 1. 模块说明
- 模块目标：提供桌面特有的 bridge 能力、terminal IPC、daemon control plane、incident diagnostics 和共享 `/api/*` 路由语义。
- 核心业务职责：
  - preload 通过 `window.nionDesktop` 暴露 `terminal`、`bridge`、`getRuntimeInfo`。
  - renderer 使用 HashRouter 注册 workspace 各桌面路由。
  - bridge client 在非桌面环境返回 null，在桌面环境经 IPC 调 main 进程。
  - daemon 暴露 `/api/daemon/runtime-info`、`/api/daemon/diagnostics*`、`/api/daemon/channels*`、`/api/daemon/incidents*`。
  - bridge main 进程通过 `nion-thread-client` 调 `/api/threads/*` 完成 bridge 对话。
- 关键代码位置：`desktop/src/preload/index.ts`、`desktop/src/renderer/renderer-app.tsx`、`desktop/src/main/bridge/*`、`frontend/src/core/bridge/client.ts`、`frontend/src/components/workspace/bridge/*`、`backend/app/daemon/routers/*`、`backend/app/gateway/routers/desktop_system.py`。
- 现有测试：`backend/tests/test_desktop_helper_health.py`、`test_local_daemon_api.py`、`test_daemon_diagnostics_api.py`、`test_daemon_channels_api.py`、`frontend/src/core/bridge/client-availability.test.ts`、`frontend/src/core/threads/desktop-client.test.ts`、`frontend/src/components/workspace/cli-tools-routes.contract.test.ts`、`notebook-routes.test.ts`。

## 2. 模块边界与测试范围
- 覆盖：desktop runtime info、preload API、bridge settings/status/incidents/channels、desktop terminal、renderer 路由、bridge thread client 与 shared threads routes。
- 不覆盖：各 IM 平台真实第三方网络行为的全量稳定性，但要覆盖最小 verify/probe/detect 流。
- 交叉点：模块 01/02/04 的桌面差异，尤其 bridge permissions resolve 与 terminal。

## 3. 核心业务链路
1. 桌面启动时 preload 注入 `__NION_BACKEND_BASE_URL__` 与 `window.nionDesktop.*`。
2. renderer 通过 HashRouter 注册 `/workspace/chats`、`agents`、`bridge`、`notebook`、`cli-tools` 等路由。
3. bridge 页面调用 `getBridgeClient()`；在非桌面环境返回 null 并显示 desktopOnly 文案。
4. 在桌面环境，bridge client 经 IPC 调 main 进程，后者维护 settings store、bindings、incidents、channels。
5. bridge manager 使用 `createNionThreadClient(baseUrl)` 调 `/api/threads/search/state/stream/uploads/bridge/permissions/resolve`。
6. terminal drawer 在桌面调用 IPC terminal manager，在 Web 只显示降级文案。

## 4. 接口测试文档
- 必测 API：
  - `/api/desktop/health`
  - `/api/desktop/runtime-info`
  - `/api/daemon/runtime-info`
  - `/api/daemon/diagnostics`
  - `/api/daemon/diagnostics/threads/{id}`
  - `/api/daemon/diagnostics/tasks/{id}`
  - `/api/daemon/channels`
  - `/api/daemon/channels/{platform|name}*`
  - `/api/daemon/incidents*`
- 关键断言：
  - health 返回 `mode=desktop service=nion-desktop-helper`
  - local daemon 同时暴露 threads/runtime-profile/model-admin/uploads/artifacts
  - diagnostics 能回退到 snapshot 或 fallback runtime 信息
  - channels API 能返回 service status / pair requests / authorized users / diagnostics
  - bridge thread client resolve permission 走 `/bridge/permissions/.../resolve`

## 5. UI 测试文档
- bridge 页面 sidebar 切换 Telegram/Feishu/Discord/QQ/Weixin。
- 非桌面环境显示 desktopOnly 文案。
- desktop 环境 bridge settings/status/bindings/incidents 面板可交互。
- terminal drawer 在 Web 显示 fallback 文案，在 desktop 可连接终端。
- renderer 路由覆盖 CLI Tools / Notebook / Bridge / Agents。

## 6. E2E 测试文档
- 场景 1：桌面 renderer 路由可进入 Bridge/CLI/Notebook，P1。
- 场景 2：bridge 页面在非桌面环境降级，P1。
- 场景 3：desktop runtime-info/health 可用，P0。
- 场景 4：打开 terminal drawer，Web 看 fallback、desktop 看终端输出，P1。
- 场景 5：daemon diagnostics/channels/incidents 页面或 API 巡检，P1。
- 场景 6：bridge permission resolve 走专用 bridge route，P1。
- 统一要求：优先用 `agent-browser` 做 Web/renderer 页面；Electron app 用 desktop/electron skill 或 DevTools 自动化；必须抓 network/IPC 日志并截图。

## 7. 数据一致性与状态流转测试
- preload base URL 与 frontend backend base URL 一致。
- desktop thread client / bridge thread client 与 shared threads API 语义一致。
- daemon runtime-info 与 config update 后状态同步。
- incidents/channels diagnostics 与 telemetry store/snapshot 一致。

## 8. 异常与边界测试
- 桌面 bridge client 缺失、IPC 不可用、daemon 启动失败、channel service 启动失败、incident snapshot 不存在、bridge manager runtime failure、terminal create/write/kill 异常、desktop 路由 hash 兼容性。

## 9. 自动化建议
- 后端接口自动化：desktop/daemon/channels/incidents/diagnostics。
- 前端 contract：client-availability、desktop-client、renderer routes。
- desktop 集成/E2E：bridge page、terminal。
- 人工探索：真实渠道配对、Weixin login、incident remediation。
- 冒烟：health/runtime-info/bridge fallback/terminal fallback。

## 10. 风险与优先级
- P0：desktop runtime/daemon shared routes。
- P1：bridge UI、terminal、channels/incidents。
- 易漏点：非桌面要优雅降级；bridge 使用专用 permissions route；renderer 路由与 Web 路由不同但语义共享。
- 事故链路：desktop shell 可打开但 `/api/*` 不全、terminal IPC 失效、bridge manager 与 threads route 脱节。

