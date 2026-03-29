# 测试文档 04 - Thread Runtime / Permission / Guardrail 治理模块

- 文档用途：指导其他 agent 对线程级 runtime profile、files workspace、tool policy、guardrail 与 thread permission profile 做接口、UI、E2E 与回归测试。
- 适合交给哪类 agent 执行：后端治理/路由测试 agent、前端 runtime UI 测试 agent、桌面/Web 差异测试 agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + agent-browser E2E；其中 runtime profile 与 files 建议先接口自动化。
- 是否建议先做 contract / integration 再做 E2E：是，先做 runtime profile/files/tool-policy/guardrail middleware，再做页面链路。

## 1. 模块说明
- 模块目标：为每个线程定义执行模式、宿主目录绑定、文件树可见范围、工具可见策略和 guardrail 行为，确保聊天/bridge/desktop 的执行边界受控。
- 核心业务职责：
  - `runtime_profile` 决定 `sandbox` 或 `host` 模式、可选 host_workdir、locked 状态。
  - `files` 路由将线程虚拟路径映射到真实 root，并暴露 meta/tree。
  - `tool-policy` 暴露 surface policy rules 和 configured tool catalog。
  - `GuardrailMiddleware` 负责工具执行前授权、denied 或 permission_request 分流。
  - `thread_permissions` 维护线程内 session profile 与 pending allows。
- 典型用户角色：需要切换 sandbox/host 的高级用户、使用工作目录浏览和 desktop terminal 的用户、管理员/测试人员。
- 上下游依赖：Config Center、thread context、chat thread page、bridge thread client、LocalDaemon。
- 与其他模块关系：
  - 与模块 01：聊天页展示 runtime toggle、working directory、terminal，所有执行上下文都受它影响。
  - 与模块 02：guardrail 通过 permission_request 与权限模块联动。
  - 与模块 03：CLI 管理对话的授权与可见性受治理模块影响。
  - 与模块 05：sandbox/tool settings 改变这里的行为。
  - 与模块 09：desktop daemon 同样暴露 runtime-profile、files、tool-policy 等共享路由。
- 关键代码位置：
  - 前端页面/组件：`frontend/src/app/workspace/chats/chat-thread-page.tsx`、`frontend/src/components/workspace/runtime-mode-toggle.tsx`、`frontend/src/components/workspace/tool-policy/tool-policy-page.tsx`
  - 前端 core：`frontend/src/core/runtime/profile.ts`、`frontend/src/core/files/api.ts`、`frontend/src/core/tool-policy/api.ts`
  - 后端 router：`backend/app/gateway/routers/runtime_profile.py`、`backend/app/gateway/routers/files.py`、`backend/app/gateway/routers/tool_policy.py`
  - 后端 service/model/middleware：`backend/packages/harness/nion/runtime_profile/repository.py`、`backend/packages/harness/nion/guardrails/middleware.py`、`backend/packages/harness/nion/thread_permissions.py`、`backend/app/gateway/path_utils.py`
  - 现有测试文件：`backend/tests/test_runtime_profile_api.py`、`backend/tests/test_runtime_profile_repository.py`、`backend/tests/test_files_api.py`、`backend/tests/test_tool_policy_router.py`、`backend/tests/test_guardrail_middleware.py`、`backend/tests/test_thread_permissions_store.py`、`backend/tests/test_thread_permission_router.py`

## 2. 模块边界与测试范围
- 本模块覆盖：
  - `GET/PUT /api/threads/{id}/runtime-profile`
  - `GET /api/threads/{id}/files/meta/tree`
  - `GET /api/tool-policy`
  - guardrail before-tool-call decision、permission request 分支、deny 分支
  - thread permission profile / pending allow store
- 不属于本模块：聊天消息内容本身、CLI catalog CRUD、Config Center 表单细节。
- 与其他模块的交叉测试点：
  - runtime mode toggle 改变 message 提交上下文。
  - files meta/tree 影响 InputBox mention 列表和 terminal cwd。
  - guardrail denial 决定是否弹 permission request。
