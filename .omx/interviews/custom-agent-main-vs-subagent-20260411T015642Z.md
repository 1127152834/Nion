## Metadata

- Profile: standard
- Context type: brownfield -> target-architecture clarification
- Final ambiguity: 0.18
- Threshold: 0.20
- Termination mode: crystallized after current-state evidence and target-state interaction were both clarified

## Clarified question

问题最终收敛成两层：

1. 当前系统里，智能体模块中创建的自定义智能体，与主智能体是什么关系；主智能体能否主动按需调用它们？
2. 未来目标架构里，应当如何把这些 custom agent 改造成“唯一主智能体可调度、也可单独使用、支持 `@` 编排”的受治理子智能体体系？

## Transcript summary

### User intent

先确认当前系统里 custom agent 的真实架构角色，避免把“Agent 页面里能创建的智能体”误判成已经能被主智能体编排调用的 delegated child；然后把目标架构收敛成一个可继续规划的主从协作模型。

### Brownfield evidence gathered

1. Custom agent 的创建/存储：
   - 前端新建 agent 页面先走 bootstrap 线程，再通过 `setup_agent` / `/api/agents` 产出 `agents/{name}/config.yaml` 与 `SOUL.md`
   - catalog 由 `list_agent_catalog()` 聚合 built-in + custom agent

2. Custom agent 的运行方式：
   - 线程聊天页把 `agent_name` 写入 thread context
   - 线程服务把 `assistant_id`/`agent_name` 传给 `NionClient.stream(...)`
   - lead agent 创建时按 `agent_name` 读取 custom agent 的 `model`、`tool_groups`、`SOUL.md`
   - 结论：custom agent 当前是“这条线程选择哪个 persona 来当主 agent”

3. 真正的 subagent 分派链：
   - `task` 工具只接受 `subagent_type in {"general-purpose","bash"}`
   - subagent registry 只有这两个 built-in subagent
   - `SubagentExecutor` 只基于 `SubagentConfig` 创建 agent，不读取 custom agent catalog，也没有 `agent_name` 入口

### Target architecture answers from the user

- 主智能体是唯一主要智能体
- 其他智能体既可以在 Agent 模块里单独使用
- 也应该能被主智能体像子智能体一样调用
- 还应支持聊天内 `@智能体1 -> @智能体2 -> @智能体3` 的显式编排链
- 被调度智能体不直接向用户发言，只把结果回传给主智能体，由主智能体统一回复
- 子智能体的运行对话需要像 Codex 一样可检查：
  - 左侧聊天历史可展开
  - 展开后能看到子智能体会话列表
  - 子会话是临时会话
  - 任务结束自动关闭
  - 不进入长期历史或归档

### Pressure pass

我专门压了两个容易跑偏的点：

1. `AgentConfig` / capability catalog 里确实有 `entrypoint`、`tool_policy` 这类字段，看起来像未来可被调用的 agent runtime surface。  
   但在当前代码里，这些字段只被 `/api/agents`、`/api/capabilities`、`get_capability_catalog` 等 catalog/discovery 面消费，没有接到 `task_tool`、`SubagentExecutor`、或任何 “invoke custom agent” 的实际执行路径。  
   这一步把“custom agent 也许已经是可调用子体，只是藏得深”这个假设排除了。

2. 未来如果 custom agent 可被调度，是否应该退化成匿名 worker。  
   用户明确要求它们也能在 Agent 模块里独立使用、还能被 `@` 编排，因此默认语义应保留独立主体性，而不是降格成纯能力包。  
   但用户同时明确否定它们在被调度态直接对用户发言，因此需要“独立主体型 + 被调度态受主智能体治理”的折中。

## Final clarified answer

### Current-state answer

- 自定义 agent 和主智能体当前不是父子运行时关系，而是同一条 lead-agent runtime 的不同 persona / profile。
- 主智能体当前不能主动按需调用这些 custom agent。
- 当前唯一可被主智能体主动分派的，是内建 subagent registry 里的 `general-purpose` 与 `bash`。

### Target-state answer

- 未来应采用“唯一主智能体 + 可独立使用也可被调度的从属智能体”。
- 从属智能体保留独立主体性：它们不是匿名工具包，而是有身份的智能体。
- 但一旦进入被调度态：
  - 默认不直接对用户发言
  - 结果先回传主智能体
  - 由主智能体统一对用户输出
- 运行过程对用户应当可检查但不归档：
  - 主线程仍是唯一正式会话
  - 子智能体会话是附着在主线程下的临时运行会话
  - 左侧历史允许展开查看
  - 任务结束后自动关闭，不进入长期聊天历史

## Non-goals

- 不讨论系统硬编码 subagent 的产品语义，只把它们作为现状对照物。
- 本轮不展开数据库表设计、事件 schema、前端组件拆分、或具体 API 设计。
- 本轮不决定具体权限矩阵和记忆写入策略的字段级细节，只锁默认治理方向。

## Decision boundaries

- 默认按“当前实现事实”回答，不把未来可能的设计意图当成现状能力。
- `entrypoint` / `tool_policy` 等 catalog 字段，只有在出现真实执行链路时才视为“可调用”。
- 未来目标架构采用“独立主体型 + 被调度态受主智能体治理”。
- 被调度智能体默认不直接对用户发言。
- 子智能体会话默认是临时运行痕迹，可检查但不归档。
