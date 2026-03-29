# 测试文档 01 - Chat / Thread Runtime 模块

## 交付说明
- 文档用途：指导其他 agent 对聊天主链路执行接口测试、UI 测试、agent-browser E2E、回归与自动化补齐。
- 适合交给哪类 agent 执行：后端接口测试 agent、前端 UI/contract 测试 agent、agent-browser E2E agent、回归测试编排 agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + agent-browser E2E 全覆盖。
- 是否建议先做 contract / integration 再做 E2E：是。优先完成 thread state / stream / message grouping 的 contract 与 integration，再进入 E2E。

## 1. 模块说明
- 模块目标：承载用户在线程中发起对话、接收流式回复、查看消息/子任务/文件/待办等全部主聊天体验。
- 核心业务职责：线程初始化、线程状态加载、消息发送、流式事件消费、消息列表分组渲染、聊天中断/恢复、页面级运行时编排。
- 典型用户角色：普通聊天用户、需要持续多轮对话的高级用户、使用 subagent/todo/artifact 输出的操作型用户。
- 上下游依赖：
  - 上游：workspace 聊天路由、用户输入框、local settings、runtime profile、thread files tree。
  - 下游：threads router、ThreadService、NionClient stream、message-level clarification/permission/artifact/subtask 展示。
- 与其他模块的关系：
  - 与 Permission Request 模块共享消息流与 resolve 回放链路。
  - 与 Runtime Profile / Files Workspace 模块共享页面初始化上下文。
  - 与 CLI Tools 模块通过 selected CLI tools / runtime gating 互相影响。
- 关键代码位置：
  - 前端页面：`frontend/src/app/workspace/chats/chat-thread-page.tsx:47`
  - 前端组件：`frontend/src/components/workspace/messages/message-list.tsx:38`
  - 前端 core / client / contract / types：
    - `frontend/src/core/threads/hooks.ts:82`
    - `frontend/src/core/threads/types.ts:30`
    - `frontend/src/core/messages/utils.ts:34`
    - `frontend/src/components/workspace/messages/permission-request.contract.test.ts:4`
  - 后端 router：`backend/app/gateway/routers/threads.py:84`, `backend/app/gateway/routers/threads.py:127`
  - 后端 service：`backend/packages/harness/nion/threads/service.py:15`
  - 后端 model / middleware / guardrail：`backend/packages/harness/nion/threads/models.py`、`backend/packages/harness/nion/threads/service.py`
  - 现有测试文件：
    - `backend/tests/test_cli_tools_runtime_gating.py`
    - `frontend/src/core/threads/desktop-client.test.ts`
    - `frontend/src/components/workspace/messages/permission-request.contract.test.ts`

## 2. 模块边界与测试范围
- 本模块覆盖的功能：
  - thread search / state load / stream
  - ChatThreadPage 首次进入与新线程/旧线程切换
  - MessageList 对不同消息组的渲染
  - InputBox 提交、停止、加载态、错误态
  - thread.values 中 messages / todos / artifacts 的同步展示
- 不属于本模块的功能：
  - permission request 决策细节本身
  - CLI tools 目录页管理细节
  - runtime profile 存储规则
  - settings/config center 持久化规则
- 与其他模块的交叉测试点：
  - stream 返回 permission_request 后，MessageList 是否切换到 PermissionRequestCard
  - stream 返回 artifact/present-files/subagent task 后，聊天页是否正确展示
  - runtime profile / workspacePaths 是否影响输入体验
- 易混淆边界：
  - message list 是展示聚合层，不负责生成 permission request / clarification 数据。
  - ChatThreadPage 负责页面级 orchestration，不等于 thread state 存储层。

## 3. 核心业务链路
1. 用户进入 `/workspace/chats/[thread_id]`，`ChatThreadPage` 通过 `useThreadChat` 获取 `threadId` / `isNewThread` / `isMock`。
2. 页面初始化时：
   - 请求 runtime profile；
   - 请求 thread files tree；
   - 初始化 `useThreadStream`，并在旧线程场景下调用 `getState` 拉取历史 state。
