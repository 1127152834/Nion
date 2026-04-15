# 一念 Nion

一念之间，万事即达。你的专属 AI 智能助手，懂你所想，为你而行。
耗费繁琐操作，只需一个念头，工作与生活，皆可轻松托付。

一念 Nion 是一个面向真实任务执行的 AI 智能体系统。它将多智能体编排、工具调用、沙箱执行、上下文存储（Context-Store）和可扩展技能整合在同一套运行时中，帮助你把“想法”快速落地为可执行结果。

---

## 核心能力

- 多智能体协作：主智能体统一对外发声，custom agent 可被调度为临时子会话执行，并在左侧历史中展开检查
- 沙箱与文件系统：支持安全执行命令、读写文件、产物沉淀与回溯
- 技能系统：支持按需加载技能（SKILL）与工具扩展（含 MCP）
- 配置中心：运行时可视化配置，配置持久化到本地 SQLite
- 聊天运行时：支持线程级 sandbox/host 模式、工作目录面板与单工作区展示
- 自动化工作台：自动化已改为单页工作台，定时任务沿用聊天输入能力并支持 `@笔记`，结果区可直接预览关联线程
- 快捷入口合同：聊天输入框支持 Context / Skill / MCP / CLI 四类选择入口
- 上传与产物链路：文件上传、解析、产物访问与下载能力完整闭环
- 附件发送语义：聊天输入框现在支持“纯附件”直接发送；附件只会在消息真正提交成功后清空，失败时会保留当前文本与附件便于重试
- 模型设置持久化：自定义供应商的连接状态会按 `protocol/base_url/api key` 变更自动失效；测试成功后在配置未变化时保持“已连接”，已保存 API Key 会以部分掩码形式回显
- Notebook 个人知识库：收件箱优先的笔记与工作材料库，支持聊天沉淀、显式保存工作产物副本、目录管理、版本历史与回收站恢复
- 上下文存储：支持 workspace/thread 级上下文沉淀与召回
- 临时会话保护：`temporary_chat` 默认允许读取长期记忆但禁止写回，避免污染长期记忆文件
- 聊天追问建议模型可在“模型设置”页单独指定；未设置时默认跟随当前聊天模型
- 嵌入式会话契约：`NionClient` 与 scheduler workflow 也支持 `session_mode` / `memory_read` / `memory_write`，与 Web 聊天入口保持一致；带 checkpointer 的多轮线程会继承已持久化的记忆会话策略，不会因后续缺省调用而误恢复长期记忆注入/写回
- 结构化长期记忆：`/api/memory` 已切到 Memory OS 兼容视图，运行时不再以 `memory.json` 作为长期记忆后端
- 用户身份主档：后端新增 `/api/user-identity` 稳定 owner，用于承载用户姓名、互相称谓与长期沟通偏好这类 always-on 身份信息；运行时上下文会优先注入这层，再拼接稳定 Soul
- 显式身份提取：记忆提取链已能确定性识别“我叫张天成”“你以后叫我大哥，我叫你小老弟”这类名字与互称契约信号，避免再被误折叠成泛化称呼偏好
- 聊天直写闭环：当前轮显式说出的名字、互称规则、沟通偏好会直接写入 `UserIdentityProfile`，后续 continuity/runtime 不再依赖下一轮 recall 才生效
- Soul 直写闭环：当前轮显式说出的长期说话方式、价值边界、关系基调会直接写入 stable soul，不再只停留在设置页或 onboarding tool
- 稳定身份投影：`/api/memory` 的 `user_profile` 现在会投影用户姓名、互称、沟通偏好、角色、时区、互动边界、长期背景等稳定身份信息
- 稳定设置写入合同：`/api/user-identity` 与 `/api/memory/soul` 已支持字段级即时写入，为设置页的卡片级保存提供后端基础
- 文件原生重构方向：Memory / Identity / Soul 的下一阶段设计已收敛到 `SOUL.md` / `IDENTITY.md` / `MEMORY.md` 作为主档、数据库与向量索引作为投影与检索层，详见 `docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md`
- 文件原生主链首批已落地：`/api/memory` 已切成只读产品面；`/api/identity/document` 与 `/api/soul/document` 已支持 whole-document Markdown 读写；聊天中的显式 Identity / Soul 修改也会同步回写 `IDENTITY.md` / `SOUL.md`
- 互称规则归一化：即使用户在设置页分开保存“称呼你”和“我的自称”，系统也会自动生成稳定的互称规则，避免出现半配置状态
- Memory OS：当前代码库已将 user model、prompt/continuity context、growth governance、retention、agent-owned automation ownership 全部纳入统一 Memory OS 主链
- Soul System：主智能体使用 canonical soul artifact 与 compiled soul runtime，运行时不再依赖 `SOUL.md` fallback
- Memory / Soul 完整版本收口能力：当前代码库已补 canonical clock、soul runtime freshness、growth orchestrator、retention archive/purge、agent-owned automation bridge，以及前端 `test:contracts` 合同测试入口
- 能力治理主线：当前代码库已补 capability catalog / capability actions / skill runtime / explicit notebook-memory bridge provenance / capability autopilot prompt guidance；默认策略改为“用户只说目标，agent 优先自动发现并调用 notebook / memory / skill / MCP / CLI 能力”
- token telemetry：聊天主流与子智能体流式执行会按 chunk 逐步标记 token source，避免跨 Python `Context` 恢复流时触发 telemetry 清理异常
- 临时子会话：被调度 custom agent 的执行记录会以 parent thread 下的临时 child runs 形式存在，可检查但不进入正式 thread history / search
- delegated runtime 收口：被调度 custom agent 默认关闭 MCP，并只保留最小化 builtin surface，避免继承主线程的 control-plane / mutation 工具面
- 主智能体 speaking contract 已重新收口：delegated child agents 现在只产出 internal work products，最终用户回复重新回到主智能体 synthesis 路径；A2A streaming 也已改为优先终态文本，避免用更长的 partial 草稿覆盖最终答案
- 远程协同边界：站内 local custom-agent orchestration 默认走 LangGraph；ACP 与 A2A 都可以作为真实 remote transport 使用

