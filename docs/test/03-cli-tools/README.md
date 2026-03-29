# 测试文档 03 - CLI Tools 模块

- 文档用途：指导其他 agent 对 CLI 工具目录、安装、描述、自定义添加、聊天联动和运行时 gating 执行系统化测试。
- 适合交给哪类 agent 执行：后端 API/service 测试 agent、前端管理页/UI 测试 agent、聊天联动 E2E agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是，先覆盖 `cli catalog/cli-tools service/runtime gating`，再做管理页和聊天联动。

## 1. 模块说明
- 模块目标：让 Nion 能识别本机 CLI 工具，并支持用户在页面中查看、安装、补描述、按路径添加，再把工具选择注入聊天线程上下文。
- 核心业务职责：
  - `/api/cli/catalog` 提供运行时可见 CLI 投影与 enabled/allowed/configured 状态。
  - `/api/cli-tools/*` 提供 curated catalog、已安装检测、安装流、自动描述、自定义工具 CRUD。
  - 聊天输入框通过 shortcut selections / selected_cli_tools 驱动 thread service 中 `cli_tools_enabled` 与 prompt 注入。
- 典型用户角色：需要安装/更新本机工具的聊天用户、管理本地工具库的桌面用户。
- 上下游依赖：CLI catalog JSON、system detection、ConfigRepository、ThreadService runtime gating、聊天输入框 mention/shortcut 选择。
- 与其他模块关系：
  - 与模块 01：CLI 页可通过 `pathOfNewThread({draft})` 把安装意图带回聊天；聊天输入框可选择 CLI tools。
  - 与模块 02：CLI 安装常通过 permission request 放行。
  - 与模块 04：tool policy / runtime gating 影响工具能否实际被调用。
  - 与模块 05：设置中的 CLI Tools 分区复用同一 `CliToolsManager`。
- 关键代码位置：
  - 前端页面：`frontend/src/app/workspace/cli-tools/page.tsx`
  - 前端组件：`frontend/src/components/workspace/cli-tools/cli-tools-manager.tsx`、`cli-tool-card.tsx`、`cli-tool-detail-dialog.tsx`、`cli-tool-install-dialog.tsx`、`cli-tool-add-dialog.tsx`、`cli-tool-batch-describe-dialog.tsx`
  - 前端 core / types：`frontend/src/core/cli/api.ts`、`frontend/src/core/cli/types.ts`、`frontend/src/core/threads/hooks.ts`、`frontend/src/core/threads/types.ts`
  - 后端 router：`backend/app/gateway/routers/cli.py`
  - 后端 service / model / repository：`backend/packages/harness/nion/cli_tools/service.py`、`models.py`、`repository.py`、`catalog.py`
  - 现有测试文件：`backend/tests/test_cli_catalog_api.py`、`backend/tests/test_cli_tools_service.py`、`backend/tests/test_cli_tools_runtime_gating.py`、`backend/tests/test_cli_tool_guardrail_policy.py`、`frontend/src/components/workspace/cli-tools/cli-tools.contract.test.ts`、`cli-tool-dialogs.contract.test.ts`、`cli-tool-batch-describe.contract.test.ts`、`frontend/src/core/threads/cli-selection-payload.contract.test.ts`

## 2. 模块边界与测试范围
- 本模块覆盖：catalog 列表、installed/extra/custom 三类来源、自定义工具增删、安装流式日志、AI 批量描述、聊天草稿预填、selected_cli_tools 触发 runtime gating。
- 不属于本模块：真正 shell 命令执行结果；tool policy 全局规则配置；permission request 内部治理。
- 交叉测试点：
  - 选择 CLI tool 后提交聊天，ThreadService 是否启用 `cli_tools_enabled`。
  - 需要授权的安装命令是否转成 permission request。
- 易混淆边界：
  - `/api/cli/catalog` 是运行时投影，不等于完整 curated catalog。
  - `custom` 工具与 `extra detected` 工具展示方式相似，但数据来源不同。

## 3. 核心业务链路
1. 用户进入 `/workspace/cli-tools`，`CliToolsManager` 并发调用 `loadCliToolsCatalog()` 与 `loadCliToolsInstalled()`。
2. 页面把数据分成：
   - curated installed tools
   - recommended tools
   - extra system detected tools
   - custom tools