3. 用户在 InputBox 提交消息，`sendMessage(threadId, message)` 触发 `apiClient.streamRun`。
4. 前端消费 SSE：created / values / messages-tuple / error 等事件，合并消息并更新 thread.values。
5. `MessageList` 对消息做 groupMessages：
   - human / assistant 普通消息；
   - clarification；
   - permission-request；
   - present-files；
   - subagent。
6. 如果 stream 完成且页面未聚焦，会触发通知；如果 stream 失败，会在聊天页显示 request error alert。
7. 页面底部持续显示 InputBox 与 TodoList，实现多轮对话。
8. 刷新重进时，通过 `getState` 恢复 messages / todos / artifacts / title。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 搜索线程 | `/api/threads/search` | POST | 分页搜索线程 | 线程列表/客户端 | 存在线程数据或空仓库 | `thread_id/limit/offset/sort_by/sort_order` | 线程列表 | 返回排序正确的线程集合 | limit/offset 非法 | 暂无显式权限控制，确认不误报 403 | thread_id 不存在时应返回空数组 | 空仓库返回空数组 | sort 字段非法的处理 | 重复查询结果一致 | 排序、分页、字段完整性 |
| 获取线程状态 | `/api/threads/{thread_id}/state` | GET | 读取线程最新 state | ChatThreadPage / desktop client | thread_id 已知 | path 中 thread_id | `values/messages/title/artifacts` | 已存在线程返回持久化 state | 非法 thread_id 格式 | 暂无显式权限控制 | 未存在线程时自动 upsert 默认 state | 空线程返回默认 title/messages | state 结构缺失字段时回填默认 | 并发首次访问不应生成脏状态 | 未存在线程也返回可用 state |
| 更新线程状态 | `/api/threads/{thread_id}/state` | PATCH | 更新线程 values | 前端辅助操作/内部能力 | 存在线程或允许创建 | `values` | 更新后 state | 局部字段更新成功 | payload 无 values | 权限不足（如未来加鉴权）预留 | 不存在线程时自动创建或明确错误 | 空 values 更新 | 非法 values 类型 | 重复 patch 幂等 | 更新字段仅影响目标键 |
| 删除线程 | `/api/threads/{thread_id}` | DELETE | 删除线程 | 前端/桌面客户端 | 线程存在 | path thread_id | 204 | 已存在线程删除成功 | 非法 thread_id | 权限不足预留 | 删除不存在线程行为要明确 | 删除后重新 getState 默认空线程 | 已删除再删行为 | 连续删除不应 500 | 删除后搜索/状态一致 |
| 流式运行线程 | `/api/threads/{thread_id}/stream` | POST | 提交消息并流式返回 agent 结果 | ChatThreadPage / desktop client | payload 构造完整 | `messages/context/config` | SSE `created/values/error/...` | 正常返回 created + values + 完成 | 缺少 messages/context | 权限受限工具走 permission request/denied | thread 不存在也可开始新流 | 空消息数组处理 | context 缺关键字段回退默认 | 重复点击提交、快速 stop/re-submit | SSE 顺序、错误事件、最终 values 落库 |

重点补充断言：
- `stream_thread` 必须先发 `created`，再转发 service.stream 事件。
- service.stream 结束后必须将 `latest_values` 写回 repository。
- SSE error 事件必须被前端/桌面客户端识别为失败而非静默吞掉。

## 5. UI 测试文档
- 页面入口：`/workspace/chats/new`、`/workspace/chats/[thread_id]`
- 首屏渲染：
  - 新线程显示 Welcome / RuntimeModeToggle / InputBox
  - 老线程显示 header、title、token usage、message list、TodoList、InputBox
- 加载态：
  - `thread.isThreadLoading && messages.length === 0` 显示 MessageListSkeleton
  - stream 过程中显示 StreamingIndicator
