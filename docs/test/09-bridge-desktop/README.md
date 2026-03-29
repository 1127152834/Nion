# 测试文档 09 - Bridge / Desktop Client 模块

- 文档用途：指导其他 agent 对桌面 preload/IPC、bridge 设置页、daemon diagnostics/incidents/channels、desktop-only terminal 与 shared threads bridge 链路做完整测试。
- 适合交给哪类 agent 执行：桌面集成测试 agent、后端 daemon/control-plane 测试 agent、bridge E2E/QA agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + Electron/desktop UI + agent-browser 或 electron automation。
- 是否建议先做 contract / integration 再做 E2E：是，先做 preload/client/daemon routes contract，再做桌面 UI/E2E。

## 1. 模块说明
- 模块目标：在桌面产品面提供 Web 没有的 bridge、terminal、daemon control plane 和本地运行时能力，同时保持共享 `/api/*` 语义一致。
- 核心业务职责：
  - preload 向渲染层暴露 `window.nionDesktop.backendBaseUrl/dialog/terminal/bridge/getRuntimeInfo`。
  - renderer 通过 HashRouter 承载 workspace 全部桌面路由。
  - bridge client 在非桌面返回 null，在桌面经 IPC 调 main process。
  - daemon 暴露 runtime-info、diagnostics、channels、incidents。
  - bridge manager 将 IM 消息转成 thread search/state/stream/uploads/permissions resolve 请求。
  - terminal drawer 通过 IPC terminal manager 创建/写入/调整/销毁终端实例。
- 典型用户角色：桌面端用户、渠道桥接运维用户、需要本地终端/诊断能力的高级用户。
- 上下游依赖：Electron preload、main process stores、daemon service、shared threads router。
- 与其他模块关系：
  - 与模块 01：desktop thread client 共享 threads routes；bridge manager 也直接调用 threads/search/state/stream/uploads。
  - 与模块 02：bridge surface 的权限决策走 `/bridge/permissions/.../resolve`。
  - 与模块 04：desktop runtime 也暴露 runtime-profile/files/tool-policy 等共享治理面。
  - 与模块 05：config 更新后 daemon runtime-info/bridge status 会变化。
- 关键代码位置：
  - 桌面 preload/renderer：`desktop/src/preload/index.ts`、`desktop/src/renderer/renderer-app.tsx`
  - 桌面 bridge/main：`desktop/src/main/bridge/*`、`desktop/src/main/terminal-manager.ts`
  - 前端 bridge/desktop client：`frontend/src/core/bridge/client.ts`、`frontend/src/core/api/desktop-client.ts`、`frontend/src/components/workspace/bridge/*`、`frontend/src/components/workspace/terminal/terminal-drawer.tsx`
  - 后端 router：`backend/app/gateway/routers/desktop_system.py`、`backend/app/daemon/routers/diagnostics.py`、`channels.py`、`incidents.py`
  - 现有测试文件：`backend/tests/test_desktop_helper_health.py`、`test_local_daemon_api.py`、`test_daemon_diagnostics_api.py`、`test_daemon_channels_api.py`、`frontend/src/core/bridge/client-availability.test.ts`、`frontend/src/core/threads/desktop-client.test.ts`、`frontend/src/components/workspace/terminal/terminal.contract.test.ts`、`frontend/src/components/workspace/*-routes.contract.test.ts`

## 2. 模块边界与测试范围
- 本模块覆盖：
  - desktop helper health/runtime-info
  - preload API 暴露与 renderer 路由
  - bridge settings/status/bindings/incidents/channels
  - terminal IPC 与 Web fallback
  - bridge thread client 对 shared threads API 的调用
- 不属于本模块：
  - 第三方 IM 平台的深度协议细节
  - 纯 Web 端聊天主链路本身
- 与其他模块的交叉测试点：
  - bridge permission resolve
  - desktop terminal 与 thread files meta 的 cwd 联动
  - config 更新对 daemon runtime-info 的影响
- 易混淆边界：
  - bridge 页面在浏览器环境是允许访问的，但应明确显示 desktop-only 降级。
  - desktop renderer 路由是 HashRouter，而 Web 是普通路由，但业务路径语义要保持一致。

