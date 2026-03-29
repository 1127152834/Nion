# 测试文档 02 - Permission Request 模块

- 文档用途：指导其他 agent 对 guardrail 触发的权限请求链路执行接口、UI、agent-browser E2E 与回归测试。
- 适合交给哪类 agent 执行：后端策略/路由测试 agent、前端消息流 UI 测试 agent、E2E/QA agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是，先做 guardrail middleware 与 resolve router，再做聊天流中的 E2E。

## 1. 模块说明
- 模块目标：在工具调用被 guardrail 拦截时，把“拒绝或待批准”的控制流转成用户可理解、可操作的权限请求卡片，并把决策回写线程状态与后续执行链路。
- 核心业务职责：
  - Guardrail 决策为 `approval_required` 时生成 `permission_request` ToolMessage。
  - 在 thread store 中创建 request record、维护 pending/allow_session/allow/deny/consumed 状态。
  - 前端从消息流中提取最近未被人类消息覆盖的 pending request，展示卡片并提交决策。
  - 决策为 allow/allow_session 时返回 `original_message_text`，必要时带 `replay_payload` 供前端回放。
- 典型用户角色：执行敏感工具调用的聊天用户、bridge 渠道用户、CLI tools 安装场景用户。
- 上下游依赖：
  - 上游：GuardrailMiddleware、ToolCallRequest、thread context、human 原始消息。
  - 下游：threads resolve route、前端 `PermissionRequestCard`、thread replay、CLI runtime gating。
- 与其他模块关系：
  - 与模块 01：消息流插卡、用户点击 allow/deny 后重新触发聊天。
  - 与模块 03：CLI 安装/更新类工具是最典型的 workspace permission request 来源。
  - 与模块 04：thread permission profile、pending allow、guardrail provider 都属于治理层。
  - 与模块 09：bridge surface 使用 `/bridge/permissions/.../resolve` 路由。
- 关键代码位置：
  - 前端页面/组件：`frontend/src/components/workspace/messages/permission-request-card.tsx`、`frontend/src/components/workspace/messages/message-list.tsx`
  - 前端 core / contract / types：`frontend/src/core/threads/permission-request.ts`、`frontend/src/core/threads/types.ts`、`frontend/src/components/workspace/messages/permission-request.contract.test.ts`
  - 后端 router：`backend/app/gateway/routers/threads.py`
  - 后端 service / store：`backend/packages/harness/nion/thread_permissions.py`
  - 后端 middleware / guardrail：`backend/packages/harness/nion/guardrails/middleware.py`
  - 现有测试文件：`backend/tests/test_guardrail_middleware.py`、`backend/tests/test_thread_permission_router.py`、`backend/tests/test_thread_permissions_store.py`

## 2. 模块边界与测试范围
- 本模块覆盖的功能：
  - `permission_request` ToolMessage 构造。
  - pending request 存储、allow_session profile、一次性 allow 消费、deny 状态。
  - 前端 message stream 中的 card 提取与渲染。
  - resolve route 返回 `consumed`、`original_message_text`、`replay_payload`。
- 不属于本模块的功能：
  - 被批准后真正工具如何执行属于原工具模块。
  - tool policy 规则配置属于模块 04/05。
- 与其他模块的交叉测试点：
  - CLI 安装请求带 replay payload。
  - bridge surface 通过专用 bridge resolve 路由。
  - thread `resolved_permission_request_ids` 与 UI 防重放状态。
- 易混淆边界：
  - `allow_session` 改的是线程 profile，不等于立刻自动执行所有工具。
  - `allow` 与 `allow_session` 都可能返回 `consumed=true`，但后续权限记忆范围不同。

## 3. 核心业务链路
1. GuardrailMiddleware 收到 tool call request，构造 GuardrailRequest。
2. 当 provider 返回 `allow=False` 且 reason code 为 `oap.approval_required` 且 context 有 `thread_id` 时，middleware 调用 `create_thread_permission_request()`。
3. middleware 构造 name=`permission_request` 的 ToolMessage，`additional_kwargs.permission_request` 内带：
   - `id`
   - `tool_name`
   - `tool_input`
   - `actions = allow / allow_session / deny`
   - `options = Allow / Allow Session / Deny`
   - `reason_code` / `reason_message`