- 易混淆边界：
  - `host` 模式允许 `host_workdir = null` 的 Web 路径；只有显式绑定目录时才要求绝对路径、存在、可写且基本为空。
  - 一旦已有 host 目录绑定并 lock，再改绑会报错；这和无绑定的 host 模式不同。

## 3. 核心业务链路
1. 聊天页加载时调用 `fetchRuntimeProfile(threadId)`，初始默认是 `{execution_mode: sandbox, host_workdir: null, locked: false}`。
2. 用户切换 `RuntimeModeToggle`：
   - `sandbox -> host`：允许在 Web 路径下仅切 execution_mode；若带显式 host_workdir，则需通过 `validate_host_workdir`。
   - `host -> sandbox`：保留 existing_workdir 语义，但 UI 模式切回 sandbox。
3. `threadRuntimeContext` 进入 `useThreadStream`，后续消息提交把 `execution_mode/host_workdir` 带到 context。
4. `files/meta` 返回 `actual_root execution_mode host_workdir`；`files/tree` 负责把虚拟根映射到实际目录并列目录树。
5. `ChatBox` 根据当前 panelType 分别加载 `/mnt/user-data` 工作目录或 `/mnt/user-data/outputs` 产物目录。
6. `tool-policy` 页面读取 configured rules + catalog，只展示当前策略，不负责修改。
7. GuardrailMiddleware 在工具调用前：
   - allow -> 正常执行
   - deny + approval_required + thread_id -> 转 permission_request
   - deny + 非 approval_required -> 直接 error ToolMessage
8. thread permission store 对 bridge surface 和 workspace 都可提供 `full_access` 或一次性 allow。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 获取 runtime profile | `/api/threads/{thread_id}/runtime-profile` | GET | 读取线程执行模式 | 聊天页/desktop | thread_id 有效 | path | execution_mode host_workdir locked updated_at | 默认 sandbox profile | path 非法 | 无 | 未存在线程也返回默认 profile | host_workdir null | 无 | 重复 GET 一致 | 默认 execution_mode=sandbox |
| 更新 runtime profile | `/api/threads/{thread_id}/runtime-profile` | PUT | 切换 sandbox/host 或绑定 host 目录 | 聊天页 | payload 合法 | `execution_mode host_workdir` | 更新后的 profile | Web host mode + null host_workdir 合法；strict sandbox 下仍允许 host mode | execution_mode 非法；host_workdir 非绝对路径、不可写、不存在、非空目录 | 无 | thread 不存在时也能写 profile | host 模式但无 host_workdir 在 Web 路径下可通过 | 已绑定目录再改绑；locked 后修改 | 重复 PUT 幂等 | 409 冲突与 422 校验错误分离清晰 |
| files meta | `/api/threads/{thread_id}/files/meta` | GET | 获取真实 root 与 runtime 信息 | ChatBox / TerminalDrawer | thread 目录存在或可初始化 | `root` | root actual_root execution_mode host_workdir | sandbox workdir 正确映射 | root 非法 | host path traversal | root 不存在 404 | 空目录也返回 meta | 无 | 重复 GET 一致 | actual_root 与 runtime profile 一致 |
| files tree | `/api/threads/{thread_id}/files/tree` | GET | 枚举目录树 | ChatBox/InputBox | 路径存在 | `root depth include_hidden max_nodes` | directories/files/truncated | workdir/outputs 都可返回文件 | depth/max_nodes 越界 | host 越界访问被拦截 | root 不存在 404 | 空目录空数组 | 隐藏目录、excluded dirs 过滤 | 大目录截断 | tree 内容与真实文件一致 |
| tool policy | `/api/tool-policy` | GET | 读取 surface rules 与 configured catalog | ToolPolicyPage | config 可读取 | 无 | scope rules catalog | 返回 scope + rules + catalog | config 异常 | 无 | 无 | rules 空时返回空对象 | 无 | 重复 GET 一致 | `scope=configured-tools-v1` |
| guardrail deny/request | middleware 内部 | sync/async | 工具执行前治理 | agent runtime | provider 可用 | tool_call context state | allow / error ToolMessage / Command(permission_request) | bridge bash、workspace CLI install 可转 permission request | provider 抛异常 | fail_closed/fail_open | 无 | 空 human message | 非 approval_required 走 error ToolMessage | 并发工具调用 | permission_request actions 与 reason 正确 |
| thread permission profile | store functions | 内部 | 维护 full_access 和 pending allow | middleware/router | store 可写 | thread_id tool_name input | profile / bool | allow_session -> full_access；allow -> pending allow | store 损坏 | 无 | 不存在默认 default | 无 | consumed 再 consume false | 并发 resolve | profile 默认 default |

