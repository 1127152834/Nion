# PRD: Single Main Agent + Governed Custom-Agent Orchestration

日期：2026-04-11
状态：Draft for consensus review
输入规格：`.omx/specs/deep-interview-custom-agent-main-vs-subagent.md`

## Task

把 Nion 当前“custom agent 只能作为线程 persona 单独使用”的结构，演进成“唯一主智能体 + 可独立使用也可被调度的 custom agent 协同系统”。

目标系统必须支持：

- 主智能体是唯一正式对外主智能体
- custom agent 既能在 Agent 模块中单独使用，也能被主智能体按需调度
- 聊天内支持 `@智能体A -> @智能体B -> @智能体C` 的显式编排链
- 被调度智能体默认不直接向用户发言，只把结果回传给主智能体
- 子智能体运行会话可像 Codex 一样在左侧历史中展开检查
- 子会话是任务级临时会话，任务结束自动关闭，不归档
- 方案必须优先利用 LangGraph 的编排与流式能力；只有在跨 runtime / 跨边界协同时才引入 A2A 协议层

## Desired Outcome

1. custom agent 从“可选 persona”升级为“可独立使用、也可被调度的治理型智能体”
2. 主智能体获得统一调度 custom agent 的运行时桥接能力
3. `@智能体` 成为显式编排语法，而不是仅仅做文本提示
4. 权限、私有 skill、SOUL、长期记忆在“独立使用态 / 被调度态”之间有一致、可测试的治理规则
5. 左侧最近聊天列表支持展开查看子智能体临时会话，但这些子会话不进入正式历史

## Principles

1. 用户面只有一个正式说话者：主智能体。
2. custom agent 是有身份的智能体，不是匿名工具包。
3. 站内多智能体协同优先使用 LangGraph 原生编排；A2A 只用于跨 runtime / 跨边界协同。
4. 子智能体运行痕迹必须可检查，但不应污染正式线程历史。
5. 被调度态默认最小权限、最小长期写入、最小对外暴露。

## Decision Drivers

1. 当前 custom agent 只通过 `agent_name` 进入 lead runtime，尚未接入可调度执行链：
   - `backend/packages/harness/nion/agents/lead_agent/agent.py:259-370`
   - `backend/packages/harness/nion/config/agents_config.py:56-172`
2. 当前主智能体可调度的只有 built-in subagent registry：
   - `backend/packages/harness/nion/tools/builtins/task_tool.py:321-470`
   - `backend/packages/harness/nion/subagents/registry.py:13-51`
   - `backend/packages/harness/nion/subagents/executor.py:499-610`
3. 当前前端已具备部分“子任务可视化”基础，但只存在于主消息流内，不是左侧临时子会话：
   - `frontend/src/core/messages/utils.ts:32-49`
   - `frontend/src/core/messages/utils.ts:142-147`
   - `frontend/src/components/workspace/messages/message-list.tsx:173-260`
4. 当前线程存储/搜索只认正式线程，且会把 `threads/*/thread.json` 当作长期历史：
   - `backend/packages/harness/nion/threads/models.py:8-62`
   - `backend/packages/harness/nion/threads/repository.py:37-130`
   - `backend/app/gateway/routers/threads.py:100-165`
5. 当前左侧最近聊天列表已经支持分组/折叠，适合作为“主线程下展开临时子会话”的 UI 落点：
   - `frontend/src/components/workspace/recent-chat-list.tsx:440-540`

## Viable Options

### Option A: 继续扩展现有 `task` / built-in subagent 体系

做法：
- 让 `task` 支持 `subagent_type=<custom-agent-name>`
- 把 custom agent 混入 `subagents.registry`
- 继续沿用现有 SubtaskCard 与 tool message 呈现

Pros:
- 后端改动面看起来较小
- 能复用现有 task lifecycle 事件

Cons:
- 把“built-in worker subagent”和“catalog identity agent”硬塞进同一个 registry，概念上错误
- `task` 当前参数面是静态的，不适合作为 `@智能体链式编排` 的长期协议
- 很难自然表达独立 SOUL / 私有 skill / 被调度态治理
- 仍然只能在主消息流中内嵌显示，不适合左侧临时子会话

### Option B: 在现有 agent runtime 之上增加 LangGraph 原生编排层

