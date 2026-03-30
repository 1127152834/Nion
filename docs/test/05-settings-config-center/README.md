# 测试文档 05 - Settings / Config Center 模块

- 文档用途：指导其他 agent 对配置中心读写、校验、冲突处理、运行时同步及各设置分区做测试设计与执行。
- 适合交给哪类 agent 执行：后端配置 API 测试 agent、前端设置 UI/interaction 测试 agent、跨模块回归 agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + E2E。
- 是否建议先做 contract / integration 再做 E2E：是，先覆盖 `/api/config*` 和 `useConfigEditor`，再执行设置页 E2E。

## 1. 模块说明
- 模块目标：通过统一 Config Center 管理模型、session policy、tools、skills、sandbox、daemon、notification 等运行时配置，并将更新同步到当前进程/daemon。
- 核心业务职责：
  - 读取配置、schema 与 runtime status。
  - 校验配置、展示 warnings/errors。
  - 保存配置并处理 409 版本冲突、422 校验失败。
  - 统一 `ConfigSaveBar` 维持 dirty/save/discard UX。
- 典型用户角色：产品使用者、桌面单机用户、需要调整模型/沙箱/守护进程行为的高级用户。
- 上下游依赖：ConfigRepository、daemon refresh、runtime status、各设置分区组件。
- 与其他模块关系：
  - 影响模块 01 suggestions/session policy、模块 03 tools、模块 04 sandbox/tool policy、模块 07 automation、模块 09 daemon/bridge。
- 关键代码位置：
  - 前端组件：`frontend/src/components/workspace/settings/settings-dialog.tsx`、`use-config-editor.ts`、`configuration/config-save-bar.tsx`、`appearance-settings-page.tsx`、`daemon-settings-page.tsx`、`session-policy-settings-page.tsx`、`sandbox-settings-page.tsx`、`tool-settings-page.tsx`
  - 前端 core：`frontend/src/core/config-center/api.ts`、`hooks.ts`、`types.ts`
  - 后端 router：`backend/app/gateway/routers/config.py`
  - 后端 repository/config：`nion.config.config_repository` 相关实现
  - 现有测试文件：`backend/tests/test_gateway_config_api.py`、`backend/tests/test_config_repository.py`、`backend/tests/test_config_store.py`、`backend/tests/test_config_event_logging.py`、`frontend/src/components/workspace/settings/*.test.ts`

## 2. 模块边界与测试范围
- 本模块覆盖：
  - `/api/config` `schema` `validate` `runtime-status`
  - settings dialog 分区切换
  - save/discard/dirty 状态
  - 版本冲突、校验错误、warning 展示
- 不属于本模块：具体业务模块本身的功能正确性，但它负责验证配置变更是否会影响这些模块。
- 交叉测试点：
  - suggestions model 影响聊天 follow-up。
  - sandbox/daemon/tool settings 影响 runtime 与 tool policy。
  - CLI tools section 复用 CLI manager。
  - Memory OS provider foundation会在记忆设置页中引入 provider family 与 active binding 状态。
- 易混淆边界：
  - local settings（主题、语言、sidebar collapsed）与 Config Center 配置不是同一持久化源。

## 3. 核心业务链路
1. 打开 SettingsDialog 时，`useConfigCenter()` 并行拉取 config、schema、runtimeStatus。
2. `useConfigEditor` 持有 `initialConfig` 与 `draftConfig`，通过 stable JSON 比较生成 `dirty`。
3. 用户修改某个 section：
   - 本地更新 draft
   - 清空当前 validation errors/warnings
4. 用户点击 Save：
   - 可选先 `prepareConfig`
   - 调 `updateConfig({version, config})`
   - 成功后刷新 version、initialConfig、draftConfig、warnings
   - 422 时解析 detail.errors/detail.warnings 回灌 UI
   - 409 时触发 `refetchConfig()`
