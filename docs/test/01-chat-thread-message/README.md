# 测试文档 01 - Chat / Thread / Message 模块

- 文档用途：指导其他 agent 基于真实线程链路执行接口测试、UI 测试、agent-browser E2E、回归与自动化补齐。
- 适合交给哪类 agent 执行：后端接口测试 agent、前端交互测试 agent、E2E/QA agent、回归自动化 agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + agent-browser E2E 全覆盖。
- 是否建议先做 contract / integration 再做 E2E：是，先做 threads/suggestions/uploads/artifacts 的 contract 与 integration，再做 E2E。

## 1. 模块说明

- 模块目标：承载用户在 workspace 中的新建会话、继续会话、消息流式回复、澄清回复、建议问题、产物浏览、工作目录查看、导出与保存到 Notebook 的核心交互。
- 核心业务职责：线程搜索、线程状态加载、消息提交、SSE 流式消费、消息分组渲染、follow-up suggestions 生成、文件上传与产物访问、终端抽屉入口。
- 典型用户角色：Web 用户、桌面端用户、Bridge 透传到线程的远端对话用户。
- 上下游依赖：
  - 上游：workspace 路由、local settings、runtime profile、CLI 选择、上传文件。
  - 下游：permission request、tool execution、artifact 面板、Notebook 导入、terminal、notifications。
- 与其他模块关系：
  - 与模块 02：消息流中插入 permission request card。
  - 与模块 03：输入框可注入 CLI 选择结果，线程服务会据此启用 CLI 运行时。
  - 与模块 04：线程运行时上下文决定 execution mode、工作目录树和 tool policy 可达性。
  - 与模块 06：保存到 Notebook、Notebook 导入聊天内容。
  - 与模块 09：desktop thread client 和 bridge thread client 复用同一 threads 路由。
- 关键代码位置：
  - 前端页面：`frontend/src/app/workspace/chats/page.tsx`、`frontend/src/app/workspace/chats/chat-thread-page.tsx`
  - 前端组件：`frontend/src/components/workspace/chats/chat-box.tsx`、`frontend/src/components/workspace/input-box.tsx`、`frontend/src/components/workspace/messages/message-list.tsx`、`frontend/src/components/workspace/thread-request-error-alert.tsx`、`frontend/src/components/workspace/terminal/terminal-drawer.tsx`
  - 前端 core / client / contract / types：`frontend/src/core/threads/hooks.ts`、`frontend/src/core/threads/types.ts`、`frontend/src/core/threads/utils.ts`、`frontend/src/core/files/api.ts`、`frontend/src/core/uploads/api.ts`、`frontend/src/core/artifacts/utils.ts`
  - 后端 router：`backend/app/gateway/routers/threads.py`、`backend/app/gateway/routers/uploads.py`、`backend/app/gateway/routers/artifacts.py`、`backend/app/gateway/routers/suggestions.py`
  - 后端 service：`backend/packages/harness/nion/threads/service.py`
  - 后端 model / middleware / guardrail：`backend/packages/harness/nion/threads/models.py`、`backend/packages/harness/nion/threads/repository.py`
  - 现有测试文件：`backend/tests/test_threads_router.py`、`backend/tests/test_thread_repository.py`、`backend/tests/test_thread_event_logging.py`、`backend/tests/test_uploads_router.py`、`backend/tests/test_files_api.py`、`backend/tests/test_artifacts_router.py`、`backend/tests/test_suggestions_router.py`、`frontend/src/components/workspace/chats/chat-box.artifacts.contract.test.ts`、`frontend/src/components/workspace/recent-chat-list.contract.test.ts`、`frontend/src/core/threads/cache.test.ts`、`frontend/src/core/threads/error-copy.test.ts`

## 2. 模块边界与测试范围

- 本模块覆盖的功能：
  - 新建线程、进入既有线程、线程列表搜索。
  - 发送消息、停止生成、接收 SSE 流。
  - 消息分组显示、AI 文本、tool 结果、present files、subtasks、clarification 入口。
  - 会话结束后建议问题生成与点击发送。
  - 上传文件、产物列表、产物详情、工作目录面板、终端抽屉入口。
  - 保存到 Notebook、导出会话入口显示与行为联动。