- 空态：
  - 新线程无消息时是 new-chat stage
  - 老线程无消息但 state 已存在时页面不应崩溃
- 错误态：thread request error alert 显示可读文案
- 列表/详情/卡片/面板展示：
  - 普通 human / assistant 消息
  - clarification card
  - permission request card
  - artifact file list
  - subtask card
  - todo list
- 用户交互：
  - 输入并提交消息
  - stop 中断 stream
  - 刷新页面恢复历史消息
  - 切换线程 URL 后 state 同步
- 表单校验：空消息、带文件消息、上传过程禁用
- 按钮状态：loading / disabled / stop 状态切换正确
- 条件渲染：`isNewThread` 前后 header / composer / title 不同
- 权限差异：permission request 出现时消息流切换为决策卡
- 成功反馈：流式消息逐步出现；失焦完成时有 notification
- 失败反馈：请求失败时 alert；SSE error 时停止 loading
- 刷新后状态：messages/todos/artifacts/title 恢复
- 返回/切页后状态：从详情返回线程列表再重进，消息顺序不丢
- 重复点击/重复操作：连续点击 submit / stop 不应造成重复消息或死 loading

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 **agent-browser**。
- 优先结合 `/browse`；当需要批量发现问题时可用 `/qa`；仅报告时用 `/qa-only`。
- 以真实用户链路执行，不做纯静态页面检查。
- 必要时采集 screenshot / network / console / 页面文案证据。
- 必须覆盖异步加载、报错反馈、刷新恢复、页面跳转、返回重进。

### 6.2 E2E 场景清单

#### 场景 1：新线程主成功链路（P0）
- 场景目标：验证用户从新线程发起一次成功对话并看到完整消息流。
- 前置条件：服务可用，默认模型可响应。
- 测试数据：用户输入“帮我总结当前仓库聊天架构”。
- 执行步骤：
  1. 用 agent-browser 打开 `/workspace/chats/new`。
  2. 断言 Welcome、RuntimeModeToggle、输入框可见。
  3. 在输入框输入消息并提交。
  4. 监听 URL 从 new 变为 `/workspace/chats/{thread_id}`。
  5. 观察 message list 中先出现人类消息，再出现 assistant 流式内容。
  6. 等待 stream 完成。
- 预期结果：thread 创建成功，页面切换到老线程布局，assistant 回复完整可见。
- 关键断言：URL 改变、created 后 state 建立、message 顺序正确、loading 结束。
- 证据建议：提交前后截图、network 中 `/stream` 请求、console 无未处理异常。
- 自动化建议：适合 agent-browser 自动化。

#### 场景 2：刷新恢复链路（P0）
- 目标：验证已存在线程刷新后完整恢复。
- 前置条件：已有至少 1 轮完整消息。
- 步骤：打开线程页 → 记录消息数/标题 → 刷新 → 等待恢复。
- 预期：标题、消息数、最后一条回复、todo/artifact 区域保持一致。
- 关键断言：`getState` 加载后 UI 与刷新前一致。
- 证据：刷新前后截图、network 中 `/state`。

#### 场景 3：stream 失败后的 UI 反馈（P0）
- 目标：验证后端 SSE error 时前端能感知失败。
- 前置条件：构造后端错误或 mock 错误环境。
- 步骤：触发一条会导致后端失败的请求；观察 UI。
- 预期：出现 thread error alert，stream 停止，输入框恢复可操作。
- 关键断言：没有无限 loading，没有空白失败。
- 证据：console、network、alert 截图。

#### 场景 4：返回/重进链路（P1）
- 目标：验证离开线程后再次进入不丢上下文。
- 步骤：进入已有线程 → 返回列表/其他页 → 再次进入同一线程。
- 预期：消息、标题、底部 composer 状态一致。

#### 场景 5：重复提交/快速中断链路（P1）
- 目标：验证高频交互下不产生重复消息或异常状态。
- 步骤：快速双击 submit；另测提交后立刻点 stop，再重新提交。
- 预期：不会出现重复 human message、不会卡死 loading。