做法：
- 保留当前 `create_agent(...)` 作为主智能体和 worker 智能体的执行引擎
- 新增一层显式 orchestration graph，负责：
  - 解析 `@智能体`
  - 规划调度链
  - fan-out/fan-in 子智能体执行
  - 合并结果
  - 产生临时子会话事件
- custom agent 不进入 built-in subagent registry，而是通过新的 catalog-agent delegation bridge 被调度

Pros:
- 语义正确：主智能体、catalog agent、worker 执行态被清晰分层
- 最大化利用 LangGraph 的状态流转、流式事件、自定义事件和可观测性
- 能同时支撑“独立使用态”和“被调度态”
- 适配左侧临时子会话 UI 更自然
- 为后续 A2A / ACP 远程 agent 扩展保留清晰接口

Cons:
- 需要引入新的 orchestration state 和 child-run contract
- 比继续补 `task` 更像一次真正边界重构

### Option C: 直接把多智能体协调外包给 A2A/外部协议

做法：
- custom agent 默认通过 A2A 或 ACP 远程调用
- 主智能体自己只做 routing/synthesis

Pros:
- 协议层抽象清晰
- 对跨 runtime / 企业隔离场景友好

Cons:
- 当前 custom agent 是本地 catalog + SOUL + 同 workspace 语义，直接远程化会损失一致性
- 远程协议天然更重，不适合作为站内默认调度路径
- 当前仓库已有 ACP 入口，但没有 A2A 站内基础设施；直接全量切协议风险过高

## Recommended Decision

选择 Option B，并保留 “A2A/ACP 远程协调” 作为第二执行通道，而不是默认主路径。

## RALPLAN-DR Summary

### Principles

1. 单一对外主智能体
2. custom agent 保留独立主体性
3. 站内优先 LangGraph，跨边界再上协议
4. 临时子会话可检查但不归档
5. 被调度态最小权限/最小长期写入

### Decision Drivers

1. 当前 runtime 没有 custom-agent delegation 链
2. 当前已有任务事件流和 sidebar 折叠能力可复用
3. 需要同时支持独立使用态与被调度态

### Viable Options

- A. 继续扩展 `task` / built-in subagent
- B. 增加 LangGraph 原生编排层
- C. 直接协议化为 A2A/ACP 外部协同

## ADR

### Decision

采用“LangGraph 原生编排优先 + 协议协调作为次通道”的混合方案：

1. 主线程仍由一个主智能体统一面向用户
2. custom agent 仍保留独立 catalog 身份、SOUL、私有 skill、记忆资格
3. 当主智能体或 `@` 编排触发调度时，系统为 custom agent 创建 **delegated execution profile**
4. delegated execution profile 由新的 orchestration graph 调度，不进入 built-in subagent registry
5. 子智能体结果统一回传主智能体；主智能体负责最终回复
6. 子智能体的执行痕迹落到“父线程下的临时 child runs”，支持左侧展开查看，但不进入正式线程搜索与长期归档
7. 对于企业级远程 agent、跨租户 agent、或需要独立运行时的 agent 岛，增加 Remote Agent Transport 抽象；首版兼容现有 ACP 面，A2A 作为明确的后续 transport

### Drivers

- 当前 custom agent 是 catalog identity，不该继续硬塞进 worker registry
- LangGraph 已是主 runtime 基础栈，应优先用来做站内编排
- 用户要求的 UI/权限/记忆模型都需要“身份层”和“执行态”同时存在

### Alternatives Considered

- 扩展现有 `task`：最省事，但语义错误且很快失控
- 全量协议化：适合跨边界协同，不适合作为站内默认运行模型

### Why Chosen

- 这是唯一同时满足“主体性、治理性、可编排性、临时可见性”的方案
- 不需要推翻现有 `create_agent` runtime，只需在上层增加 orchestration graph 和 child-run contract

### Consequences

- 后端需要新增 orchestration graph、delegated agent executor、ephemeral child-run store
- 前端需要把现有子任务卡片演进为可展开临时子会话
- 权限、skill、SOUL、记忆需要明确区分 standalone/delegated 两种执行面

### Follow-ups

- 先落 runtime/contract/test spec，再进入实现
- A2A 不在 v1 作为强依赖，但必须留 transport seam

