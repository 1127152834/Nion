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
- 快捷入口合同：聊天输入框支持 Context / Skill / MCP / CLI 四类选择入口
- 上传与产物链路：文件上传、解析、产物访问与下载能力完整闭环
- Notebook 第二大脑：本地 Markdown 知识库、收件箱闪记、目录管理、版本历史与回收站恢复
- Projects 长期工作容器：顶层 Projects 模块支持项目列表、项目驾驶舱、实施计划、项目会话、项目时间线、完成阶段提炼建议与受管产物恢复
- 上下文存储：支持 workspace/thread 级上下文沉淀与召回
- 临时会话保护：`temporary_chat` 默认允许读取长期记忆但禁止写回，避免污染长期记忆文件
- 聊天追问建议模型可在“模型设置”页单独指定；未设置时默认跟随当前聊天模型
- 嵌入式会话契约：`NionClient` 与 scheduler workflow 也支持 `session_mode` / `memory_read` / `memory_write`，与 Web 聊天入口保持一致；带 checkpointer 的多轮线程会继承已持久化的记忆会话策略，不会因后续缺省调用而误恢复长期记忆注入/写回
- 结构化长期记忆：当前仍以 `/api/memory` 为主入口，记忆设置页支持存储 provider 选择、当前记忆本地筛选、整库清空和单条事实删除，且这些配置均通过设置中心持久化，不回流 `config.yaml`

---

## 双端产品面

当前分支维护两个一方产品面：

- Web：浏览器客户端 + 部署态后端服务
- Desktop：Electron 单窗口客户端 + 本机单 daemon 运行时

两者共享同一套一方 `/api/*` 契约和核心能力语义；差异只应存在于 shell、打包方式和运行时宿主环境。

- 桌面 renderer 通过特权 `nion://app` 协议加载静态资源
- preload 会向前端同步注入本地 helper base URL，前端不再假设 `/api/*` 由浏览器同源反代提供
- 本地 daemon 必须与 renderer 需要的 gateway 路由保持同步，包括 `/api/model-admin/*` 与 `/api/threads/{thread_id}/runtime-profile`
- `electron-builder` 默认发布到 GitHub Releases；只有设置 `NION_UPDATE_BASE_URL` 时才会额外写入 generic/CDN 更新源
- `make build-desktop` 只做桌面编译；`make desktop-dev` 会在编译后直接拉起 Electron
- `make desktop-start` 会直接启动已编译好的桌面端，不再重复编译
- `nion daemon status` 与 `nion daemon stop` 提供本地 daemon 管理入口

## Notebook

桌面端 Notebook 现在是一个本地优先的个人知识库工作台，根目录固定为：

`~/.nion-data/notebook`

当前版本已支持：

- Markdown 笔记创建与编辑
- `收件箱` 优先的闪记捕获
- 目录树浏览与目录创建
- 笔记移动、重命名、删除到回收站
- 版本历史查看与恢复
- Agent 协助改写、总结、扩写与从对话导入内容

Notebook 是用户资产，不是 agent memory。用户笔记、agent memory、agent diary 仍然保持边界分离。

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
- pnpm
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

启动后访问：

- 应用入口：`http://localhost:2026`
- Gateway API：`http://localhost:2026/api/*`
- LangGraph：`http://localhost:2026/api/langgraph/*`
- Config Center API：`http://localhost:2026/api/config*`
- Model Admin API：`http://localhost:2026/api/model-admin/*`
- Models API：`http://localhost:2026/api/models*`（运行时兼容目录，默认模型解析已改为 registry/database-backed flow）
- Runtime Profile API：`http://localhost:2026/api/threads/{thread_id}/runtime-profile`
- Thread Files API：`http://localhost:2026/api/threads/{thread_id}/files/*`
- CLI Catalog API：`http://localhost:2026/api/cli/catalog`
- Projects API：`http://localhost:2026/api/projects*`

如果只调试 web 前端，也可以直接运行：

```bash
cd frontend && pnpm dev
```

此模式下 Next.js 会直接转发：

- `/api/langgraph/*` → `http://127.0.0.1:2024/*`
- 其余 `/api/*` → `http://127.0.0.1:8001/api/*`

如果需要显式执行静态导出构建，请使用：

```bash
NION_STATIC_EXPORT=1 pnpm --dir frontend build
```

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
├── frontend/       # Next.js 前端工作台（Chats / Projects / Automation / Notebook 等顶层模块）
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
- Project 线程还会通过 `context` 透传 `project_id`、`project_phase`、`primary_plan_id`，用于把项目级共享上下文带入聊天 runtime；Project 的权威状态始终由 `/api/projects/*` 提供。
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