---

## 双端产品面

当前代码库维护两个一方产品面：

- Web：浏览器客户端 + 部署态后端服务
- Desktop：Electron 单窗口客户端 + 本机单 daemon 运行时

两者共享同一套一方 `/api/*` 契约和核心能力语义；差异只应存在于 shell、打包方式和运行时宿主环境。

- 桌面 renderer 通过特权 `nion://app` 协议加载静态资源
- preload 会向前端同步注入本地 helper base URL，前端不再假设 `/api/*` 由浏览器同源反代提供
- 本地 daemon 必须与 renderer 需要的 gateway 路由保持同步，包括 `/api/model-admin/*` 与 `/api/threads/{thread_id}/runtime-profile`
- Electron client session 现在会在 daemon 被替换后自动恢复；同一个 `client_id` 的 heartbeat 不再因为 daemon 重启而长期卡在 `404 client not found`
- `electron-builder` 默认发布到 GitHub Releases；只有设置 `NION_UPDATE_BASE_URL` 时才会额外写入 generic/CDN 更新源
- `make build-desktop` 只做桌面编译；`make desktop-dev` 会在编译后直接拉起 Electron
- `make desktop-dev` 现在会在启动前自动强制停止旧的 Vite renderer、旧的 Electron 主进程，以及占用 `127.0.0.1:43115` 的本地 daemon，避免新一轮开发会话复用上一轮残留进程
- `make desktop-start` 会直接启动已编译好的桌面端，不再重复编译
- `nion daemon status` 与 `nion daemon stop` 提供本地 daemon 管理入口
- Desktop 产品面现在开始把本地 daemon 明确收口为 `Guardian Mode / 值守模式`：用户面对的是“窗口关闭后仍持续在线的个人电脑”，而不是一个裸露的后台守护进程开关
- `/api/daemon/runtime-info` 现在除保留原有 `allow_background_running` 外，还会返回 `guardian_mode` 与 `bridge_runtime` 摘要，供桌面产品面展示真实运行态而不是只显示配置值
- bridge 线程现在会把 binding 的工作目录显式映射进 runtime 主链的 `execution_mode` / `host_workdir` 上下文；空字符串和纯空白目录会稳定回落到 `sandbox`，不再依赖字符串 truthiness
- `bridge` surface 现在会显式继承 `channel` surface policy（若未单独配置 `bridge` 规则），避免 bridge run 静默绕过既有工具分组限制
- `/workspace/bridge` 现在以“统一远程入口”而不是“若干 bridge bot 设置页”来 framing：所有已连接渠道都被表述为进入同一台电脑、同一组任务和同一个确认队列的入口
- Desktop bridge 现在通过 `bridge:get-runtime-info` 暴露统一 runtime snapshot，renderer 不再需要自行拼接 `getStatus` / bindings / incidents 来理解远程入口状态
- `/workspace/bridge` 现在在各平台配置之前显示 overview panel，汇总运行状态、活跃绑定、待处理事件、已启用渠道与只读风险提示
- bridge overview 现在提供 overview 级别的诊断与重启入口；这些入口复用现有 bridge client 方法，不引入平台级动作或 incident resolution UI