## 5. UI 测试文档
- 页面入口：聊天页 header 中 runtime toggle/workdir trigger/terminal；独立 `/workspace/tool-policy` 页面。
- 首屏渲染：
  - 新线程页展示 RuntimeModeToggle。
  - 老线程页展示 WorkingDirectoryTrigger 和 Terminal 按钮。
  - Tool Policy 页展示 scope、rules、catalog 三块卡片。
- 加载态：runtime profile 加载时 InputBox disabled；files tree query loading 时 panel 可显示空态或延迟加载。
- 空态：tool policy rules/catalog 为空时有空态文案；working directory 为空时显示 `ConversationEmptyState`。
- 错误态：runtime profile 更新失败记录 console；files root 不存在时 panel 请求失败；tool policy 加载失败有页面错误文案。
- 列表/详情/卡片/面板展示：host/sandbox 图标与文案、working directory actual root、tool policy table。
- 用户交互：切换 mode、打开工作目录 panel、打开 terminal、浏览 tool policy。
- 表单校验：locked 或 saving 时 toggle disabled。
- 按钮状态：mode 切换 saving 时不可再次切换；terminal drawer close/reset。
- 条件渲染：新线程与老线程布局不同；terminal 在 Web 降级为仅文本。
- 权限差异：guardrail 触发决定是否能真正执行 host/shell 类工具。
- 成功反馈：runtime 切换后 subsequent context 生效；tool policy 成功加载。
- 失败反馈：invalid host_workdir 422，locked profile 409。
- 刷新后状态：runtime profile 持久化恢复；tool policy 页面重复进入一致。
- 重复操作：快速切换 mode、多次打开关闭 panel/terminal。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 对 runtime profile / files 更推荐先 API 自动化，再用 UI 验证切换与展示。
- 必须抓 network：runtime-profile、files/meta、files/tree、tool-policy。
- 如做 host_workdir 绑定测试，需预先准备可写空目录，并通过 API 或测试夹具注入，不应伪造不存在的前端选择器。

### 6.2 E2E 场景清单

#### 场景 1：新线程页展示 runtime toggle
- 目标：验证新线程页存在 sandbox/host 切换 UI。
- 步骤：打开 `/workspace/chats?thread=new`，snapshot，确认 toggle 两个按钮可见。
- 预期：默认选中 sandbox。
- 优先级：P0。

#### 场景 2：切换 host 模式并继续发送消息
- 目标：验证 `execution_mode` 变更影响后续聊天上下文。
- 前置条件：后端允许 host mode。
- 步骤：
  1. 打开新线程。
  2. 点击 host toggle。
  3. 发送消息。
  4. 抓 `/runtime-profile` PUT 与 `/stream` 请求。
- 预期：PUT 成功，后续 stream context 带 `execution_mode=host`。
- 优先级：P0。

#### 场景 3：工作目录 panel 打开与树加载
- 目标：验证 working directory trigger 能打开 panel 并加载 files tree。
- 前置条件：已有线程。
- 步骤：打开线程 -> 点击 WorkingDirectoryTrigger -> 观察 panel 与文件列表。
- 预期：`/files/meta` 与 `/files/tree` 成功，显示 actual_root 或文件项。
- 优先级：P0。