## 3. 核心业务链路
1. Electron 启动时 preload 执行 `registerPreloadBridge()`：
   - 注入 `__NION_BACKEND_BASE_URL__`
   - 注入 `nionDesktop.dialog`
   - 注入 `nionDesktop.terminal`
   - 注入 `nionDesktop.bridge`
   - 注入 `nionDesktop.getRuntimeInfo`
2. renderer 注册 `/workspace/chats`、`/workspace/agents`、`/workspace/bridge`、`/workspace/automation`、`/workspace/cli-tools`、`/workspace/notebook` 等路由。
3. bridge 页面通过 `getBridgeClient()`：
   - 非桌面返回 null -> UI 显示 `Bridge is only available in the desktop app.`
   - 桌面返回 IPC 包装 client -> 可读写 settings、status、bindings、incidents、Weixin login 等
4. main process bridge manager 读取 settings/bindings/incidents/observations store，执行：
   - start/stop/startPlatform/stopPlatform
   - probe / verify / detect chat id
   - action runner / incident remediation
5. bridge 运行时通过 `createNionThreadClient(baseUrl)` 发起：
   - `/api/threads/search`
   - `/api/threads/{id}/state`
   - `/api/threads/{id}/stream`
   - `/api/threads/{id}/uploads`
   - `/api/threads/{id}/bridge/permissions/{id}/resolve`
6. terminal drawer：
   - desktop：调用 IPC create/write/resize/kill
   - web：显示 fallback 文案，不提供真实终端
7. daemon control plane 提供 runtime-info、diagnostics、channels、incidents 作为桌面自诊断面。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交 | 核心断言 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| desktop health | `/api/desktop/health` | GET | 查询桌面 helper 健康状态 | renderer/diagnostics | gateway app 可用 | 无 | status mode service | 返回 `mode=desktop` | 无 | 无 | 无 | 无 | 重复 GET | service 固定 `nion-desktop-helper` |
| desktop runtime info | `/api/desktop/runtime-info` | GET | 获取桌面 helper base info | preload/runtime UI | env 可读 | 无 | mode helper_host helper_port data_dir | 返回当前 helper 信息 | env 异常 | 无 | 无 | 无 | 重复 GET | helper_host/port/data_dir 正确 |
| daemon runtime info | `/api/daemon/runtime-info` | GET | 获取本地 daemon 状态 | desktop shell | daemon app 已启动 | 无 | host mode allow_background_running 等 | config 更新后同步变化 | daemon 启动失败 | 无 | 默认字段存在 | 无 | 重复 GET | `mode=local-daemon` |
| daemon diagnostics | `/api/daemon/diagnostics*` | GET | 读取 daemon/thread/task/skill 诊断 | diagnostics center | telemetry store 可用或 fallback | path id | status summary details | snapshot/fallback 都可返回 | id 非法 | snapshot 不存在时 fallback | 无事件时 healthy/no diagnostics | 无 | 重复 GET | details 与 snapshot 或 latest event 对齐 |
| daemon channels status | `/api/daemon/channels` | GET | 查询 channel service 概览 | bridge UI | channel service 可用或为空 | 无 | service_running pending_pair_requests channels | 返回渠道状态 | service 不可用 | 无 | 空 channels | 无 | 重复 GET | channel 字段完整 |
| daemon channels detail/actions | `/api/daemon/channels/{...}` | GET/POST | list pair requests、authorized users、restart、pairing-code、approve/reject/revoke | bridge UI/admin | repo/service 可用 | platform/name/request ids | response models | pair requests / authorized users / diagnostics / restart 正常 | platform 非法 | request/user 不存在 404 | 空列表 | 已处理请求重复 approve/reject | 并发 approve/revoke | 诊断优先使用 error snapshot |
| daemon incidents | `/api/daemon/incidents*` | GET/POST | list/get/dismiss/diagnose incidents | bridge/desktop diagnostics | telemetry store 可用 | incident_id source thread_id run_id | incident records | diagnose 后持久化 incident | 参数缺 thread_id/run_id | incident 不存在 404 | 空列表 | dismiss 已 dismissed | 并发 diagnose/dismiss | incident fields 完整 |
| bridge thread client routes | `/api/threads/*` | POST/GET | search/state/stream/uploads/bridge resolve | bridge manager | baseUrl 正确 | thread_id text files decision | thread records / SSE / upload result / permission result | bridge 能完成 thread lifecycle | fetch status 非 2xx | thread 不存在 | 空 search 结果 | resolve 不存在 request | 并发 channel 消息 | resolve 路径必须是 `/bridge/permissions` |