## Notebook

桌面端 Notebook 现在是一个本地优先的个人知识与工作材料库，根目录固定为：

`~/.nion-data/notebook`

当前版本已支持：

- Markdown 笔记创建与编辑
- `收件箱` 优先的首页与闪记捕获
- 目录树浏览与目录创建
- 笔记移动、重命名、删除到回收站
- 版本历史查看与恢复
- 从聊天内容显式沉淀为笔记
- 从工作空间产物显式保存副本到 Notebook
- Agent 协助改写、总结、扩写与从对话导入内容

Notebook 是用户资产，不是 agent memory，也不是项目管理器。用户笔记、agent memory、agent diary 仍然保持边界分离。

## 控制平面

当前本地运行时正在演进为一个 daemon-owned control plane。它的目标不是做第二个用户界面，而是让 Electron、薄 CLI 与 agent 自检/自操作都能共享一套结构化状态、日志与诊断面。

第一阶段要求：

- daemon lifecycle events
- thread stream events
- delegated task lifecycle events
- subagent execution lifecycle events
- skill mutation events
- config mutation events

当前还新增了 task 级诊断入口：

- daemon API 可按 `run_id` / `task_id` 查询 delegated execution
- agent built-in tools 可直接读取 task diagnostics

Program 03C 已把 channel control plane 补上：

- daemon 在桌面模式下拥有 channel-service 生命周期
- `/api/daemon/channels/*` 是 channel self-ops 的权威 control-plane surface
- `/api/channels/*` 保留给兼容层和 UI
- 已覆盖 channel service lifecycle、message-bus telemetry、channel diagnostics、bounded runtime actions
- daemon channel control actions 当前只包括 restart、pairing code、approve/reject pair request、revoke authorized user
- daemon channel control plane 明确不包含 config、credentials、session override 变更

Program 03D-A 已把非 bridge incident workflow 补上：

- daemon control plane 现在会持久化 `incident records`，作为日志与 diagnostics 之上的诊断结果层
- 第一版入口是 `chat-triggered diagnosis`，用于显式诊断最近一次 agent-execution 失败
- 当前已实现的 `agent-execution incident playbooks` 包括 `task_timeout`、`subagent_failure`、`tool_execution_failure`、`thread_stream_failure`
- diagnosis 是 suggestion-first，采用 `suggested-action confirmation model`，不会在这一阶段自动执行高影响修复动作
- 桌面 `desktop diagnostics center` 已完成数据契约设计，但 UI 本身仍然是 designed-but-deferred
- 本阶段明确不覆盖 bridge/channel incidents，也不实现 `daemon_runtime` playbooks 和 auto-remediation

Program 03D-B 已把 desktop bridge incident workflow 补上：

- bridge incident 的 owner 现在是 Electron main，而不是 backend daemon
- bridge runtime 的 observations 和 incidents 都保存在 desktop userData 下的 bridge store
- bridge incident IPC 已支持 `diagnose / list / get / dismiss / run-action`
- 第一版已实现的 bridge incident 类型包括 `bridge_manager_down`、`adapter_start_failure`、`adapter_runtime_failure`、`bridge_delivery_failure`
- recovery workflow 仍然是 suggestion-first，必须确认后才会执行 `bridge:run-action`
- 当前 bridge 页面已经包含最小 self-heal panel，后续 richer diagnostics center 会在此基础上继续扩展
- `binding_resolution_error`、`permission_workflow_stuck` 仍然是后续阶段

当前还新增了首批 Guardian Mode / Remote Entry 合同收口：