- 不属于本模块的功能：
  - 权限批准逻辑本身属于模块 02。
  - CLI catalog 管理页属于模块 03。
  - runtime profile / tool policy 的独立治理逻辑属于模块 04。
  - 设置保存逻辑属于模块 05。
- 与其他模块的交叉测试点：
  - 消息流中 permission request 的插入与确认。
  - follow-up suggestions 受 settings 中 suggestions model 影响。
  - 产物导出后保存到 Notebook 的跨模块联动。
  - thread values.artifacts 与 artifact panel 的一致性。
- 易混淆边界：
  - `MessageList` 只负责渲染和 group，不负责产生权限或澄清。
  - `InputBox` 同时承担 mention、follow-up、上传、mode/context 选择，容易被误当成纯输入框。
  - artifacts panel 和 working directory panel 共用 `ChatBox`，但数据源不同。

## 3. 核心业务链路

- 从哪个入口进入：
  - `/workspace/chats` 无 `thread` 查询参数时进入线程搜索/列表页。
  - `/workspace/chats?thread=new` 进入新会话 stage。
  - `/workspace/chats?thread={id}` 进入真实线程页。
- 页面初始化做什么：
  - `useThreads()` 拉取线程列表。
  - `useThreadStream()` 在有 threadId 时先调 `getState` 加载历史消息。
  - 线程页额外拉 `runtime-profile` 和 `files/tree` 以支持 mode 和 workspace mentions。
- 调用哪些接口：
  - `POST /api/threads/search`
  - `GET /api/threads/{id}/state`
  - `PATCH /api/threads/{id}/state`
  - `POST /api/threads/{id}/stream`
  - `POST /api/threads/{id}/suggestions`
  - `POST /api/threads/{id}/uploads`
  - `GET /api/threads/{id}/uploads/list`
  - `GET /api/threads/{id}/artifacts/{path}`
  - `GET /api/threads/{id}/files/meta/tree`
