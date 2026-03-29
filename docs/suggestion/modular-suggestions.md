# Nion 分模块建议文档

## 文档目标
基于当前仓库真实代码、现有测试文档规划与本轮审计结论，按业务模块整理 Nion 当前最值得推进的建议事项，方便后续按模块拆解修复、补测试、补文档或分配给其他 agent 执行。

## 适用范围
- 本文不是实现方案，也不是测试指导文档。
- 本文侧重“应该改什么、为什么改、优先级如何排、建议补哪些验证”。
- 模块划分沿用当前已确认的 5 个真实业务模块。

---

## 模块 01：Chat / Thread Runtime

### 模块目标
保障聊天主链路稳定：新线程创建、消息提交、SSE 流式消费、消息列表渲染、刷新恢复、错误反馈。

### 当前主要问题
1. 聊天主链路与 permission replay 耦合过深，批准后的重试不是对“原请求”的完整恢复，而只是重发原始文本。
2. `MessageList` / `ChatThreadPage` 对 permission、clarification、artifact、subagent、todo 等多类消息分支聚合较强，适合继续强化契约测试，否则容易因局部改动影响主链路。
3. 当前前端 contract test 更偏源码字符串断言，对真实行为回归保护有限。

### 建议事项
- 把“批准后继续执行”从“重发纯文本”升级为“重放原始 submit payload”。
- 将聊天提交链路中的 `text/files/shortcut selections/context` 明确为统一提交契约，避免某一类 replay 丢字段。
- 为聊天主链路增加更强的 integration / E2E 断言，而不是只检查 wiring 字符串是否存在。
- 对 `created / values / error / custom` SSE 事件顺序建立统一测试矩阵，确保 web 与 desktop-client 行为一致。

### 推荐优先级
- **P0**：统一 replay 契约，避免批准后行为漂移。
- **P1**：加强 message grouping 与 SSE 事件顺序测试。
- **P1**：补“刷新恢复 + 返回重进 + 错误恢复”三类高频回归场景。

### 推荐补充验证
- 新线程 → permission request → 允许后继续执行的完整链路 E2E。
- created / values / error 的前端行为断言测试。
- desktop-client 与 web 端在相同 SSE 输入下的行为一致性测试。

---

## 模块 02：Permission Request / Guardrail Resolution

### 模块目标
保障受限工具请求在 guardrail 拦截、前端展示、用户批准/拒绝、后端恢复执行这一闭环中的语义一致与权限安全。

### 当前主要问题
1. `allow_session` 当前实现已经落成 thread 级持久授权，但产品语义仍不够清晰，容易被误读为更大范围授权。
2. resolve 接口已经返回结构化 `replay_payload`，并在成功 resolve 后持久化 `resolved_permission_request_ids`；但显式调用方归属校验仍缺失，authz 风险仍在。
3. 前端批准后已优先重放 `replay_payload`，但接口契约与文档尚需同步固化。
4. 前端 pending permission request 已不再因后续 human message 直接消失，但仍建议补更强的端到端验证确保刷新/重进也稳定。

### 建议事项
- 明确定义并文档化三种决策语义：
  - `allow`：仅本次请求；
  - `allow_session`：当前 thread 的持久授权；
  - `deny`：如何落状态、如何提示。
- 给 resolve 路由增加显式 authz 校验，至少验证当前调用方是否拥有该 thread / permission request 的操作权。
- 将 `replay_payload` 正式写入接口契约与文档，明确最小字段为 `text/files/additional_kwargs`。
- 前端 pending permission request 展示逻辑继续与后端真实状态对齐，不要回退到仅凭局部 UI 状态判断。
- 补充“批准后是否立即执行”“是否保留上下文”“允许范围有多大”的产品文案与开发契约说明。