- `Settings > Daemon` 现在开始按 `Guardian Mode / 值守模式` 呈现，并显示基于运行态计算出的 `standing_by / busy / offline` 状态，而不是只显示 daemon 配置布尔值
- `bridge:get-runtime-info` 是桌面 bridge overview 的单一 snapshot IPC 合同，字段包括运行态、自动启动、启用渠道数、活跃绑定数、待处理事件数与启动时间
- `frontend/src/core/bridge/client.ts` 暴露 `BridgeRuntimeInfo` 与 `getRuntimeInfo()`，作为 `/workspace/bridge` overview 的唯一数据入口
- bridge overview 的诊断/重启动作仍是 overview-level affordance，不等价于受控本机动作，也不进入 per-platform action 语义
- guardian settings 通过桌面 runtime helper 汇总 desktop runtime bridge + `/api/daemon/runtime-info` 的结果，以一个 settings-facing contract 暴露给页面
- slice 3 现在开始把 guardian settings 与 bridge overview 的运行态读取进一步统一到共享的 frontend runtime visibility contract：页面不再各自拥有 mount/focus/visibility 的刷新策略
- `frontend/src/core/runtime/guardian-runtime.ts` 现在是 guardian / bridge runtime merge 与 fallback 的唯一 owner；`frontend/src/core/runtime/use-guardian-runtime.ts` 负责统一 refresh 触发
- 当前这个产品面仍然只做单用户、一台个人电脑；不覆盖团队、多用户或任意远程控机
- 受控本机动作主链首批已落地：daemon config 提供全局三档 `local_actions_permission_mode`，`/api/local-actions/plan` 会生成目标 / 动作计划 / 执行审计记录，`Settings > Daemon` 已提供对应权限开关；desktop main 已支持首批白名单动作（当前窗口截图、全屏截图、整理下载目录）和本地执行历史，但仍不支持任意远程控机

这些事件必须既可查询，又要有人能直接读懂。

## 项目知识库

当前项目知识库主工作区位于：

- `/Users/zhangtiancheng/Documents/wiki`

仓库内的阅读导航入口位于：

- `docs/project-knowledge-map.md`

约束：

- 重大功能、路由、UI、状态真相源、残余清理变更，必须同步更新知识库页面
- 不要把知识理解建立在过期 review 或旧路径 `~/wiki` 假设上

## 快速开始

### 1) 准备环境

- Node.js 22+
- pnpm（或启用 Corepack，由仓库自动解析 `pnpm@10.26.2`）
- uv
- nginx

可先运行：

```bash
make check
```

### 2) 初始化环境变量

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

运行时配置由应用内“配置中心”统一管理并持久化到本地 SQLite。

- 默认数据库路径：`$HOME/.nion/config.db`
- 可通过 `NION_HOME` 或 `NION_CONFIG_DB_PATH` 覆盖
- `config.yaml` 不再是启动必需项；即使本地没有 YAML，`make dev` 也会以 Config Center 默认值启动
- 如果你还保留旧的 `config.yaml`，当前脚本会继续兼容并自动补齐缺失字段，但新的设置写入路径应统一走应用内设置页
- 线程工作目录根现在映射到 `~/.nion-data/threads/{thread_id}/user-data/workdir`

可选（自定义数据库位置）：

```bash
export NION_CONFIG_DB_PATH=/path/to/config.db
```

### 3) 安装依赖

```bash
make install
```

### 4) 启动开发环境

```bash
make dev
```

`make dev` 会调用前端开发服务器的默认脚本，也就是 `pnpm --dir frontend dev`，当前实际执行的是 `next dev --webpack`。这里默认使用 webpack-backed dev server，是为了规避非 ASCII 工作目录下已知的 Turbopack panic；当前仓库路径包含中文目录名时，也应保持这一默认值。

启动后访问：

- 应用入口：`http://localhost:2026`
- 应用入口（127.0.0.1）：`http://127.0.0.1:2026`
- Gateway API：`http://localhost:2026/api/*`
- LangGraph：`http://localhost:2026/api/langgraph/*`
- Config Center API：`http://localhost:2026/api/config*`
- Model Admin API：`http://localhost:2026/api/model-admin/*`
- Models API：`http://localhost:2026/api/models*`（运行时兼容目录，默认模型解析已改为 registry/database-backed flow）
- Runtime Profile API：`http://localhost:2026/api/threads/{thread_id}/runtime-profile`
- Thread Files API：`http://localhost:2026/api/threads/{thread_id}/files/*`
- CLI Catalog API：`http://localhost:2026/api/cli/catalog`
- User Identity API：`http://localhost:2026/api/user-identity`