4. 前端 `derivePendingPermissionRequest(messages)` 从消息尾部逆向扫描；若在遇到新的 human message 前发现合法 permission request，则返回 pending request。
5. `MessageList` 渲染 `PermissionRequestCard`；按钮模式最多 3 个 action，否则走 radio select 模式。
6. 用户点击 allow/allow_session/deny，前端调用：
   - workspace: `POST /api/threads/{thread_id}/permissions/{permission_request_id}/resolve`
   - bridge: `POST /api/threads/{thread_id}/bridge/permissions/{permission_request_id}/resolve`
7. 后端 `resolve_thread_permission_request()` 更新 store：
   - `allow_session` 写入 `thread_profiles[thread_id] = full_access`
   - `allow` 写入 pending_allows，一次性消费
   - `deny` 仅更新状态
8. 如果返回 `consumed=true` 且带 `original_message_text` 或 `replay_payload`，前端应重新提交原意图，形成“批准后继续执行”。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 创建权限请求 | middleware 内部 | sync/async | 把 tool deny 转成 request record + ToolMessage | GuardrailMiddleware | provider 返回 approval_required；context 有 thread_id | tool_name/tool_input/thread_id/original_message_text | ToolMessage + store record | workspace CLI install、bridge bash 都能创建 request | context 缺 thread_id 不应走 request 分支 | guardrail provider 异常 fail-open/fail-closed | 无 | message 为空时 original text 为空字符串 | reason code 非 approval_required 不应生成 request | 连续相同请求应生成独立 request id | ToolMessage name 固定为 `permission_request`，actions 固定三键 |
| resolve workspace permission | `/api/threads/{thread_id}/permissions/{permission_request_id}/resolve` | POST | 处理 workspace 权限决策 | 聊天页 | request 已存在 | `decision` | `ok decision consumed original_message_text tool_name replay_payload?` | allow/allow_session/deny 正常更新 | 非法 decision 返回 `ok=false` 或 422/400 | 无额外鉴权 | request 不存在返回 `ok=false message=not found` | original_message_text 为空也应返回 ok | 非 pending request 再 resolve 返回当前状态 | 第二次 allow consumed=False | `allow` 首次返回 consumed=True；若存在 replay_payload 则完整回传 |
| resolve bridge permission | `/api/threads/{thread_id}/bridge/permissions/{permission_request_id}/resolve` | POST | 处理 bridge 渠道权限决策 | bridge manager | bridge request 已存在 | `decision` | 同上 | bridge 渠道可正常继续 | 非法 decision | bridge 权限 profile 受 session 影响 | request 不存在 | 空 payload | 已消费 request 再次提交 | 重复提交不应 500 | 与 workspace route 语义一致，仅 path 不同 |
| request store 读取 | `thread_permissions.json` 相关函数 | 内部 | 读取 request/profile/pending_allows | service/middleware | store 已存在或初始化 | thread_id permission_request_id tool_name | record/profile bool | allow_session 写 full_access；allow 写 pending allow | store 损坏时行为需明确 | 无 | request 不存在返回 None | store 空时默认 profile=default | consumed 再 consume 返回 False | 并发 resolve/consume 不应破坏结构 | `get_thread_permission_profile` 默认返回 `default` |

## 5. UI 测试文档
- 页面入口：聊天线程页中的消息流，不存在独立页面。
- 首屏渲染：有 pending request 时渲染 `PermissionRequestCard`；无 pending request 时普通 markdown 内容渲染。
- 加载态：用户点击决策后按钮 disabled，`isResolvingPermission` 生效。
- 空态：无 actions/options 的 message 不应被识别为合法 pending request。
- 错误态：resolve 调用失败时控制台报错，卡片不应卡成永久 loading。
- 列表/详情/卡片展示：
  - reasonMessage
  - toolName
  - toolInput JSON 格式化
  - actions 数量 <=3 时用 button 模式，>3 时用 select 模式