- 用户执行哪些关键操作：输入消息、上传文件、点击 follow-up、打开 artifact panel、切换到 working directory、点击保存到 Notebook、打开 terminal。
- 状态如何变化：`isNewThread -> false`、`isLoading true/false`、`messages` 增量合并、`values.artifacts` 更新、`followupsLoading` 更新、`terminalOpen` 切换。
- UI 如何反馈：streaming indicator、thread title、token usage、error alert、suggestion pills、artifact 列表、terminal drawer。
- 数据如何同步：`useThreadStream` 通过 `mergeMessages` 合并 snapshot 与 SSE；`ChatBox` 用 `thread.values.artifacts` 刷新右侧面板；follow-up suggestions 取最近 6 条 human/ai 文本生成。
- 与哪些模块联动：权限模块、CLI 工具模块、runtime governance、Notebook、Bridge/desktop。
- 异常如何处理：线程/网络错误通过 `getThreadRequestErrorCopy` 显示；SSE error 抛到 thread.error；suggestions 失败时静默清空；artifact/path 请求失败时对应面板错误化。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 线程搜索 | `/api/threads/search` | POST | 查询线程列表或单线程 | `useThreads` / bridge client | 仓库有线程记录或为空 | `thread_id` `limit` `offset` `sortBy` `sortOrder` | thread record 列表 | 正常返回按更新时间排序列表 | 非法 sortBy 回退默认；limit/offset 边界 | 无显式权限控制 | 指定不存在 thread_id 返回空数组 | 仓库为空返回空数组 | deleted 线程不可见 | 并发 search 不应污染数据 | 返回结构包含 `thread_id values updated_at` |
| 获取线程状态 | `/api/threads/{id}/state` | GET | 初始加载线程消息 | `useThreadStream` | threadId 已知 | path `thread_id` | 单线程 record | 既有线程返回现有 values | thread_id 为空路径级失败 | 无 | 不存在线程时自动 upsert 默认线程 | 默认 messages 空数组 | 无 | 重复 GET 一致 | 默认返回 `title=Untitled messages=[] artifacts=[]` |
| 更新线程状态 | `/api/threads/{id}/state` | PATCH | 外部更新 thread values | desktop/bridge 辅助逻辑 | threadId 有效 | `values` | 更新后 record | 正常更新 title/bridge/meta | payload 非 dict | 无 | 不存在线程时自动创建 | `values={}` 仍返回 record | values 中非法字段需保留可序列化语义 | 并发 PATCH 最后写入生效 | `updated_at` 变化且 merged values 生效 |
| 流式执行线程 | `/api/threads/{id}/stream` | POST | 发送消息并流式接收事件 | `useThreadStream`、bridge thread client | 有 message 文本；模型可用 | `messages` `context` `config` | SSE `created/messages-tuple/values/error` | 主链路完成并落盘最终 values | messages 为空、context 非法、config 超限 | 模型账户不可用/鉴权失败/guardrail deny | 线程不存在也可新建并返回 created | 空返回应仍完成 SSE | stream 过程中 provider error | 双击发送、并发同线程 stream、stop 后终止 | created 事件携带 thread_id；最终 values 持久化 |
| 生成建议问题 | `/api/threads/{id}/suggestions` | POST | 会话结束后生成 follow-up | `InputBox` | 最近存在 human/ai 文本 | `messages` `n` | `suggestions[]` | 返回 1-5 条短问题 | `n` 越界、messages 结构异常 | 模型不可用时应兜底空数组 | thread_id 不存在但只依赖请求体，仍可工作 | messages 空数组返回空 suggestions | 非 JSON 模型输出应解析失败并兜底空数组 | 连续触发只应针对新 lastAiId 调一次 | 永不抛到 UI；失败时返回空数组 |
| 文件上传 | `/api/threads/{id}/uploads` | POST | 上传附件，必要时转 markdown | `uploadFiles` | 有文件对象 | multipart `files[]` | `files[]` 含 virtual_path/artifact_url | 普通文件上传成功；可转换文件生成 markdown companion | 无文件、文件名非法 | 无 | thread 不存在也会创建 uploads dir | 0 个有效文件应报错或空结果 | 文件转换失败、写盘失败 | 同名重复上传覆盖/替换语义需确认 | 返回包含 `path virtual_path artifact_url` |
| 列出上传文件 | `/api/threads/{id}/uploads/list` | GET | 给 UI 展示当前上传清单 | 上传面板等 | uploads 目录存在或不存在 | path | `files count` | 已上传文件完整返回 | 无 | 无 | 目录不存在返回空列表 | 空目录 count=0 | 无 | 重复 GET 一致 | `virtual_path` 与 artifact url 可用 |
| 访问产物 | `/api/threads/{id}/artifacts/{path}` | GET | 查看/下载产物或 skill 包内部文件 | Artifact 面板 | 路径可解析到真实文件 | path, `download` query | 文本/HTML/二进制响应 | 文本、HTML、二进制、`.skill/SKILL.md` 都可访问 | 路径非法/不是文件 | 路径穿越应拒绝 | 文件不存在 404 | 空文件可正常返回 | download 与 inline 模式切换 | 并发读取同文件一致 | MIME/Content-Disposition 正确 |
| 文件树/元数据 | `/api/threads/{id}/files/meta` `/tree` | GET | 工作目录面板与 mention path 数据源 | `ChatBox` `InputBox` | threadId 已知 | `root depth include_hidden max_nodes` | meta/tree | sandbox 根与 outputs 根都可列举 | depth/max_nodes 越界 | host 绑定路径越界 | 根路径不存在 404 | 空目录返回空数组 | path traversal 检测 | 并发刷新不应脏读 | `actual_root` 与 `execution_mode/host_workdir` 一致 |

## 5. UI 测试文档

- 页面入口：
  - `/workspace/chats`
  - `/workspace/chats?thread=new`
  - `/workspace/chats?thread={threadId}`
- 首屏渲染：
  - 列表页展示搜索框和线程列表。
  - 新线程页展示 `Welcome`、RuntimeModeToggle、InputBox、suggestion chips。
  - 已有线程页展示 ThreadTitle、MessageList、InputBox、TodoList 占位、WorkingDirectoryTrigger、ExportTrigger、SaveToNotebookTrigger、Terminal 按钮。