当前与 CLI / runtime profile 相关的行为约定：

- 输入框里选择的 CLI 工具会作为运行时偏好传给 agent，不再把内部提示标签写进用户消息正文。
- `runtime-profile` 的 `execution_mode=host` 现在会实际传到执行链路；在本地 sandbox provider 下，host 模式会允许主 agent 与 task 子任务走本机 `bash`/CLI 执行。
- 如果线程仍处于 `sandbox` 模式，`docker` 这类本机命令仍会被本地 sandbox 安全策略拦截。

当前 prompt runtime 的装配约定：

- `SYSTEM_PROMPT_TEMPLATE` 继续作为核心静态 prompt 主体。
- 动态 section 不再由 `lead_agent.prompt` 手工逐段拼接，而是通过 `backend/packages/harness/nion/prompt_sections/` 下的 provider 组装。
- `threads/service.py` 只负责把 notebook / runtime-profile / session guidance 透传到运行时上下文，不负责拼接 prompt 文本。

如果只调试 web 前端，也可以直接运行：

```bash
pnpm --dir frontend dev
```

此模式下 Next.js 会直接转发：

- `/api/langgraph/*` → `http://127.0.0.1:2024/*`
- 其余 `/api/*` → `http://127.0.0.1:8001/api/*`

开发代理配置里的 `allowedDevOrigins` 已允许 `127.0.0.1` 与 `localhost`，因此可通过 `http://127.0.0.1:2026` 或 `http://localhost:2026` 访问统一开发入口。若前端直接跑在 `3000` 端口，网关 CORS 也必须同时允许 `http://localhost:3000` 与 `http://127.0.0.1:3000`，否则设置页和 Memory 页会因为浏览器预检失败回退到空默认状态。

如果需要显式启用 Turbopack，请运行：

```bash
pnpm --dir frontend dev:turbo
```

`dev:turbo` 仅建议在 ASCII-safe 工作目录中，或需要做 Turbopack 专项调试时使用；日常开发默认继续使用 webpack-backed `next dev`。

如果需要显式执行静态导出构建，请使用：

```bash
NION_STATIC_EXPORT=1 pnpm --dir frontend build
```

当前 Memory Workspace 的增量产品面：

- `/workspace/memory`
  - 只保留单一用户可见 Memory 页面
  - 页面只展示分组后的你的信息、长期背景、事实记忆
  - 记忆维护动作不再作为独立产品入口暴露；用户通过对话直接纠正，系统负责内部维护
- `Settings > 身份`
  - 独立承载用户姓名、别名、互称、沟通偏好、角色、时区、互动边界、长期背景
  - 每个字段单独保存，不会因为保存一项而冲掉其他未保存输入
- `Settings > Soul`
  - Soul 稳定层按字段逐项即时保存，不再依赖统一草稿 / 应用区
  - 稳定层只能由用户显式设置或在对话中明确要求修改
- `Settings > 记忆`
  - 现在只承载“检索增强状态”投影与跳转入口
  - 检索模型配置、测试、能力 gating 迁到 `Settings > 检索模型`
  - 未配置检索模型时，长期记忆继续走非向量回退检索
- `Settings > 检索模型`
  - 统一承载向量模型与重排序模型能力
  - `Memory` 与 `Knowledge Base` 作为共享消费者，不再各自维护一套模型配置
- `/workspace/automation/*`
  - 已开始区分 `user-owned` 与 `agent-owned` automation
  - 列表页会分开呈现 `用户创建` 与 `Agent 创建`
  - `agent-owned` 任务可见、可 pause/resume，但不能走普通编辑链路
  - 详情页会解释 `编辑权限 / 来源记忆 / 来源学习主题`
  - 后端创建链路已支持 `owner_type / mutability / provenance_memory_id / provenance_learning_id`，并通过 Memory OS automation bridge 把 soul-driven automation 正式上升为一等数据