## 5. UI 测试文档
- 页面入口：`/workspace/bridge`，桌面 renderer 中的 `/workspace/*` HashRouter 页面，聊天页 terminal drawer。
- 首屏渲染：
  - BridgeLayout 左侧渠道导航
  - 标题/描述
  - 各渠道 settings section
- 加载态：bridge status/settings 拉取时不崩溃；桌面 route 切换可用。
- 空态：无 incidents / 无 bindings / 无 channels 时的空态。
- 错误态：bridge client 不可用时 desktopOnly 文案；daemon/channel error 显示 error summary。
- 列表/详情/卡片/面板展示：
  - 渠道开关
  - status banner
  - incidents/diagnostics 列表
  - terminal drawer
- 用户交互：
  - 开关 bridge/channel
  - 查看 pair requests / authorized users / incidents
  - 执行 restart 或 action
  - 打开/关闭 terminal drawer
- 表单校验：verify Telegram/Discord/Feishu/QQ 参数；Weixin login session 等。
- 按钮状态：运行中/停止中/诊断 action 执行中。
- 条件渲染：非桌面 fallback；桌面可显示真实状态。
- 成功反馈：diagnose/action 完成、terminal 有输出、channel restart 成功。
- 失败反馈：IPC 不可用、daemon 失败、incident/action 失败。
- 刷新后状态：bridge settings/status 重新恢复，renderer route 不丢失。
- 返回/切页后状态：HashRouter 页面来回切换一致。
- 重复操作：重复 start/stop/restart/action。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块优先在桌面环境执行；浏览器环境主要验证 fallback。
- Web 页面或渲染层可用 `agent-browser`；Electron app 建议配合 `/electron`、DevTools 或桌面自动化能力。
- 必须抓 network：`/api/desktop/*`、`/api/daemon/*`、bridge 线程请求 `/api/threads/*`。
- 必须保留截图：bridge fallback、desktop runtime info、terminal fallback/terminal working、channels/incidents 页面。

### 6.2 E2E 场景清单

#### 场景 1：非桌面环境 bridge fallback
- 场景目标：验证浏览器环境打开 bridge 页面时不会报错，而是显示 desktop-only 提示。
- 前置条件：在普通 Web 环境访问页面。
- 执行步骤：
  1. `agent-browser open http://localhost:2026/workspace/bridge`
  2. `agent-browser wait --load networkidle`
  3. `agent-browser snapshot -i`
- 预期结果：看到 fallback 文案，页面无崩溃。
- 关键断言：`getBridgeClient()` 返回 null；无未处理异常。
- 证据建议：页面截图、console。
- 自动化建议：适合自动化。
- 优先级：P1。

#### 场景 2：desktop health/runtime-info 主成功链路
- 场景目标：验证桌面 helper 和 daemon 运行信息接口可用。
- 前置条件：桌面 helper/daemon 已启动。
- 执行步骤：
  1. 请求 `/api/desktop/health`。
  2. 请求 `/api/desktop/runtime-info`。
  3. 请求 `/api/daemon/runtime-info`。
- 预期结果：全部 200，字段完整。
- 关键断言：`mode=desktop`、`mode=local-daemon`。
- 优先级：P0。

#### 场景 3：renderer 路由与 preload 注入
- 场景目标：验证桌面 renderer 能访问 chats/cli-tools/notebook/bridge routes，且 base URL 注入有效。
- 前置条件：桌面 app 运行。
- 步骤：进入各 route，检查页面可渲染和请求成功。
- 预期结果：CLI Tools/Notebook/Bridge 页面路由可达。
- 优先级：P1。

#### 场景 4：terminal drawer Web/desktop 差异链路
- 场景目标：验证 terminal drawer 的双态行为。
- 前置条件：分别在 Web 与 desktop 环境。
- 执行步骤：打开聊天线程 -> 点击 terminal。
- 预期结果：
  - Web：只显示 fallback 文案。
  - Desktop：终端可创建并显示输出/退出事件。