- 加载态：
  - `isThreadLoading && messages.length===0` 时显示 `MessageListSkeleton`。
  - follow-up suggestions 生成时显示 loading pill。
- 空态：
  - 无线程列表时 recent list 可为空；新线程 stage 为空态文案正确。
  - artifact / working directory panel 无文件时展示 `ConversationEmptyState`。
- 错误态：
  - thread.error 时显示 `ThreadRequestErrorAlert`。
  - 网络失败不应导致页面崩溃，错误提示应保留在 composer 上方。
- 列表/详情/卡片/面板展示：
  - 线程列表 title、bridge badge、pending clarification badge 正确。
  - MessageList 能正确区分 human/assistant/clarification/permission/subtask/present-files。
  - artifact detail 与 file list 切换正常。
- 用户交互：
  - 输入消息、点击发送、点击 stop、点击 follow-up suggestion、点击 artifact、切换 panel、打开 terminal。
- 表单校验：
  - 输入框 disabled 条件包括静态模式、上传中、runtime profile loading/saving。
  - follow-up confirm 弹窗在输入框已有内容时触发 append / replace 二选一。
- 按钮状态：
  - streaming 时 submit/stop 状态正确。
  - terminal button 仅非新线程显示。
  - export/save-to-notebook 仅非新线程显示。
- 条件渲染：
  - `isNewThread` 与非新线程的 header/body 布局完全不同。
  - mock/static/demo/desktop 差异文本正确。
- 权限差异：
  - 由模块 02 驱动的 permission card 应在聊天流中正确插入并替换普通 markdown 渲染。
- 成功反馈：
  - 消息流结束后生成 suggestions。
  - 通知权限允许时，失焦完成会话会出现系统通知。
- 失败反馈：
  - suggestions 失败时只是不显示，不应保留 loading。
  - terminal 在非桌面环境显示降级文案。
- 刷新后状态：
  - 刷新线程页后消息、artifacts、title 能通过 `getState` 恢复。
- 返回/切页后状态：
  - 从列表到线程再返回，列表搜索词重置，但线程状态不应损坏。
- 重复点击/重复操作：
  - 连点发送、连点 follow-up、快速开关 artifact panel 和 terminal，不应出现重复消息或错误状态卡死。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 优先结合 `/browse` 做稳定页面状态验证，结合 `/qa` 做批量回归，必要时 report-only 生成证据。
- 以真实用户链路执行，不做纯 DOM 巡检。
- 必须采集：
  - 关键场景 screenshot
  - 线程流式过程中的 network 请求（至少 `/api/threads/*/stream`、`/api/threads/*/suggestions`）
  - 报错场景 console / network 证据
- 覆盖异步加载、刷新恢复、返回重进、重复提交、接口报错后的 UI 反馈。

### 6.2 E2E 场景清单

#### 场景 1：新建线程并完成主成功链路
- 场景目标：验证 `new thread -> send -> stream -> suggestions -> artifact/workdir UI` 主成功链路。
- 前置条件：后端可用；存在可正常响应的模型；浏览器会话已进入 workspace。
- 测试数据：普通文本问题，如“请生成一个 hello world 文件并解释它”。
- 执行步骤：
  1. `agent-browser open http://localhost:2026/workspace/chats?thread=new`
  2. `agent-browser wait --load networkidle`
  3. `agent-browser snapshot -i`
  4. 定位输入框 ref，填入测试问题并提交。
  5. `agent-browser wait --text "hello"` 或等待消息流稳定。
  6. `agent-browser network requests --type xhr,fetch`
  7. 重新 snapshot，确认消息列表、Working Directory、Export、SaveToNotebook、Terminal 按钮存在。
  8. 如有 follow-up suggestion，点击一个建议项并根据弹窗选择 replace 或 append 发送。
- 预期结果：创建真实 threadId；消息正常流式出现；会话结束后展示建议问题；header 按钮出现。
- 关键断言：`/api/threads/{id}/stream` 返回 200 且有 SSE；follow-up 请求触发一次；MessageList 中至少有一条 human + 一条 ai。
- 证据建议：首屏、新线程发送后、生成建议问题后的 screenshot；network 请求导出。
- 自动化建议：适合 agent-browser 自动化。
- 优先级：P0。