5. `ConfigSaveBar` 统一展示 clean/dirty/saving/discard/save。
6. 后端 update 成功时若 app.state 有 daemon_service，会触发 `refresh_from_app_config()`。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 读取 config | `/api/config` | GET | 拉取当前 config/version/source | SettingsDialog | config store 可读 | 无 | version source_path yaml_text config | 返回默认或已保存配置 | store 损坏 | 无 | 无 YAML 时走 store 默认值 | 空字段有默认值 | 无 | 重复 GET 一致 | version/config/source_path 正确 |
| schema | `/api/config/schema` | GET | 获取 section 元数据与顺序 | SettingsDialog | 无 | 无 | sections order | 返回全部设置分区 | 无 | 无 | 无 | 无 | 无 | 重复 GET 一致 | 至少包含 models/daemon/agent_integrations 等 |
| validate | `/api/config/validate` | POST | 只校验不落库 | useConfigEditor | payload 可解析 | `config` 或 `yaml_text` | valid errors warnings config yaml_text | 合法配置返回 valid=true | YAML 非法/根非 mapping/字段非法 | 无 | 无 | warnings-only | 结构不符 400/422 | 并发 validate 无副作用 | errors/warnings 结构正确 |
| update config | `/api/config` | PUT | 保存配置并刷新 runtime | useConfigEditor | version 正确 | `version config/yaml_text` | new version/config/yaml/warnings | 保存成功版本 +1 | 缺 version/非法 payload | 无 | 无 | 空配置不合法 | version 冲突 409；validation 422 | 并发更新冲突 | daemon refresh 触发、store_version 更新 |
| runtime status | `/api/config/runtime-status` | GET | 查看 store 与 runtime 同步状态 | settings/tool page | store 可读 | 无 | store_version loaded_version runtime_processes is_in_sync warnings | 新版本保存后 loaded/store 一致 | store 异常 | 无 | 无 | runtime_processes 为空 | process 错误 -> warnings 增加 | 重复 GET 一致 | `is_in_sync` 与 warnings 语义正确 |

## 5. UI 测试文档
- 页面入口：workspace 侧栏菜单 -> SettingsDialog。
- 首屏渲染：标题、描述、左侧 nav groups、默认 section、内容区可滚动。
- 加载态：config/schema 加载中显示 loadingState；runtime status 分区显示 skeleton/文案。
- 空态：某 section 无配置时仍能正常显示默认表单。
- 错误态：config center error 时顶部描述与 section 内错误提示可见。
- 列表/卡片/面板展示：nav 分组、section 标题、ConfigSaveBar、validation errors/warnings。
- 用户交互：切换 section、修改字段、保存、放弃、切换主题/语言、sandbox provider、daemon background 开关。
- 表单校验：dirty 前后按钮状态、validate 失败时显示 path/message。
- 按钮状态：save/discard 在 clean、dirty、saving 三态下正确启禁。
- 条件渲染：desktop shell 下 sandbox section 隐藏/提示 AIO provider；CLI tools section 直接嵌入 manager。
- 条件渲染：记忆页中的 provider foundation 区块必须显示 `Built-in / Mem0 / OpenViking`，且 OpenViking 文案必须提到 `embedded / remote`。
- 成功反馈：save 后 ConfigSaveBar 回到 clean；version 刷新；runtime status 变化。
- 失败反馈：409 后重拉；422 后显示 validation。
- 刷新后状态：已保存配置重进仍保留；discard 后回退到 initialConfig。
- 重复操作：连续 save、连续 discard、跨 section 修改后一起保存。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 优先使用 `agent-browser`。
- 场景中尽量选择确定性高的 section：Appearance、Daemon、Session Policy、Sandbox、Tool Settings。
- 必须抓 network：`/api/config` `schema` `validate` `runtime-status`。
- 对 save 成功、409 冲突、422 校验失败至少各留一份证据。

### 6.2 E2E 场景清单

#### 场景 1：打开设置并完成一次成功保存
- 目标：验证完整 `read -> edit -> save -> clean` 链路。
- 前置条件：后端 config API 可用。
- 步骤：打开设置 -> 进入 Daemon section -> 切换 `allow_background_running` -> 点击 Save。
- 预期：出现 dirty -> saving -> clean；network 中 `PUT /api/config` 200；runtime status 反映新值。
- 优先级：P0。

#### 场景 2：Session Policy 修改 suggestions model
- 目标：验证 session policy section 能保存建议问题模型。
- 步骤：进入 Session Policy -> 修改 SuggestionsSection -> Save。
- 预期：保存成功；后续聊天 suggestions 可继续生成。
- 优先级：P1。

#### 场景 3：Sandbox section 的 desktop gate 文案
- 目标：验证桌面环境下 AIO provider 被隐藏/提示，Web 环境展示正常差异。
- 优先级：P1。