### 推荐优先级
- **已完成 / P0 已落地**：把 replay 从“重发文本”改为“重放原请求”。
- **已完成 / P1 已落地**：修正前端 pending permission request 可见性。
- **剩余 P0**：补 resolve authz。
- **剩余 P1**：补清晰的接口/状态契约文档，并收敛 `allow_session` 文案。

### 推荐补充验证
- `allow` / `allow_session` / `deny` 三分支端到端测试。
- 非拥有者调用 resolve 的 authz 失败测试。
- 批准后保留 files / shortcut selections / CLI selections 的 replay 集成测试。
- “后续又发一条人类消息”时 pending request 仍可恢复/展示的前后端联动测试。

---

## 模块 03：CLI Tools Catalog / Runtime Gating

### 模块目标
保障 CLI 工具目录、安装/更新/描述、聊天回合中的 runtime gating、设置页和管理页之间契约一致。

### 当前主要问题
1. `cli_management.awaiting_permission` / `pending_permission_request_id` 已接通到真实生产路径，但 `last_intent` 目前仍偏保守。
2. CLI 工具批准后的恢复语义已接到 permission replay 和 thread state，但仍与聊天主链路存在耦合，后续调整需同步回归验证。
3. CLI runtime gating 测试已经覆盖真实权限请求推进 `awaiting_permission` 的路径，但页面级一致性测试仍然不足。

### 建议事项
- 保持 CLI permission request 与 `thread.values.cli_management` 的正式接通：创建请求时写入 `awaiting_permission + pending_permission_request_id`，resolve 后清理或转移状态。
- 明确 CLI runtime gating 的状态图：inactive → managing → awaiting_permission → managing / inactive。
- 针对 CLI 管理链路增加真实 integration 测试，而不是只测 helper / seeded state。
- 将 CLI tools 管理页、聊天入口、settings 页对同一工具状态的依赖统一到同一后端契约，避免页面间感知不一致。
- 后续可提升 `last_intent` 推断精度，减少当前保守推导。

### 推荐优先级
- **已完成 / P0 已落地**：接通 awaiting_permission 状态机。
- **剩余 P1**：补真实 integration 测试覆盖，而不只靠 seeded state tests。
- **剩余 P1**：统一 CLI tools 在页面、设置、聊天中的状态来源。
- **剩余 P2**：提升 `last_intent` 推断质量。

### 推荐补充验证
- guardrail 发出 CLI permission request 后，thread state 是否进入 `awaiting_permission`。
- resolve 后 CLI 上下文是否恢复，并准确继续原操作。
- CLI 工具管理页 / settings 页 / 聊天中选中工具状态是否一致。

---

## 模块 04：Thread Runtime Profile / Files Workspace

### 模块目标
保障线程执行模式、host workdir、workspace file tree/meta 在聊天页中的上下文一致性与可恢复性。

### 当前主要问题
1. 该模块本身问题不如 permission/CLI 明显，但它为聊天输入和执行上下文提供基础环境，一旦与 replay 或恢复链路不一致，会放大问题。
2. 如果批准后的 replay 丢失原始上下文，runtime profile / workspacePaths 也可能无法按原始请求复现。
3. 文件树、运行模式、线程恢复这些信息目前更像“页面初始化依赖”，建议强化与主聊天提交链路的契约边界。

### 建议事项
- 明确 runtime profile / workspacePaths 是否属于“用户请求上下文的一部分”，若是，应参与 replay/恢复契约。
- 补充“切换 runtime mode 后立即发消息”“刷新后文件树恢复”“host_workdir 异常”场景测试。
- 增加对文件树元信息、空树、路径异常、host 模式切换失败的回归用例。
- 在文档上明确它与 Chat / CLI / Permission 的交叉边界，避免后续实现时把环境层逻辑误放进聊天层。

### 推荐优先级
- **P1**：补运行模式与工作区树的刷新恢复和异常边界测试。
- **P2**：梳理 runtime profile 是否参与 replay 契约。