## Scope

### In Scope

- custom agent delegation runtime
- `@智能体` 显式编排语法
- delegated 权限/skill/SOUL/记忆默认规则
- 左侧可展开临时子会话
- 站内 LangGraph 编排层
- A2A/ACP 远程 transport seam

### Out of Scope

- 企业组织结构、审批流、公开知识库语义
- 完整 A2A server rollout
- 非智能体模块的 notebook / memory 产品重构
- 真正开始写实现代码

## Acceptance Criteria

1. 主线程对用户始终只有主智能体一个正式说话者。
2. custom agent 既能保持当前 standalone 使用路径，也能被主智能体和 `@` 编排调度。
3. 被调度智能体默认不直接向用户发言；所有最终用户可见结果都先经过主智能体综合输出。
4. child run 可在左侧最近聊天列表中展开查看，但不会作为一级最近聊天条目出现。
5. child run 不进入 `threads/search`、不生成正式 `thread.json` 历史、任务结束后自动关闭。
6. delegated policy 至少明确并实现四条默认规则：
   - permission ceiling
   - delegatable private skills
   - delegated soul overlay
   - delegated memory write default deny
7. 本地 custom-agent 编排默认走 LangGraph 站内编排路径；A2A/ACP 只作为 remote transport seam。

## Implementation Steps

1. 定义 orchestration state、child-run contract 和 ephemeral store 边界，禁止 child run 进入正式 `ThreadRecord`。
2. 为 custom agent 增加 catalog-agent delegation bridge，建立 `agent_name -> delegated execution profile` 的执行入口。
3. 在 lead runtime 之上引入 `AgentOrchestratorGraph`，实现 mention 解析、调度、汇合与主回复综合。
4. 把现有 `task`/subagent UI 摘要与新的 child-run 事件流对齐，形成主线程摘要 + child-run inspector 双层呈现。
5. 为 delegated 态落地 governance policy：权限、私有 skill、SOUL overlay、memory candidate。
6. 新增 child-run API 与前端 sidebar 展开交互，确保“可见但不归档”。
7. 为 remote agent 增加 transport seam，首版兼容 ACP，保留 A2A adapter 接口与选择策略。

## Recommended Runtime Shape

### Main Orchestration Path

新增一层 `AgentOrchestratorGraph`，位于当前 lead runtime 之上：

1. `normalize_user_turn`
2. `parse_mentions_and_intents`
3. `plan_agent_chain`
4. `dispatch_child_runs`
5. `collect_child_results`
6. `synthesize_main_reply`
7. `emit_ephemeral_child_run_state`

设计要求：

- 非编排请求可直接短路到现有 lead agent
- 编排请求走 graph 路径
- worker 侧仍复用 `create_agent(...)`
- child run 必须有独立 `child_run_id`
- 所有 child run 输出最终都回到主智能体再回复用户

### Why LangGraph Here

- 当前代码虽然主要使用 `create_agent(...)`，但已经有 `Command`、streaming、thread state 和 resumable 流接口；适合在 orchestration 层引入显式图而不强制重写所有 agent runtime
- 站内协同的核心不是“把 agent 做成远程服务”，而是“清晰地建模状态、分支、并行、汇合和可观测事件”
- 这些正是 LangGraph 擅长的部分

### A2A Usage Rule

- **不用 A2A 的场景**：
  - 本地 custom agent
  - 同线程 / 同 workspace / 同权限域的站内协同
- **优先考虑 A2A 的场景**：
  - 远程企业 agent
  - 跨 runtime / 跨租户 agent
  - 不共享同一 thread sandbox / workdir 的 agent 岛

因此，A2A 在本规划里是 **可插拔远程协调通道**，不是站内 custom agent 编排的默认通道。

## Governance Defaults

### Permissions

- standalone 态：按 agent 自身配置运行
- delegated 态：权限上限 = `主智能体当前授权 ∩ agent 自身上限 ∩ 本次任务显式策略`
- delegated 态默认禁止“提权后直达用户”

### Private Skills

- private skill 默认属于 agent identity
- delegated 态只有被标记为 `delegatable` 的私有 skill 才可见
- 主智能体不能自动看到所有子智能体私有 skill 的内部实现，只能看到能力摘要