- 优先级：P1。

#### 场景 5：daemon diagnostics / channels / incidents 巡检
- 场景目标：验证 control plane 页面或 API 可用于诊断。
- 前置条件：有 telemetry snapshot 或 channel service 状态。
- 执行步骤：请求 diagnostics/channels/incidents；必要时在 UI 展示。
- 预期结果：状态、summary、details 正常。
- 优先级：P1。

#### 场景 6：bridge permission resolve 专用链路
- 场景目标：验证 bridge manager 对权限请求走专用 bridge route，并能继续执行。
- 前置条件：bridge surface 触发敏感工具；存在 permission request。
- 执行步骤：在桌面 bridge 链路中批准权限；抓请求。
- 预期结果：调用 `/api/threads/{id}/bridge/permissions/{perm_id}/resolve`，后续 bridge 对话继续。
- 优先级：P1。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 2、3。
- 主失败链路：fallback、IPC/daemon 失败、incident error。
- 权限受限链路：场景 6。
- 刷新恢复链路：bridge settings/status 重进恢复。
- 返回/重进链路：renderer 各 route 往返切换。
- 重复点击/重复提交链路：terminal open/close、restart/action 连点。
- 接口报错后的 UI 反馈链路：channels/incidents/diagnostics 失败。
- 模块间联动链路：bridge -> threads -> permission resolve -> uploads。
- web / desktop-client 差异链路：场景 1、4。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：Web fallback、renderer 页面基础渲染、control plane 页面巡检。
- 适合 `/qa`：bridge/settings/status 回归。
- 适合 report-only：桌面控制平面状态巡检。
- 必须抓 network：desktop/daemon APIs、bridge thread APIs。
- 必须看 console：IPC 不可用、renderer 报错。
- 必须截图留证：bridge fallback、desktop route、terminal 状态、incidents/channels 页面。

## 7. 数据一致性与状态流转测试
- preload 暴露的 backendBaseUrl 与前端实际请求 base URL 一致。
- desktop thread client / bridge thread client 与共享 threads API 结果一致。
- daemon runtime-info 在 config 更新后同步变化。
- diagnostics/channels/incidents 与 telemetry snapshot / channel service 状态一致。
- bridge permission resolve 与 thread permission store 状态一致。

## 8. 异常与边界测试
- preload 未注入、IPC channel 缺失、backendBaseUrl 为空。
- 非桌面环境访问 bridge/terminal。
- desktop helper/daemon 未启动。
- diagnostics snapshot 不存在。
- channels service 启动失败。
- incident diagnose 缺 thread_id/run_id。
- terminal create/write/resize/kill 异常。
- bridge manager stream/upload/resolvePermission 非 2xx。
- 路由 hash 异常或返回后状态错乱。

## 9. 自动化建议
- 后端接口自动化：desktop health/runtime-info、daemon diagnostics/channels/incidents、bridge thread client route contract。
- 前端 contract：bridge client availability、desktop thread client、renderer routes、terminal fallback。
- desktop 集成/E2E：bridge page、terminal、daemon status。
- 人工探索：真实渠道配对、Weixin login、incident remediation action。
- 最小冒烟集合：health/runtime-info、bridge fallback、terminal fallback/desktop terminal。
- 最小回归闭环：renderer route -> bridge status -> daemon diagnostics -> bridge permission resolve。
- 高收益自动化优先级：P0 是 runtime/shared routes；P1 是 bridge UI 与 control plane。

## 10. 风险与优先级
- P0 必测项：desktop runtime/daemon shared routes、preload contract。
- P1 高价值项：bridge UI、terminal、channels/incidents/diagnostics。
- P2 扩展项：真实平台配对与修复动作。
- 最容易漏测的点：非桌面降级、HashRouter 路径、bridge 使用专用 permissions 路由、bridge thread client 的 upload/resolve 行为。
- 最容易出现线上事故的链路：desktop shell 可打开但 `/api/*` 路由不全、terminal IPC 失效、bridge manager 与 threads route 脱节、diagnostics 状态失真。
- 上线前必须回归的部分：desktop health/runtime-info、bridge fallback、terminal 差异、daemon diagnostics、bridge permissions resolve。

