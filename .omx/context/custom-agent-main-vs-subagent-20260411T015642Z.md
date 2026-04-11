## Task statement

分析当前系统里“主智能体”和“智能体模块中创建的自定义智能体”的关系，并判断主智能体是否能够主动按需调用这些自定义智能体。

## Desired outcome

得到一个基于现有代码实现的清晰结论：
- 自定义智能体在当前架构里到底是什么角色
- 它与 lead/main agent 的关系是并列 persona、可切换 runtime，还是可被编排的 delegated child
- 主智能体当前是否具备主动调用它们的机制

在此基础上，继续澄清目标架构：
- 主智能体必须是唯一主智能体
- 其他智能体要能被主智能体像子智能体一样调用
- 其他智能体也要能在智能体模块中单独使用
- 聊天里需要支持 `@智能体` 的显式编排链路

## Stated solution

用户要求先思考并澄清架构关系；当前处于 `deep-interview` 路径，先做 brownfield 证据收集，再决定是否需要继续澄清“问的是当前实现还是目标设计”。

## Probable intent hypothesis

用户大概率在确认 agent 模块是否已经形成“主 agent -> 可按需调用 custom agent”的多智能体关系，以便判断当前产品语义和后续架构方向，而不是只关心 UI 上能否切换 agent。

现在用户的真实目标已经更明确：
不是只想辨认现状，而是要把 custom agent 升级成“既可独立使用、又可被主智能体调度的从属执行体”，并进一步讨论权限、私有 skill、SOUL 与记忆边界。

## Known facts / evidence

- 自定义 agent 通过 `agents/{name}/config.yaml + SOUL.md` 建模，并进入统一 catalog。
- 线程提交时，前端/后端通过 `agent_name` 或 `assistant_id` 选择当前线程运行的 agent persona。
- lead agent 创建时会根据 `agent_name` 读取 custom agent 的 `model`、`tool_groups`、`SOUL.md`，但仍然走同一个 `create_agent(...)` 主运行时。
- `task` 工具当前只接受 `subagent_type: "general-purpose" | "bash"`，来源于内建 subagent registry。
- subagent 执行器直接使用 `SubagentConfig.system_prompt` 创建代理，没有读取 custom agent catalog，也没有 `agent_name` 选择面。

## Constraints

- 以当前仓库实现为准，不从旧文档或产品想象反推。
- 当前问题优先回答“现状”，除非用户明确切换到“应该怎么设计”。
- `deep-interview` 模式下先锁清对象边界，再决定是否继续问设计目标。

## Unknowns / open questions

- 用户这轮要确认的是“当前代码事实”，还是“目标架构应该如何定义主从关系”。
- 如果现状不支持主动调用，用户是否想继续推进成支持的设计。
- 被 `@` 调用或被主智能体调度时，这些智能体在运行时是否仍然保留“独立主体性”。
- `@智能体` 是显式创建多参与者会话，还是只是给主智能体一个路由/分派提示。

## Decision-boundary unknowns

- 是否只回答当前实现，不延伸到改造方案。
- 是否把“主智能体可以主动调用 custom agent”视作未来设计目标，而非现有能力。
- 子智能体在被调度时是否拥有独立权限、私有 skill、独立 SOUL、独立长期记忆。
- 单独使用态与被调度态是否共用同一份身份/记忆资产。

## Likely codebase touchpoints

- `backend/packages/harness/nion/config/agents_config.py`
- `backend/app/gateway/routers/agents.py`
- `backend/packages/harness/nion/agents/lead_agent/agent.py`
- `backend/packages/harness/nion/client.py`
- `backend/packages/harness/nion/tools/builtins/task_tool.py`
- `backend/packages/harness/nion/subagents/registry.py`
- `backend/packages/harness/nion/subagents/executor.py`
- `frontend/src/app/workspace/agents/new/page.tsx`
- `frontend/src/app/workspace/agents/agent-chat-page.tsx`