### SOUL

- custom agent 保留自己的 SOUL
- delegated 态不是替换 SOUL，而是在其上叠加一层 `delegated execution overlay`
- overlay 至少要强制：
  - 不直接对用户发言
  - 结果回传主智能体
  - 说明自己是被调度执行态

### Memory

- standalone 态：可按 agent policy 读写自己的长期记忆
- delegated 态：
  - 默认允许读取自身长期记忆
  - 默认**不直接写入长期记忆**
  - 只能产出 `memory candidates` 或 `task reflections`
  - 是否落入长期记忆由主智能体/治理器决定

## Detailed Workstreams

### Workstream 1: Orchestration Domain Model

目标：定义“主线程 + 临时 child runs + delegated execution profile”的核心合同。

当前触点：
- `backend/packages/harness/nion/threads/models.py:8-62`
- `backend/packages/harness/nion/threads/repository.py:37-130`
- `backend/packages/harness/nion/client.py:582-786`

计划动作：
- 新增 `backend/packages/harness/nion/orchestration/state.py`
- 新增 `backend/packages/harness/nion/orchestration/models.py`
- 在主线程 state 中增加 `child_runs_summary`
- child run 详细记录放到父线程目录下的 ephemeral store，而不是 `threads/*/thread.json`

### Workstream 2: Catalog-Agent Delegation Bridge

目标：让 custom agent 能被调度，但不污染 built-in subagent registry。

当前触点：
- `backend/packages/harness/nion/config/agents_config.py:56-172`
- `backend/packages/harness/nion/agents/lead_agent/agent.py:259-370`
- `backend/packages/harness/nion/tools/builtins/task_tool.py:321-470`
- `backend/packages/harness/nion/subagents/executor.py:499-610`

计划动作：
- 新增 `backend/packages/harness/nion/orchestration/delegated_agent_executor.py`
- 新增 catalog-agent resolution：`agent_name -> delegated execution profile`
- 保留 built-in subagent registry 只服务 worker 类 runtime

### Workstream 3: `@智能体` Parsing And Agent-Chain Planning

目标：把 `@智能体` 从文本提示升级成正式调度协议。

当前触点：
- `frontend/src/core/threads/hooks.ts:604-650`
- `frontend/src/core/threads/types.ts:123-145`
- `backend/packages/harness/nion/threads/service.py:118-160`

计划动作：
- 前端显式 mention 进入 submit payload/context
- orchestration graph 解析 mention graph
- 支持显式串行链与主智能体自主补全的隐式子步骤

### Workstream 4: Ephemeral Child Conversation Lifecycle

目标：实现“左侧可展开，但不归档”的子会话。

当前触点：
- `frontend/src/components/workspace/recent-chat-list.tsx:440-540`
- `frontend/src/components/workspace/workspace-sidebar.tsx:21-52`
- `backend/packages/harness/nion/threads/repository.py:108-129`

计划动作：
- 新增 `/api/threads/{thread_id}/child-runs` 只读接口
- child run 不进入 `search_threads`
- child run 生命周期：created -> running -> completed/failed -> closed
- closed 后不再出现在默认列表；可选保留极短 TTL 供前端回看当前任务

### Workstream 5: Child-Run Streaming And Inspectability

目标：用户能打开某个 child run 看完整对话、工具调用与结果。

当前触点：
- `backend/packages/harness/nion/client.py:582-786`
- `frontend/src/core/messages/utils.ts:142-147`
- `frontend/src/components/workspace/messages/message-list.tsx:173-260`
- `frontend/src/components/workspace/messages/tool-activity-timeline.tsx:19-70`

计划动作：
- 把现有 `task_started/task_running/task_completed` 扩展成结构化 `child_run_*` 事件
- 前端用事件驱动的 child-run store，而不是只在 message grouping 内拼装
- 保留主消息流中的轻量摘要；详细内容下沉到 child-run inspector

### Workstream 6: Governance Policy Layer

目标：定义 delegated 态的权限、skill、SOUL、memory 规则。

当前触点：
- `backend/packages/harness/nion/config/agents_config.py:19-34`
- `backend/packages/harness/nion/tools/tools.py:101-200`
- `backend/packages/harness/nion/agents/lead_agent/prompt.py:164-214`