#### 场景 4：Tool settings 查看 runtime status
- 目标：验证工具状态卡显示 in sync / out of sync / issue count。
- 步骤：打开 Tools section，查看 runtime summary 卡片。
- 优先级：P1。

#### 场景 5：保存冲突恢复
- 目标：验证并发修改导致 409 时前端会 refetch 而不是静默失败。
- 前置条件：借助接口/双窗口制造版本冲突。
- 优先级：P0。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1。
- 主失败链路：422/409。
- 刷新恢复链路：保存后重开设置仍一致。
- 返回/重进链路：切 section 返回前值正确。
- 重复点击链路：save/discard 连点。
- 模块间联动链路：Session Policy -> Chat suggestions；Daemon -> runtime-info。
- web / desktop-client 差异链路：sandbox/desktop-only 提示。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：设置打开、字段编辑、保存验证。
- 适合 `/qa`：完整设置页回归。
- 适合 report-only：配置 UI 巡检。
- 必须抓 network：config 读写与 runtime-status。
- 必须看 console：save 失败错误。
- 必须截图留证：dirty/save/clean 三态、validation error。

## 7. 数据一致性与状态流转测试
- configData/version 与 runtimeStatus.loaded_version 一致。
- save 后 initialConfig/draftConfig 同步更新。
- discard 后 draftConfig 恢复旧值。
- warnings/errors 与后端 detail 一致。
- daemon refresh 后 `/api/daemon/runtime-info` 与 config 改动一致。

## 8. 异常与边界测试
- 缺参：update 缺 version。
- 非法参数：YAML 根非 mapping、非法 provider 值。
- 空数据：空 warnings/errors。
- 资源不存在：通常不适用。
- 接口 4xx/5xx：409/422/500。
- 并发更新：双窗口修改同配置。
- 状态非法切换：saving 中再次 save/discard。

## 9. 自动化建议
- 适合后端接口自动化：config read/schema/validate/update/runtime-status。
- 适合前端 integration 自动化：useConfigEditor、ConfigSaveBar、冲突/校验错误回灌。
- 适合 agent-browser E2E：确定性分区的保存链路。
- 适合人工探索式测试：复杂 YAML、跨分区联动。
- 最小冒烟集合：打开设置、改 daemon 设置、save 成功、reload 一致。
- 最小回归闭环：save success + 409 + 422。
- 高收益自动化优先级：P0 是 config API/useConfigEditor；P1 是各 section UI。

### Memory OS Provider Foundation 增量覆盖

- 后端接口：
  - `GET /api/memory-os/providers/families`
  - `GET /api/memory-os/providers/state`
  - `PUT /api/memory-os/providers/state`
- 前端 contract：
  - 记忆设置页顶部出现 provider foundation 区块
  - provider family 至少显示 `Built-in / Mem0 / OpenViking`
  - OpenViking 模式文案显示 `embedded / remote`
  - 不得破坏现有 legacy memory、OpenViking、AutoDream 卡片

### Memory OS Runtime Migration 增量覆盖

- `/api/memory` 仍然存在，但应验证它已经是 Memory OS compatibility bridge
- prompt 注入和 memory middleware 的运行时路径应通过 provider 间接生效
- 前端 `core/memory/*` 兼容调用不应因 runtime migration 被打断

### OpenViking Provider Activation 增量覆盖

- `memory-os` provider state必须能表达 OpenViking 的 `embedded / remote` 模式
- provider foundation 卡片必须能展示当前 OpenViking 模式
- backend 需验证 OpenViking provider family 的 embedded 和 remote 行为
- backend 需验证 embedded OpenViking provider 至少能列出 notebook 资源和 dream log
- backend 需验证 embedded OpenViking provider 至少能 round-trip user memory 和 agent memory

## 10. 风险与优先级
- P0 必测项：config read/update/runtime-status、409/422。
- P1 高价值项：sandbox/daemon/tool/session-policy 分区。
- P2 扩展项：复杂高级 YAML 与极端错误场景。
- 最容易漏测的点：save 后 runtime refresh；409 时前端自动 refetch；422 错误结构映射。
- 最容易出现线上事故的链路：保存成功但 runtime 未同步、错误被吞掉、dirty 状态错误。
- 上线前必须回归的部分：daemon、session policy、sandbox、tool settings 保存链路。