#### 场景 2：线程刷新恢复
- 场景目标：验证刷新后通过 `getState` 恢复消息与产物。
- 前置条件：已有包含消息和产物的线程。
- 测试数据：可复用场景 1 创建的线程。
- 执行步骤：
  1. 打开目标线程 URL。
  2. 记录页面中最后一条消息与 artifact 按钮状态。
  3. 执行 `agent-browser open <同一URL>` 或刷新。
  4. 等待加载结束，重新 snapshot。
- 预期结果：消息列表恢复、标题恢复、artifact 面板仍可打开。
- 关键断言：`GET /api/threads/{id}/state` 成功；UI 不出现 skeleton 长时间悬挂。
- 证据建议：刷新前后截图、state 请求网络记录。
- 自动化建议：适合自动化冒烟。
- 优先级：P0。

#### 场景 3：接口失败后的错误反馈
- 场景目标：验证 stream 出错时 `ThreadRequestErrorAlert` 文案与 UI 可恢复性。
- 前置条件：通过 mock/代理/测试环境制造模型不可用或 runtime 不可用。
- 测试数据：任意文本。
- 执行步骤：
  1. 进入新线程页。
  2. 提交消息。
  3. 在后端返回 401/503/网络错误场景下观察 UI。
- 预期结果：出现错误 alert，描述与错误类型匹配；输入框回到 ready/error 态，可再次输入。
- 关键断言：错误 copy 正确映射 authentication/model unavailable/runtime unavailable。
- 证据建议：alert 截图、console/network 错误日志。
- 自动化建议：适合集成环境注入失败自动化。
- 优先级：P0。

#### 场景 4：上传文件与消息发送联动
- 场景目标：验证文件上传期间 composer 状态、消息中的文件卡片与 uploads 路由联动。
- 前置条件：准备 1 个普通文本文件和 1 个可转换文档文件。
- 测试数据：`notes.txt`、`sample.pdf`。
- 执行步骤：
  1. 打开新线程页。
  2. 用 `agent-browser snapshot -i` 找到附件入口并上传文件。
  3. 等待上传完成，发送关联问题。
  4. 打开消息列表中文件卡片或 artifact 面板。
- 预期结果：上传中时输入框禁用；上传完成后消息携带文件；可转换文件带 markdown companion。
- 关键断言：`POST /uploads` 成功；`GET /uploads/list` 返回文件；消息中显示 uploaded file card。
- 证据建议：上传前后截图、uploads 网络记录。
- 自动化建议：适合 E2E 自动化，但需稳定选择器。
- 优先级：P1。

#### 场景 5：列表 -> 详情 -> 返回链路
- 场景目标：验证线程列表搜索、点击进入、返回列表的基本导航闭环。
- 前置条件：至少有 2 个线程。
- 测试数据：线程标题关键字。
- 执行步骤：
  1. 打开 `/workspace/chats`。
  2. 在搜索框输入关键字。
  3. 点击某个线程。
  4. 验证 URL 带 `thread=`。
  5. 使用浏览器后退返回列表。
- 预期结果：详情页加载正常；返回后仍在列表页可继续操作。
- 关键断言：线程标题与列表项一致；bridge badge/pending clarification badge 不丢。
- 证据建议：列表筛选截图、详情截图。
- 自动化建议：适合自动化。
- 优先级：P1。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1。
- 主失败链路：场景 3。
- 权限受限链路：由模块 02 交叉覆盖，但必须验证消息流插入 card。
- 刷新恢复链路：场景 2。
- 返回/重进链路：场景 5。
- 重复点击/重复提交链路：场景 1 扩展，双击发送与 follow-up 连点。
- 接口报错后的 UI 反馈链路：场景 3。
- 列表→详情→返回链路：场景 5。
- 模块间联动链路：上传/产物/Notebook/permission。
- web / desktop-client 差异链路：terminal 在 Web 降级、desktop thread client 见模块 09。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：线程主链路、列表/详情切换、刷新恢复、follow-up 点击。
- 适合 `/qa`：高频回归，尤其是发送、刷新、错误提示、artifact panel。
- 适合 report-only：纯冒烟巡检、建议问题和 UI 回归截图。
- 必须抓 network：stream、suggestions、uploads、artifacts、files/tree。
- 必须看 console：stream error、suggestions parse failure、terminal unavailable。
- 必须截图留证：新线程 stage、错误 alert、follow-up 弹窗、artifact 空态/非空态。