#### 场景 4：tool policy 页面加载
- 目标：验证 `/workspace/tool-policy` 页面展示 scope/rules/catalog。
- 步骤：打开页面，等待加载，查看表格。
- 预期：scope badge 存在；rules/catalog 表格渲染。
- 优先级：P1。

#### 场景 5：locked/invalid host_workdir 失败链路
- 目标：验证治理错误透出。
- 前置条件：通过接口把 profile 置为 locked 或绑定非法目录。
- 步骤：尝试再次切换或更新 host_workdir。
- 预期：收到 409/422；UI 不进入错误的已切换状态。
- 优先级：P1。

#### 场景 6：Web vs Desktop terminal 差异
- 目标：验证 terminal drawer 在 Web 显示降级文案，在 desktop 可用。
- 步骤：Web 打开线程并点击 terminal；桌面环境打开同路径并验证 IPC 终端可用。
- 预期：Web 仅显示 “Terminal is only available in the desktop app”；desktop 可创建终端。
- 优先级：P1。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1、2、3。
- 主失败链路：场景 5。
- 权限受限链路：guardrail/permission request 联测。
- 刷新恢复链路：刷新后 runtime profile/working directory 状态恢复。
- 返回/重进链路：tool policy 页面返回再进一致。
- 重复点击链路：多次切 mode、反复开关 panel。
- 模块间联动链路：runtime mode -> chat context；files tree -> input mention。
- web / desktop-client 差异链路：场景 6。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：runtime toggle、panel 打开、tool policy 页面。
- 适合 `/qa`：治理页面/聊天页交叉回归。
- 适合 report-only：只采集治理面板状态。
- 必须抓 network：runtime-profile、files、tool-policy。
- 必须看 console：切换失败、panel load error。
- 必须截图留证：runtime toggle 初始态、working directory panel、tool policy 页面。

## 7. 数据一致性与状态流转测试
- runtime profile 与 chat context 一致。
- files meta 的 `execution_mode/host_workdir` 与 runtime profile 一致。
- tool policy rules/catalog 与当前 config 一致。
- allow_session profile 与后续 guardrail 决策一致。
- Web/desktop 对同一共享 `/api/*` 语义一致。

## 8. 异常与边界测试
- 缺参：PUT runtime-profile 缺 execution_mode。
- 非法参数：非法 mode、非绝对 host_workdir、路径穿越。
- 空数据：空目录 files tree。
- 资源不存在：files root 不存在。
- 接口 4xx/5xx：runtime-profile conflict/validation。
- 超时：大目录 files/tree、slow daemon。
- 权限不足：host path 不可写。
- 并发更新：多端同时切换 runtime mode。
- 状态非法切换：locked 后修改、改绑已绑定目录。
- 刷新/回退/重进：profile 应持久化。

## 9. 自动化建议
- 适合后端接口自动化：runtime profile、files API、tool policy、guardrail middleware。
- 适合前端 contract / integration 自动化：runtime toggle copy、tool policy page render、terminal web fallback。
- 适合 agent-browser E2E：toggle/panel/tool-policy。
- 适合人工探索式测试：真实 host 目录绑定、桌面终端。
- 最小冒烟集合：toggle、files panel、tool policy 页面。
- 最小回归闭环：runtime profile -> files tree -> chat submit。
- 高收益自动化优先级：P0 是 runtime/files；P1 是 desktop terminal。

## 10. 风险与优先级
- P0 必测项：runtime-profile update、files tree、guardrail permission 分流。
- P1 高价值项：tool policy 页面、host 绑定校验、desktop terminal。
- P2 扩展项：复杂 host 路径场景、超大文件树。
- 最容易漏测的点：Web host mode 允许 null host_workdir；显式 host 绑定才有严格校验。
- 最容易出现线上事故的链路：runtime 切换后 context 未生效、files path traversal、lock/rebind 逻辑错误。
- 上线前必须回归的部分：runtime toggle、files panel、guardrail permission request、tool policy。