计划动作：
- 新增 `delegation_policy.py`
- 为 custom agent 增加 delegated policy 面：权限上限、skill 暴露、memory write policy、soul overlay
- 主智能体始终是唯一 user-facing speaker

### Workstream 7: Remote-Agent Transport Seam

目标：为企业级跨边界协同预留 A2A/ACP 通道，而不污染站内默认路径。

当前触点：
- `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py:92-194`
- `frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx`

计划动作：
- 新增 `remote_agent_transport.py`
- Phase 1 接 ACP adapter
- Phase 2 视企业协同需要接 A2A transport
- orchestration graph 只依赖 transport interface，不依赖具体协议

## Risks And Mitigations

### Risk 1: 图级编排过重，拖慢普通单 agent 聊天

Mitigation:
- 保证普通请求能直接短路到现有 lead path
- 只在检测到 delegation / `@智能体` / multi-agent plan 时进入 orchestration graph

### Risk 2: child run 被误持久化成正式线程，污染左侧历史

Mitigation:
- 明确禁止 child run 复用 `ThreadRecord`
- `search_threads` 不读取 child run store
- UI 只从父线程下的 child-run API 拉取

### Risk 3: delegated 态写脏长期记忆

Mitigation:
- v1 默认关闭 delegated long-term write
- 仅产出 memory candidates

## Pre-mortem

1. 系统做成了“custom agent = 新 subagent type”，后续权限/SOUL/记忆全混在一起，半年后不可维护。
2. child run 直接复用 thread 存储，短期看起来能工作，但正式历史被临时任务淹没。
3. A2A 被过早拉成默认通道，导致站内协同成本和故障面显著上升。

## Verification Steps

1. PRD 审查时先检查概念分层是否清楚地区分：
   - identity agent
   - delegated execution profile
   - built-in worker subagent
   - remote transport agent
2. 确认 child run 不进入正式 thread search contract
3. 确认 delegated 态默认不直接对用户发言
4. 确认 A2A 只作为 remote transport seam，而不是站内默认执行路径

## Available-Agent-Types Roster

- `architect`: runtime/边界/协议设计
- `executor`: 后端与前端实现落地
- `dependency-expert`: A2A / ACP / LangGraph transport 评估
- `designer`: 左侧展开子会话与 inspector 交互
- `test-engineer`: contract / integration / e2e 测试策略
- `security-reviewer`: delegated 权限与跨 agent 能力边界
- `writer`: 文档与迁移说明

## Follow-up Staffing Guidance

### Ralph Path

- 1 x `architect`：先锁 runtime/state/contract
- 1 x `executor`：串行落地 backend orchestration + frontend child-run UI
- 1 x `test-engineer`：跟进 contract/integration
- 1 x `security-reviewer`：审 delegated policy

### Team Path

- Lane 1: `architect` + `dependency-expert`
  - 负责 LangGraph 编排层、A2A/ACP seam、ADR 决策固化
- Lane 2: `executor`
  - 负责 backend orchestration / child-run API / policy layer
- Lane 3: `executor` + `designer`
  - 负责左侧子会话展开、child-run inspector、主线程摘要
- Lane 4: `test-engineer`
  - 负责 contract / integration / e2e / observability

建议推理强度：
- architect / dependency-expert / security-reviewer：high
- executor：medium/high
- test-engineer：medium
- designer：medium

## Launch Hints

- `ralph .omx/plans/prd-single-main-agent-custom-agent-orchestration.md`
- `$team .omx/plans/prd-single-main-agent-custom-agent-orchestration.md`

## Team Verification Path

team 完成前必须证明：

1. custom agent 可以被主智能体调度，但主智能体仍是唯一 user-facing speaker
2. `@智能体` 编排链能形成可检查的 child runs
3. child runs 不进入正式 thread history/search
4. delegated policy 对 permissions / skills / soul / memory 生效
5. A2A/ACP 仅作为 remote transport seam，不影响本地默认路径

team 交回后，再由 Ralph/最终验证阶段确认：

1. 普通单 agent 聊天性能与行为未退化
2. 左侧子会话交互符合“展开可见、任务结束关闭、不归档”
3. 所有 contract / integration / e2e / observability 验证闭环完成
