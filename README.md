# 一念 Nion

一念之间，万事即达。你的专属 AI 智能助手，懂你所想，为你而行。
耗费繁琐操作，只需一个念头，工作与生活，皆可轻松托付。

一念 Nion 是一个面向真实任务执行的 AI 智能体系统。它将多智能体编排、工具调用、沙箱执行、上下文存储（Context-Store）和可扩展技能整合在同一套运行时中，帮助你把“想法”快速落地为可执行结果。

---

## 核心能力

- 多智能体协作：主智能体可按任务拆解并调度子智能体并行执行
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
- Memory OS：当前代码库已将 user model、prompt/continuity context、growth governance、retention、agent-owned automation ownership 全部纳入统一 Memory OS 主链
- Soul System：主智能体使用 canonical soul artifact 与 compiled soul runtime，运行时不再依赖 `SOUL.md` fallback
- Memory / Soul 完整版本收口能力：当前代码库已补 canonical clock、soul runtime freshness、growth orchestrator、retention archive/purge、agent-owned automation bridge，以及前端 `test:contracts` 合同测试入口
- 能力治理主线：当前代码库已补 capability catalog / capability actions / skill runtime / explicit notebook-memory bridge provenance / capability autopilot prompt guidance；默认策略改为“用户只说目标，agent 优先自动发现并调用 notebook / memory / skill / MCP / CLI 能力”
- token telemetry：聊天主流与子智能体流式执行会按 chunk 逐步标记 token source，避免跨 Python `Context` 恢复流时触发 telemetry 清理异常

---

## 双端产品面

当前代码库维护两个一方产品面：

- Web：浏览器客户端 + 部署态后端服务
- Desktop：Electron 单窗口客户端 + 本机单 daemon 运行时

两者共享同一套一方 `/api/*` 契约和核心能力语义；差异只应存在于 shell、打包方式和运行时宿主环境。

- 桌面 renderer 通过特权 `nion://app` 协议加载静态资源
- preload 会向前端同步注入本地 helper base URL，前端不再假设 `/api/*` 由浏览器同源反代提供
- 本地 daemon 必须与 renderer 需要的 gateway 路由保持同步，包括 `/api/model-admin/*` 与 `/api/threads/{thread_id}/runtime-profile`
- `electron-builder` 默认发布到 GitHub Releases；只有设置 `NION_UPDATE_BASE_URL` 时才会额外写入 generic/CDN 更新源
- `make build-desktop` 只做桌面编译；`make desktop-dev` 会在编译后直接拉起 Electron
- `make desktop-dev` 现在会在启动前自动强制停止旧的 Vite renderer、旧的 Electron 主进程，以及占用 `127.0.0.1:43115` 的本地 daemon，避免新一轮开发会话复用上一轮残留进程
- `make desktop-start` 会直接启动已编译好的桌面端，不再重复编译
- `nion daemon status` 与 `nion daemon stop` 提供本地 daemon 管理入口

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

这些事件必须既可查询，又要有人能直接读懂。

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

开发代理配置里的 `allowedDevOrigins` 已允许 `127.0.0.1` 与 `localhost`，因此可通过 `http://127.0.0.1:2026` 或 `http://localhost:2026` 访问统一开发入口。

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
  - 页面只展示分组后的用户画像、长期背景、事实记忆
  - 记忆维护动作不再作为独立产品入口暴露；用户通过对话直接纠正，系统负责内部维护
- `Settings > Soul`
  - 只展示稳定层 Soul 设置：核心人格、说话方式、价值观 / 边界、关系基调
  - 稳定层只能由用户显式设置或在对话中明确要求修改
  - `adaptive_overlay` 仅作为弱可见的临时表达模式提示存在
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