#### 场景 6：列表→详情→返回联动（P1）
- 目标：验证线程列表与详情一致性。
- 步骤：从线程列表进入详情，记录 title；返回列表后核对；再重进。
- 预期：title 与最后消息摘要一致。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1
- 主失败链路：场景 3
- 权限受限链路：与模块 02 联测
- 刷新恢复链路：场景 2
- 返回/重进链路：场景 4
- 重复点击/重复提交链路：场景 5
- 接口报错后的 UI 反馈链路：场景 3
- 列表→详情→返回链路：场景 6
- 模块间联动链路：与 permission / runtime profile / cli tools 联测
- web / desktop-client 差异链路：交给模块 05 执行

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：新线程发起、刷新恢复、返回重进、重复点击验证。
- 适合 `/qa`：整条聊天主链路巡检，顺带发现 message grouping 或 loading 态问题。
- 适合 report-only：仅确认当前环境聊天主链路问题列表时。
- 必须抓 network：stream 请求、state 请求、refresh 后恢复。
- 必须看 console：stream 失败、页面 hydration/JS 异常。
- 必须截图留证：新线程首屏、成功回复完成态、失败 alert、刷新前后对比。

## 7. 数据一致性与状态流转测试
- 列表与详情一致性：thread title/last message 在列表与详情一致。
- message / thread 状态同步：stream values 落库后，刷新仍保持一致。
- permission / cli tool 状态同步：由联测模块覆盖，但需确认 message list 的分组结果一致。
- 前后端数据一致性：前端 `mergeMessages` 不应丢消息或重复消息。
- 缓存、重拉、乐观更新、回滚：刷新后以服务端 state 为准；发送失败后不应残留错误的 optimistic 状态。
- web 与 desktop-client 状态差异：桌面端也必须识别 created/custom/error SSE 事件。

## 8. 异常与边界测试
- 缺参：stream 缺 messages/context/config
- 非法参数：threadId 特殊字符、sort 参数非法
- 超长输入：超长 prompt 是否仍能展示错误/处理结果
- 特殊字符：Markdown、代码块、中文/英文混输
- 空数据：空线程 state
- 资源不存在：不存在 thread 直接 GET state / DELETE
- 接口 4xx / 5xx：stream / state
- 超时：慢响应下 loading / stop
- 慢网络：SSE 分段延迟时 UI 是否稳定
- 权限不足：联动 permission request
- 并发更新：多个标签页同时打开同线程
- 状态非法切换：stream 进行中切换线程
- 刷新/回退/重进问题：状态是否污染
- 重复操作问题：双击提交、连续 stop

## 9. 自动化建议
- 适合后端接口自动化：threads search/state/update/delete/stream 基本契约。
- 适合前端 contract / component / integration 自动化：message grouping、error copy、ChatThreadPage wiring、MessageList skeleton/branch rendering。
- 适合 agent-browser E2E 自动化：新线程成功链路、刷新恢复、失败反馈、返回重进。
- 适合人工探索式测试：慢网络、并发标签页、长对话累计后刷新。
- 最小冒烟集合：新线程成功链路 + 刷新恢复 + stream 失败反馈。
- 最小回归闭环：新线程 → 完成回复 → 刷新 → 返回重进 → 再发一轮。
- 高收益自动化优先级：P0 聊天主成功链路 > SSE error 反馈 > state 恢复。

## 10. 风险与优先级
- P0 必测项：新线程成功链路、state 恢复、stream 失败反馈、消息分组正确。
- P1 高价值项：返回重进、重复点击、列表详情一致性。
- P2 扩展项：多标签页并发、极长会话、异常中断恢复。
- 最容易漏测的点：SSE error 后 UI 恢复、刷新后 todos/artifacts 一致性。
- 最容易出现线上事故的链路：`/stream` 事件顺序异常、消息重复/丢失、getState 恢复不完整。
- 上线前必须回归的部分：主成功链路、刷新恢复、错误反馈、与 permission request 的联动展示。