- 用户交互：点击 allow / allow_session / deny；select 模式下先选再 submit。
- 表单校验：未选 option 时 submit disabled。
- 按钮状态：resolving 时全部动作 disabled。
- 条件渲染：新的 human message 出现后旧 pending request 不再视为当前待处理请求。
- 成功反馈：allow 成功后卡片消失或被后续消息顶掉；必要时原问题重新发送。
- 失败反馈：网络失败只打印错误，后续建议补 toast/alert；当前需验证至少不崩溃。
- 刷新后状态：若 request 仍 pending，刷新后应重新渲染；若已 resolve，不应再渲染为 pending。
- 重复操作：连续点击 allow 两次，前端最多第一次触发有效 consumed。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 优先结合 `/browse`，必要时配合 `/qa` 批量回归。
- 必须采集 network，对 resolve 路由和后续 replay 请求进行留证。
- 如环境允许，必须截取权限卡片前后对比 screenshot。

### 6.2 E2E 场景清单

#### 场景 1：workspace CLI 安装触发权限请求
- 场景目标：验证“帮我安装 stripe CLI”类请求会在 workspace 表面生成权限卡片。
- 前置条件：guardrail provider 启用；聊天线程可正常发送消息。
- 测试数据：`帮我安装 stripe CLI`。
- 执行步骤：
  1. 用 agent-browser 打开已有或新线程页。
  2. 输入测试消息并提交。
  3. 等待消息流中出现权限请求卡片。
  4. 检查卡片中 tool name、JSON 参数、三个动作按钮。
- 预期结果：卡片出现而不是直接执行；按钮包括 Allow、Allow Session、Deny。
- 关键断言：network 中 stream 返回 permission request；前端未崩溃。
- 证据建议：卡片截图、stream network 记录。
- 自动化建议：适合自动化。
- 优先级：P0。

#### 场景 2：allow 后 replay 原请求
- 场景目标：验证批准后原消息被重新提交，尤其是带 replay payload 的 CLI 安装场景。
- 前置条件：场景 1 已出现卡片。
- 测试数据：沿用场景 1。
- 执行步骤：
  1. 点击 Allow。
  2. 抓取 `/permissions/{id}/resolve` 响应。
  3. 继续观察消息流是否重新出现用户原请求或后续执行结果。
- 预期结果：`consumed=true`，响应包含 `original_message_text`，前端触发 `handleSubmit` 重放。
- 关键断言：resolve 之后出现新的人类/执行消息，而不是停留在卡片。
- 证据建议：resolve 响应 body、重放后的消息截图。
- 自动化建议：适合自动化。
- 优先级：P0。

#### 场景 3：allow_session 后线程级豁免
- 场景目标：验证 `allow_session` 作用于同线程后续敏感调用。
- 前置条件：同一线程内有后续同类敏感工具操作。
- 步骤：
  1. 第一次触发卡片，点击 Allow Session。
  2. 在同线程再次发起同类工具请求。
  3. 观察是否减少二次拦截，或被 pending allow/session profile 直接放行。
- 预期结果：store 中 profile 为 `full_access`，同线程后续同类操作不再重复弹出同级权限卡。
- 关键断言：第二次不应再出现相同 request card。
- 证据建议：前后两轮截图、network 记录。
- 自动化建议：建议先接口自动化，E2E 再验证 UI 表现。
- 优先级：P1。

#### 场景 4：deny 失败链路
- 场景目标：验证用户拒绝后不发生 replay，也不误执行工具。
- 前置条件：有 pending request。
- 步骤：点击 Deny，观察后续消息和 network。
- 预期结果：没有 replay；request 状态更新为 deny；聊天页可继续输入。
- 关键断言：没有额外工具执行请求。
- 优先级：P0。