3. 用户可以：
   - 查看详情
   - 通过 install dialog 执行安装流
   - 对 extra/custom 工具做 AI describe
   - 按路径添加 custom tool
   - 从空态或按钮跳回聊天并带上安装意图 draft
4. 如果用户在聊天输入框选择 CLI tools，`ThreadService._extract_selected_cli_tools()` 会把它们拼入 prompt，并通过 `should_enable_cli_tools_for_request()` 或 `selected_cli_tools` 打开 `cli_tools_enabled`。
5. ThreadService 根据 `cli_management` 状态支持 follow-up turns remaining，避免同一轮 CLI 管理对话被过早关闭。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CLI runtime catalog | `/api/cli/catalog` | GET | 读取运行时投影 | 设置页 / CLI 管理 / 输入框选择 | CLI config 可读 | 无 | `clis{ id -> state }` | reflect runtime detection + config overrides | 配置损坏 | 无 | 指定 id 不存在时仍可通过 PUT 创建 override | 无工具时返回空 dict | override 与 runtime 冲突 | 多次读取一致 | enabled/allowed/installed/configured/source/version/path 正确 |
| 更新 CLI runtime catalog item | `/api/cli/catalog/{cli_id}` | PUT | 修改 enabled/description override | 设置页 | cli_id 非空 | `enabled description` | 单 item 投影 | 已安装/未安装都可更新 configured override | 空 cli_id、无效 payload | 无 | 自定义不存在工具也能配置 override | description 为空时回退默认 | 冲突 override | 重复 PUT 幂等 | returned projection 与后续 GET 一致 |
| curated catalog | `/api/cli-tools/catalog` | GET | 读取 curated definitions | CLI 页 | catalog 文件存在 | 无 | `tools[]` | 返回完整定义 | catalog 文件损坏 | 无 | 无 | 空 catalog | 无 | 重复 GET 一致 | 定义字段齐全 |
| installed payload | `/api/cli-tools/installed` | GET | 返回 installed/extra/custom/descriptions/platform | CLI 页 | detect service 可运行 | 无 | `tools extra custom descriptions platform hasBrew` | 已安装工具、extra 和 custom 分类正确 | detection 异常 | 无 | 无匹配工具 | 空列表 | shadow custom tool 过滤错误 | 重复 GET 一致 | custom 中不应出现与 catalog binPath 重叠的 shadow 项 |
| describe options | `/api/cli-tools/describe-options` | GET | 返回 provider/model 组选项 | batch describe dialog | model registry 可用 | 无 | groups/default_provider_id | 至少包含默认 provider | registry 异常 | 无 | 无模型 | 空 groups | 无 | 重复 GET 一致 | 默认 provider 合法 |
| 批量迁移描述 | `/api/cli-tools/descriptions` | POST | 批量 upsert zh/en 描述 | batch describe dialog | payload 合法 | `descriptions` | migrated count | 合法项全部迁移 | 缺 zh/en/tool_id | 无 | tool id 未定义仍可写 description 表 | 空 payload 迁移 0 | 无 | 重复迁移幂等更新 | migrated 计数正确 |
| custom tool list/create/delete | `/api/cli-tools/custom*` | GET/POST/DELETE | 管理自定义工具 | add dialog / manager | 绝对路径存在且可执行 | `binPath name` | tool record / deleted | 创建、列出、删除成功 | 相对路径、文件不存在、不可执行 | 无 | delete 不存在 404 | custom 为空列表 | 重名/同 bin path 更新 | 重复创建同路径应 upsert | createdAt/updatedAt/version/installMethod 正确 |
| tool status/detail | `/api/cli-tools/{tool_id}/status|detail` | GET | 查看单工具状态/详情 | manager/detail dialog | tool 存在 | path | runtime/detail | 存在工具返回详情 | 无效 id | 无 | 不存在 404 | 无 | 无 | 重复 GET 一致 | detail 与 catalog 定义一致 |
| install stream | `/api/cli-tools/{tool_id}/install` | POST | 执行安装并 SSE 返回日志 | install dialog | method 有效，service 可安装 | `method` | SSE `output/done/error` | 单方法或多方法安装成功 | 缺 method、非法 method | 需要系统权限时应转由外层权限机制处理 | tool 不存在/不支持 | 空日志 | 安装中断 | 重复安装同工具 | dialog 正确消费 SSE，并在 done/error 结束 |
| describe tool | `/api/cli-tools/{tool_id}/describe` | POST | 用指定 provider/model 生成描述 | batch describe dialog | tool 存在；模型可用 | `providerId model` | `description` | provider/model 组合正确透传 | tool 不存在/auto-describe 不支持 | 模型调用失败 502 | tool 不存在 404 | structured 为空时仍返回 zh/en | provider/model 缺省时默认模型 | 重复 describe 覆盖 description | provider qualified model name 拼接正确 |