### 推荐补充验证
- runtime mode 切换后立刻发送消息的链路。
- 文件树 / meta 在刷新、切线程、host_workdir 为空或非法时的表现。
- 被批准后重试的请求是否在相同 runtime profile / workspace 上下文下继续。

---

## 模块 05：Settings / Configuration / Desktop Compatibility

### 模块目标
保障设置页、配置中心、技能开关、desktop/web 共享 API 契约在不同入口下行为一致。

### 当前主要问题
1. skill toggle 前端失败处理已经修正，但仍需补更完整的行为测试覆盖。
2. skill identity 已新增最小铺垫字段 `id`，但后端内部仍主要按 `name` 查找，重名歧义未彻底消除。
3. skill parser 与 validation 的 frontmatter 解析语义已统一为 YAML 解析；validation 仍保留更严格约束。
4. skills router / mcp router 在无 config 时已统一走 `ExtensionsConfig.initialize_config_path()`。
5. desktop compatibility 的测试资产存在，但仍需结合统一契约加强行为级测试，而不只是接口存在性。

### 建议事项
- 保持 skill enable/disable 的前端 mutation 以 `response.ok` 或明确错误响应为准，失败时要有稳定的错误反馈。
- 继续把 skill 的唯一标识从单纯 `name` 升级为更稳定的键；本轮已新增 `id` 铺垫，后续需要让内部查找逻辑也摆脱 `name` 唯一化假设。
- 保持同一套 YAML 解析逻辑贯通 skill validate / install / load，避免“装得进、读不全”。
- skills router 创建/写入配置文件时统一走 `ExtensionsConfig.initialize_config_path()`，避免重引入 cwd 敏感 fallback。
- 对 desktop-client 与 web client 的共享线程接口建立更强的行为对齐测试。

### 推荐优先级
- **已完成 / P0 已落地**：修 skill toggle 错误处理。
- **已完成 / P1 已落地**：统一 parser/validation 行为。
- **已完成 / P1 已落地**：统一 skills config 路径解析。
- **剩余 P1**：统一 skill identity 的内部查找与写入逻辑。
- **剩余 P1**：加强 desktop/web 行为契约测试。

### 推荐补充验证
- skill toggle 在 4xx/5xx 返回时的前端反馈测试。
- 重名 skill 的 list/read/update/delete 行为测试。
- richer YAML frontmatter 的安装 → 加载 → 展示一致性测试。
- 不同 cwd 启动 gateway 时 skills config 更新路径一致性测试。

---

## 跨模块总建议

### 第一优先级（建议立刻处理）
1. resolve 接口补 authz。
2. 统一 permission approval 语义（特别是 `allow_session`）并补文档。
3. 统一 skill identity 的内部查找与写入逻辑。

### 第二优先级（建议尽快处理）
1. 收窄 `allow_session` 权限范围，或明确文案就是线程级授权。
2. 给 thread permission 持久化加并发安全与清理策略。
3. 补 pending permission request 的真实可见性与恢复能力的刷新/重进测试。
4. 补 CLI / settings / chat 页面级一致性测试。

### 第三优先级（工程治理）
1. 前端 contract test 从“字符串存在性”逐步提升到行为断言。
2. 建立跨 web / desktop / permission / CLI 的统一契约测试矩阵。
3. 将 `replay_payload` 与 `resolved_permission_request_ids` 写入正式接口文档。

## 建议交付方式
- 可先按模块拆成 5 个 issue / task。
- 若想快速降低风险，建议先按“跨模块 P0 问题”拉一个短周期修复计划，而不是逐模块平均推进。
- 若后续要继续写建议文档，可在本文件基础上拆成：
  - `docs/suggestion/01-chat-thread-runtime.md`
  - `docs/suggestion/02-permission-request-guardrail-resolution.md`
  - `docs/suggestion/03-cli-tools-runtime-gating.md`
  - `docs/suggestion/04-thread-runtime-profile-files-workspace.md`
  - `docs/suggestion/05-settings-configuration-desktop-compatibility.md`