- Memory OS retention
  - `retention.py` 已支持最小 `active -> archived -> purged` 生命周期
  - prompt context assembly 只读取 `active` 记录，归档与清理记录不会继续进入热路径上下文
- 前端合同测试
  - `frontend/package.json` 已提供 `pnpm test:contracts -- <test files...>` 入口，用于运行 memory/soul 相关 `node:test` 合同测试
- 能力治理 runtime
  - 后端已提供 `get_capability_catalog`、`get_capability_actions`、`execute_capability_action`
- custom-agent orchestration
  - 主聊天仍然只有一个正式对外发声者：主智能体
  - 被调度的 custom agent 会以 parent thread 下的临时 child runs 运行
  - child runs 可从 active thread row 展开检查，但不会进入正式 recent chats / thread search
  - 本地 custom-agent 协同优先走 LangGraph；ACP/A2A 只是 remote transport seam
  - agent prompt 已获得压缩版 capability guidance，并默认采用 capability autopilot 策略
  - `bridge:notebook-to-memory` 仍然是显式桥接，不会把 Notebook 自动变成 Memory

---

## Docker 开发模式

```bash
make docker-init
make docker-start
```

访问：`http://localhost:2026`

---

## 项目结构

```text
.
├── backend/        # FastAPI Gateway + LangGraph + 配置/沙箱/上下文存储能力
├── frontend/       # Next.js 前端工作台（Chats / Automation / Notebook 等顶层模块）
├── docker/         # Nginx、开发容器与沙箱相关配置
├── scripts/        # 开发与运维脚本
├── skills/         # 内置与扩展技能目录
└── docs/           # 架构、接口与实施文档
```

## 测试文档

仓库内按真实业务模块拆分的测试交接文档位于 `docs/test/`。

项目级知识导航入口位于 `docs/project-knowledge-map.md`，适合在做架构梳理、大整改、Memory/Soul 相关改造前先读一遍。

- 总览索引：`docs/test/README.md`
- 模块文档：`docs/test/<模块目录>/README.md`

这些文档面向 Codex 或其他 agent，包含接口测试、UI 测试、agent-browser E2E、回归与自动化建议，可直接作为后续测试执行输入。

### 运行时参数约定

- Web / LangGraph SDK 请求统一通过 `context` 传递运行时字段，如 `thread_id`、`model_name`、`thinking_enabled`、`is_plan_mode`、`subagent_enabled`、`agent_name`、`session_mode`、`memory_read`、`memory_write`。
- 不要在同一个 HTTP 请求里同时传 `config.configurable` 和 `context`；当前 LangGraph 运行时会拒绝这类请求并返回 400。
- 嵌入式 Python 客户端会继续保留 `config.configurable.thread_id` 供 checkpointer 使用，其余运行时字段仅通过 `context` 传递。

---

## Desktop Surface

Electron 桌面端仍然是当前最完整的本地优先体验，目标是实现“安装即用”的前后端一体桌面体验：

- 单本地 daemon 运行时
- Electron 单窗口客户端
- 本地 SQLite 持久化
- 用户目录统一数据管理
- 沙箱与文件路径在桌面端可控、可诊断、可恢复

---

## v0.10 发布说明

`v0.10` 为项目基础版本，完成了核心骨架与关键能力闭环：

- 初始化前后端工程与统一开发流程
- 完成 AI 工作台基础界面与会话链路
- 落地配置中心（SQLite 持久化）
- 完成文件上传、产物访问、技能管理与工具调用基础能力
- 建立沙箱执行与线程级文件目录管理机制

---

## 许可证

本项目采用 [MIT License](./LICENSE)。

### 通道会话覆盖与 HTML 预览

- Channels 设置页支持两层会话参数：通道级 `Session Defaults` 与授权用户级 `Session Override`。
- 覆盖优先级固定为：授权用户覆盖 > 通道默认 > 当前桥接层硬编码基础值。
- 当前 v1 会话覆盖只支持 `assistant_id`、`config.recursion_limit`、`context.thinking_enabled`、`context.is_plan_mode`、`context.subagent_enabled`。
- “继承”语义表示字段不持久化、也不会被发送到运行时 payload。
- HTML artifact 预览走 `iframe.srcDoc`，并使用 `sandbox="allow-scripts allow-forms"`；原始 artifact URL 的打开/下载行为保持不变。