#### 场景 5：bridge surface 权限请求
- 场景目标：验证 bridge 透传线程使用专用 bridge resolve 路由。
- 前置条件：桌面环境或可模拟 bridge surface。
- 步骤：通过 bridge 触发敏感工具 -> 同意 -> 抓请求。
- 预期结果：调用 `/bridge/permissions/.../resolve`，后续 bridge manager 继续线程执行。
- 优先级：P1。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1 + 2。
- 主失败链路：场景 4。
- 权限受限链路：场景 1。
- 刷新恢复链路：刷新时 pending request 仍显示。
- 返回/重进链路：回到同线程后 request 状态正确。
- 重复点击/重复提交链路：二次 allow 不重复 consumed。
- 接口报错后的 UI 反馈链路：resolve 失败不崩。
- 模块间联动链路：CLI install replay、bridge replay。
- web / desktop-client 差异链路：bridge route 仅桌面链路使用。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：卡片出现、按钮点击、刷新恢复。
- 适合 `/qa`：权限交互回归、边界点击。
- 适合 report-only：仅验证弹卡逻辑。
- 必须抓 network：stream、workspace resolve、bridge resolve。
- 必须看 console：resolve 失败日志。
- 必须截图留证：权限卡片初始态、allow 后、deny 后。

## 7. 数据一致性与状态流转测试
- 列表与详情一致性：消息流中的 pending request 与 store 状态一致。
- message / thread / permission / cli tool 状态同步：allow 后 thread 中 `resolved_permission_request_ids` 更新；CLI replay payload 能被回放。
- 设置变更对行为的影响：tool policy/guardrail 配置变化会影响 request 是否出现。
- 前后端数据一致性：前端 derivePendingPermissionRequest 与后端 store 状态一致。
- 缓存、重拉、乐观更新、回滚：刷新后 pending 状态不漂移；已 consumed 请求不应回弹。
- web 与 desktop-client 状态差异：bridge route 与 workspace route 路径不同。

## 8. 异常与边界测试
- 缺参：decision 缺失、request id 缺失。
- 非法参数：decision 非 allow/allow_session/deny。
- 超长输入：tool_input JSON 超长时 summary 截断显示。
- 特殊字符：tool_input 含中文、引号、换行。
- 空数据：reason_message 空字符串、original_message_text 空字符串。
- 资源不存在：permission_request_id 不存在。
- 接口 4xx / 5xx：resolve router 异常。
- 超时：resolve 慢响应时按钮 disabled 持续。
- 权限不足：未来若加鉴权需补测。
- 并发更新：两个客户端同时 resolve 同一个 request。
- 状态非法切换：已 deny 再 allow、已 consumed 再 allow。
- 刷新/回退/重进问题：pending 请求在刷新后恢复。
- 重复操作问题：连点 allow / deny。

## 9. 自动化建议
- 适合后端接口自动化：guardrail middleware、permission store、resolve routes。
- 适合前端 contract / integration 自动化：derivePendingPermissionRequest、PermissionRequestCard 渲染与交互。
- 适合 agent-browser E2E 自动化：权限卡片出现/批准/拒绝/replay。
- 适合人工探索式测试：跨线程 allow_session 边界、bridge 联动。
- 最小冒烟集合：弹卡、allow replay、deny 不重放、刷新恢复。
- 最小回归闭环：workspace CLI install 权限请求 + resolve。
- 高收益自动化优先级：P0 是 middleware + resolve route + 卡片；P1 是 bridge。

## 10. 风险与优先级
- P0 必测项：卡片生成、action keys、allow replay、deny 不执行。
- P1 高价值项：allow_session profile、bridge route、重复提交幂等。
- P2 扩展项：复杂 tool_input、大量 concurrent requests。
- 最容易漏测的点：新的 human message 会终止 derivePendingPermissionRequest 的扫描；二次 allow consumed=False。
- 最容易出现线上事故的链路：批准后未 replay、重复 replay、多端重复 resolve。
- 上线前必须回归的部分：workspace CLI install、deny、allow_session、刷新恢复。