## 7. 数据一致性与状态流转测试
- 列表与详情一致性：列表 title 与 `ThreadTitle` 一致；更新时间变化后排序正确。
- message / thread / permission / cli tool 状态同步：发送消息后 `messages` 和 `values.messages` 最终一致；permission request 出现时消息组类型正确。
- 设置变更对行为的影响：suggestions model 配置变更后新的 follow-up 仍生成；local settings 的 model/mode 会进入 context。
- 前后端数据一致性：SSE `values` 最终应与后续 `getState` 返回一致。
- 缓存、重拉、乐观更新、回滚：`mergeMessages` 不应重复消息；refresh 后 query 与本地 state 对齐。
- web 与 desktop-client 状态差异：terminal 仅桌面可用；desktop backend base url 注入不应影响 Web 路由。
- 桌面开发态后续问题一致性：`POST /api/threads/{id}/suggestions` 与点击 suggestion 后触发的 `/api/threads/{id}/stream` 必须命中同一 desktop runtime base URL，不能出现 suggestions 成功而 stream 因走到旧 gateway/env 地址报 `Failed to fetch`。

## 8. 异常与边界测试
- 缺参：空 messages、空 threadId、无文件上传。
- 非法参数：异常 sortBy、非法 artifact path、非法 root 参数。
- 超长输入：超长文本消息、超长 follow-up suggestion 文本。
- 特殊字符：中英文混输、markdown、emoji、shell 字符。
- 空数据：空线程、空 suggestions、空 uploads list、空 artifacts。
- 资源不存在：不存在 threadId、artifact 不存在、files root 不存在。
- 接口 4xx / 5xx：stream、uploads、artifacts、suggestions 任意失败。
- 超时：长时间流式回复、suggestions 慢响应。
- 慢网络：artifact/threads tree 延迟时 UI 不崩。
- 权限不足：与模块 02/04 联测。
- 并发更新：多 tab 同线程同时发消息/刷新。
- 状态非法切换：stream 未结束前重复 stop / resend。
- 刷新/回退/重进问题：见 E2E 场景 2、5。
- 重复操作问题：双击 suggestion、双击发送。

## 9. 自动化建议
- 适合后端接口自动化：threads router、uploads、artifacts、suggestions。
- 适合前端 contract / component / integration 自动化：MessageList group 渲染、InputBox follow-up、ThreadRequestErrorAlert、ChatBox artifact panel。
- 适合 agent-browser E2E 自动化：新建线程、刷新恢复、列表→详情→返回、上传联动、错误提示。
- 适合人工探索式测试：长对话、复杂 markdown、超大文件、stream 中 stop/retry。
- 最小冒烟集合：新建线程发送 1 条消息；刷新恢复；打开 artifact/workdir；错误提示；follow-up 点击发送。
- 最小回归闭环：threads search + stream + suggestions + uploads + artifacts + save-to-notebook 按一条链路覆盖。
- 高收益自动化优先级：P0 是 stream + refresh + error；P1 是 uploads/artifacts/follow-up。

## 10. 风险与优先级
- P0 必测项：发送消息主链路、刷新恢复、stream 出错提示、suggestions 生成、消息分组正确。
- P1 高价值项：上传文件、artifacts/working directory panel、save-to-notebook、列表搜索与导航。
- P2 扩展项：长会话、复杂多媒体消息、极限慢网络。
- 最容易漏测的点：follow-up suggestions 只在 streaming 结束后触发，且基于 lastAiId 去重；artifact panel 与 working-directory panel 共用容器，容易互相影响。
- 最容易出现线上事故的链路：SSE 流中断、messages 合并重复、刷新后状态丢失、错误 copy 错误映射。
- 上线前必须回归的部分：新建/继续线程、错误告警、刷新恢复、suggestions、artifact/working-directory 面板。