## 5. UI 测试文档
- 页面入口：`/workspace/cli-tools` 与设置中的 `CLIToolsPage`。
- 首屏渲染：标题、描述、空态按钮或 installedActions、CodePilot docs 外链存在。
- 加载态：catalog/installed 数据加载期间展示 loading 文案。
- 空态：无任何 installed/extra/custom 时展示空态动作按钮。
- 错误态：接口失败时至少不崩溃，建议补 toast；当前主要验证 manager 可恢复刷新。
- 列表/卡片展示：installed、recommended、extra、custom 四类渲染正确；category badge、version、description 正确。
- 用户交互：
  - 打开 detail dialog
  - 安装单方法/多方法 tool
  - 打开 add dialog 添加绝对路径工具
  - 打开 batch describe dialog 选择 provider/model
  - 删除 custom tool
  - 从页面跳回聊天草稿
- 表单校验：add dialog 绝对路径必填；batch describe skipExisting 生效；install dialog 方法选择正确。
- 按钮状态：安装中 close/cancel、add dialog 提交中、batch describe running 状态。
- 条件渲染：recommended 工具只有可安装方法时显示 install 按钮；detail dialog 在 `onInstall` 存在与否下 footer 不同。
- 权限差异：需要系统权限的安装命令与聊天执行链路联测。
- 成功反馈：安装成功状态图标；add tool 成功后列表刷新；describe 成功计数增长。
- 失败反馈：add 不合法路径显示 error；install SSE error 显示失败；describe error 单项标红。
- 刷新后状态：custom tools 与 descriptions 持久化恢复。
- 重复点击/重复操作：连点 install、连点 add、重复 describe 不应导致 UI 崩溃。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 推荐结合 `/browse` 做管理页验证、结合 `/qa` 做回归。
- 必须抓 network：`/api/cli/catalog`、`/api/cli-tools/installed`、install stream、describe、custom create/delete。
- 对 install 和 describe 场景必须保留截图和响应日志。

### 6.2 E2E 场景清单

#### 场景 1：CLI 管理页成功加载
- 目标：验证 catalog + installed payload 成功渲染。
- 前置条件：服务可用。
- 步骤：打开 `/workspace/cli-tools`，等待加载完成，检查 installed/recommended 区域。
- 预期：页面无白屏；标题描述正确；至少出现一类列表或空态动作。
- 优先级：P0。

#### 场景 2：从 CLI 页回跳聊天草稿
- 目标：验证 Add Tool 按钮能把安装意图带入新线程 draft。
- 步骤：点击“添加工具”按钮 -> 跳转到 `/workspace/chats?thread=new&draft=...`。
- 预期：URL 带 draft；InputBox 初始值含安装提示词。
- 优先级：P0。

#### 场景 3：按路径添加 custom tool
- 目标：验证 add-by-path 主链路。
- 前置条件：准备一个本机可执行文件路径。
- 步骤：打开 Add by Path -> 填绝对路径 -> 提交。
- 预期：dialog 关闭，列表新增 custom 工具。
- 关键断言：`POST /api/cli-tools/custom` 200；custom 列表刷新。
- 优先级：P0。

#### 场景 4：AI 批量描述
- 目标：验证 provider/model 选择与批量 describe UI 状态。
- 前置条件：存在 extra/custom 工具；模型可用。
- 步骤：打开 AI Describe -> 选择 provider/model -> 开始执行。
- 预期：逐项状态从 pending -> loading -> success/error；完成后描述更新。
- 优先级：P1。

