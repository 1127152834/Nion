## Metadata

- Profile: standard
- Rounds: repository clarification + target-architecture clarification + pressure pass
- Final ambiguity: 0.18
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: `.omx/context/custom-agent-main-vs-subagent-20260411T015642Z.md`
- Transcript: `.omx/interviews/custom-agent-main-vs-subagent-20260411T015642Z.md`

## Clarity Breakdown

| Dimension | Score | Notes |
| --- | --- | --- |
| Intent Clarity | 0.96 | 既要明确现状，也要锁未来主从协作目标 |
| Outcome Clarity | 0.94 | 需要一份可直接进入规划阶段的架构约束 |
| Scope Clarity | 0.89 | 已锁定 custom agent、主智能体、@编排、临时子会话 |
| Constraint Clarity | 0.86 | 当前实现事实、统一对外发声、临时不归档都已明确 |
| Success Criteria | 0.88 | 能指导下一步权限/skill/SOUL/记忆设计 |
| Context Clarity | 0.98 | 关键创建、装载、分派路径已核对 |

## Intent

澄清当前系统里 custom agent 的真实运行时地位，并把未来目标架构收敛成：

- 唯一主智能体
- 其他智能体可独立使用
- 也可被主智能体或 `@` 语法调度
- 子智能体运行可检查但不归档

## Desired Outcome

得到一个可直接进入架构规划的判断：

1. custom agent 当前是什么
2. 它与主智能体当前是什么关系
3. 主智能体当前能否主动调用它
4. 未来要采用什么主从协作默认语义
5. 子智能体在用户面如何呈现

## In Scope

- custom agent 的创建、存储、catalog 装载
- 线程如何选择 `agent_name`
- lead agent 如何根据 `agent_name` 构造当前运行时
- `task` / subagent registry / executor 的真实可分派对象
- 唯一主智能体 + 从属智能体的默认主体性语义
- `@智能体` 编排的对外发声规则
- 子智能体会话的可见性、生命周期、归档策略

## Out of Scope / Non-goals

- 具体数据库 schema、API contract、前端组件/路由落地
- 具体权限位、技能包格式、记忆表结构
- 开始实现

## Decision Boundaries

- 以现有执行链为准，不把 catalog 元数据当执行能力
- 没有看到真实分派入口时，不宣称 custom agent 可被主动调用
- 未来采用“独立主体型 + 被调度态受治理”的默认语义
- 被调度智能体默认不直接对用户发言
- 子智能体会话默认临时存在、可展开查看、任务后自动关闭、不归档

## Constraints

- 只能依据当前仓库代码
- brownfield 结论必须能落到具体代码路径
- 不从 UI 文案或字段名反推未实现能力
- 主智能体是唯一正式对外主智能体

## Testable Acceptance Criteria

- 能指出 custom agent 的创建和 catalog 路径
- 能指出线程如何把 `agent_name` 送入运行时
- 能指出 lead agent 如何消费 custom agent 配置
- 能指出 `task` 工具当前仅支持哪些 subagent
- 能证明 custom agent 没有接入 subagent executor 链路
- 能明确说明未来子智能体是否允许直接对用户发言
- 能明确说明未来子智能体会话是否归档

## Assumptions Exposed + Resolutions

### Assumption 1

“Agent 页面里能创建的 agent，也许就是一种可被主智能体调用的子智能体。”

Resolution:

代码显示它们只通过 `agent_name` 进入 lead runtime，决定当前线程 persona；没有进入 `task` 的 `subagent_type` 分派面。

### Assumption 2

“既然 `AgentConfig` 有 `entrypoint` / `tool_policy`，那可能已经支持 runtime 调用。”

Resolution:

这些字段当前只在 catalog/capability discovery 面暴露，没有接到执行链路，因此不能视为现状能力。

### Assumption 3

“如果 custom agent 未来能被调度，那它可能应该退化成匿名 worker，避免复杂度。”

Resolution:

用户明确要求它们也能在 Agent 模块里独立使用、还能被 `@` 编排，因此默认语义应保留独立主体性，而不是降格成纯能力包。

### Assumption 4

“如果保留独立主体性，被调度时也应该直接和用户说话。”

Resolution:

用户明确否定。被调度智能体默认只回传主智能体，由主智能体统一向用户输出。

## Pressure-pass findings

- Revisited answer: “custom agent 只是 persona” 这一判断
- Pressure method: 反查 `entrypoint` / `tool_policy` / capability catalog 是否有隐藏执行链
- Finding: 没有。当前只有 catalog 暴露，没有 runtime dispatch
- Outcome: 结论从“高概率”提升到“实现层面可证实”

- Revisited answer: “未来是否应做成匿名 worker”
- Pressure method: 用“独立使用 + @编排 + 用户面统一发声”三条约束反推
- Finding: 应保留独立主体性，但进入被调度态后必须受主智能体治理
- Outcome: 主体性与治理边界同时锁定

## Brownfield Evidence vs Inference

### Evidence

- `config/agents_config.py` 负责 custom agent catalog 与 `SOUL.md` 装载
- `threads/service.py` 把 `agent_name` 送入 client stream
- `agents/lead_agent/agent.py` 用 `agent_name` 读取 `model` / `tool_groups` / prompt persona
- `task_tool.py` 只接收 `general-purpose` / `bash`
- `subagents/registry.py` 只注册两个 built-in subagent
- `subagents/executor.py` 不消费 custom agent catalog

### Inference

- custom agent 当前的系统语义是“可切换主 persona”，而不是“主 agent 的可编排 child runtime”
- 未来目标语义应升级为“可独立使用的 agent，同时也可被调度为受治理的子智能体”

## Technical Context Findings

- custom agent 的核心边界在 `agents/` 目录和 thread context
- subagent 的核心边界在 `nion.subagents.*` 与 `task` 工具
- 这两条线目前在执行层没有汇合
- 如果要实现目标语义，需要新增一条“catalog agent -> delegated runtime”桥接链，而不是继续复用现有 built-in subagent registry 的硬编码名字表
- 子智能体 UI 不应直接混入正式线程历史，而应作为主线程下的临时运行视图

## Answer to carry forward

当前系统中：

- 主智能体与智能体模块创建的 custom agent，是“同一 lead-agent runtime 下的不同 persona / entry selection 关系”，不是主从调用关系。
- 主智能体当前不能主动按需调用 custom agent。
- 主智能体当前只能通过 `task` 主动分派内建 subagent registry 中的 `general-purpose` 和 `bash`。

未来规划中：

- 应采用“唯一主智能体 + 可独立使用也可被调度的从属智能体”。
- 从属智能体保留独立身份、SOUL、私有 skill、长期记忆资格，但在被调度态受主智能体治理。
- 被调度智能体默认不直接对用户发言。
- 子智能体会话应像 Codex 那样可展开检查，但它们是临时运行会话，任务结束自动关闭，不归档。

## Execution Bridge

推荐下一步使用 `$ralplan`，把以下问题系统化成规划产物：

1. runtime 身份模型：独立使用态 vs 被调度态
2. 调度协议：主智能体如何调用 catalog agent
3. `@智能体` 语法和编排链执行模型
4. 权限收缩与私有 skill 可见性
5. SOUL 在被调度态的继承/裁剪规则
6. 长期记忆、临时运行痕迹、审计日志三者的边界
7. 左侧可展开临时子会话 UI 与生命周期