#### 场景 5：安装流日志展示
- 目标：验证 install stream 的 running/success/error UX。
- 前置条件：选中一个有 install method 的 recommended tool。
- 步骤：打开 detail -> install -> 观察日志流。
- 预期：显示安装命令、滚动日志、结束后 success/error 图标。
- 优先级：P1。

#### 场景 6：聊天选择 CLI tool 后触发 runtime gating
- 目标：验证 selected CLI tools 注入后 thread service 打开 CLI 管理上下文。
- 前置条件：聊天页可选择 CLI tool。
- 步骤：在输入框选择一个 CLI tool，提交带该选择的消息。
- 预期：请求体/后续线程状态包含 `shortcut_selections.cliTools`；后端视为 CLI 管理对话。
- 优先级：P0。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1、3、6。
- 主失败链路：add invalid path、describe/install error。
- 权限受限链路：安装命令进入权限卡，联测模块 02。
- 刷新恢复链路：刷新后 custom/descriptions 仍在。
- 返回/重进链路：CLI 页 -> 聊天页 -> 返回 CLI 页。
- 重复点击/重复提交链路：连点 install/add/describe。
- 接口报错后的 UI 反馈链路：install/describe/add 失败。
- 模块间联动链路：CLI 页跳聊天草稿、聊天 CLI selection。
- web / desktop-client 差异链路：桌面环境更常见，但 Web 页面也应正常渲染 catalog。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：页面加载、add dialog、detail/install dialog、聊天回跳。
- 适合 `/qa`：整页回归、安装日志与描述任务批量检查。
- 适合 report-only：目录页巡检。
- 必须抓 network：catalog、installed、custom create/delete、describe、install stream。
- 必须看 console：SSE error、dialog JS 错误。
- 必须截图留证：空态、custom 工具新增后、install dialog 结束态。

## 7. 数据一致性与状态流转测试
- CLI catalog 投影与 installed payload 一致性。
- custom tool 删除后页面与 DB 一致。
- descriptions 更新后 detail/extra detail 文案同步。
- selected_cli_tools 与 thread cli_management 状态一致。
- CLI config enabled/allowed 与聊天可用性、tool policy 联动一致。

## 8. 异常与边界测试
- 缺参：install 缺 method、custom create 缺 binPath、describe 缺 tool id。
- 非法参数：相对路径、不可执行文件、无效 provider/model。
- 超长输入：超长自定义工具名、超长 description。
- 特殊字符：路径空格、unicode 文件名。
- 空数据：无 installed/extra/custom。
- 资源不存在：删除不存在 custom tool、detail/status 不存在工具。
- 接口 4xx / 5xx：install/describe/custom routes。
- 超时：长安装日志、模型描述超时。
- 权限不足：shell/install 需要授权时转 permission request。
- 并发更新：同时批量 describe 与删除 custom tool。
- 状态非法切换：install 进行中关闭 dialog，重新打开状态恢复。
- 重复操作：同一路径重复 add。

## 9. 自动化建议
- 适合后端接口自动化：catalog projection、custom tool CRUD、describe route、runtime gating。
- 适合前端 contract / integration 自动化：dialog 开关、route jump、selected_cli_tools payload。
- 适合 agent-browser E2E 自动化：add-by-path、page load、jump to chat。
- 适合人工探索式测试：真实安装、复杂 PATH、系统权限边界。
- 最小冒烟集合：CLI 页加载、跳聊天草稿、custom tool add、selected CLI tool 聊天联动。
- 最小回归闭环：catalog -> add custom -> refresh -> chat selection。
- 高收益自动化优先级：P0 是 catalog/custom/chat 联动；P1 是 install/describe。

## 10. 风险与优先级
- P0 必测项：catalog 投影、custom add/delete、聊天草稿跳转、selected CLI tools 注入。
- P1 高价值项：install stream、AI describe、shadow custom filter。
- P2 扩展项：复杂平台差异、真实包管理器错误。
- 最容易漏测的点：`/api/cli/catalog` 与 `/api/cli-tools/catalog` 不是同一个概念；selected CLI tools 会直接影响 ThreadService prompt。
- 最容易出现线上事故的链路：custom path 校验失效、runtime gating 不生效、install stream UI 卡死。
- 上线前必须回归的部分：page load、add custom、chat jump、CLI selection 联动。

