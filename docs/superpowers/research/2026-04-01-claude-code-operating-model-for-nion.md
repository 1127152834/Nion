# Claude Code Operating Model 对 Nion 的研究结论

## 研究范围

这份文档不是对 Claude Code prompt 文本的摘抄，而是把它当成一套 agent operating model 来拆。

本次结论分两层：

- 已确认事实：来自本地可读源码与现有 reverse-engineering 参考材料
- 基于事实的推断：结合 Nion 当前实现边界，对可复用点、借鉴点和不应照抄点做出的设计判断

需要明确的是，本文提到的 Claude Code 内部实现结论，并不是 Anthropic 官方公开架构文档，而是基于本地源码研究与 `cli.js.map` 还原材料的工程分析。

## 研究材料

### Claude Code 侧已读关键锚点

- `src/constants/prompts.ts`
- `src/tools/AgentTool/prompt.ts`
- `src/tools/SkillTool/prompt.ts`
- `src/tools/AgentTool/AgentTool.tsx`
- `src/tools/AgentTool/runAgent.ts`
- `src/tools/AgentTool/built-in/exploreAgent.ts`
- `src/tools/AgentTool/built-in/planAgent.ts`
- `src/tools/AgentTool/built-in/verificationAgent.ts`
- `src/services/tools/toolExecution.ts`
- `src/services/tools/toolHooks.ts`
- `src/utils/plugins/loadPluginCommands.ts`
- `src/skills/loadSkillsDir.ts`
- `src/services/mcp/client.ts`
- `src/commands.ts`

### Nion 侧已读关键锚点

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/packages/harness/nion/agents/lead_agent/agent.py`
- `backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
- `backend/packages/harness/nion/agents/middlewares/subagent_limit_middleware.py`
- `backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py`
- `backend/packages/harness/nion/guardrails/middleware.py`
- `backend/packages/harness/nion/tools/tools.py`
- `backend/packages/harness/nion/tools/catalog.py`
- `backend/packages/harness/nion/tools/builtins/task_tool.py`
- `backend/packages/harness/nion/tools/builtins/tool_search.py`
- `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
- `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- `backend/packages/harness/nion/config/agents_config.py`
- `backend/packages/harness/nion/config/builtin_agents.py`
- `backend/packages/harness/nion/config/subagents_config.py`
- `backend/packages/harness/nion/mcp/client.py`
- `backend/packages/harness/nion/skills/loader.py`
- `backend/packages/harness/nion/skills/types.py`

## 总判断

Claude Code 真正强的地方，不是“有一段很厉害的 system prompt”，而是把 prompt assembly、tool runtime、agent orchestration、extension plane、context hygiene 组织成了一套统一 runtime。
Nion 当前已经有不少散点能力，但还缺一个把这些能力装配成同一 operating model 的中轴层。

## 1. Prompt Assembly

### 已确认事实

- Claude Code 的 `src/constants/prompts.ts` 不是单个大字符串，而是 section-driven prompt assembler。
- 该文件显式定义了 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`，把 cache-stable 静态前缀和会话动态后缀分开。
- Claude Code 会按会话条件注入 hooks、MCP instructions、language、output style、scratchpad、session-specific guidance。
- Nion 当前的 `backend/packages/harness/nion/agents/lead_agent/prompt.py` 仍以单个 `SYSTEM_PROMPT_TEMPLATE` 为中心，再拼接 memory、skills、deferred tools、subagent section、ACP section。
- Nion 已经有 prompt 注入点，但还没有 section registry、cache boundary、session-specific guidance contract。

### 基于事实的推断

- Nion 现在不是没有 prompt runtime，而是“有拼接、无编排”。
- 这意味着 Nion 后续每加一项新能力，很容易继续往一个大模板里叠 XML 段，最终演化成不可治理的 prompt monolith。
- 对 Nion 来说，最值得学的不是 Claude Code 的具体措辞，而是：
  - prompt section registry
  - static / dynamic boundary
  - per-session guidance injection
  - output / risk / verification obligation 的制度化 section

## 2. Tool Runtime Governance

### 已确认事实

- Claude Code 的 `src/services/tools/toolExecution.ts` 和 `src/services/tools/toolHooks.ts` 共同形成统一工具执行链。
- 从源码可确认这条链路至少覆盖：
  - tool lookup
  - schema / processed input
  - pre-tool hooks
  - hook-derived permission decision
  - normal permission flow
  - tool execution
  - post hooks
  - failure hooks
  - telemetry / tracing / stop messages
- Claude Code 的 pre hooks 不只是日志回调，还能返回 `updatedInput`、`permissionBehavior`、`preventContinuation`。
- Nion 当前已有治理雏形：
  - `GuardrailMiddleware` 做调用前策略判定与审批请求
  - `ToolErrorHandlingMiddleware` 把异常转成 `ToolMessage`
  - `DeferredToolFilterMiddleware` 控制绑定到模型的 tool schema
- 但 Nion 这些能力仍分散在多个 middleware 中，没有一个 Claude Code 式的统一 tool execution contract。

### 基于事实的推断

- Nion 现状更接近“中间件串联”，Claude Code 更接近“工具运行时内核”。
- 这两者最大的差别，不是能不能拦截，而是是否有统一的执行阶段语义。
- 对 Nion 来说，当前最该补的不是更多工具，而是：
  - 工具级元数据模型
  - pre / post / failure hook contract
  - 统一 permission semantics
  - 统一 deny / ask / fail / summary surface

## 3. Agent Orchestration

### 已确认事实

- Claude Code 的 `src/tools/AgentTool/AgentTool.tsx` 不是简单转发器，而是 agent orchestration controller。
- `src/tools/AgentTool/runAgent.ts` 负责：
  - 构造 agent-specific app state
  - 解析工具池与 allowed tools
  - 处理 async / permission prompt / transcript / metadata
  - 注入 agent-specific MCP servers
  - 注册 frontmatter hooks
  - 构造 query 主循环输入
- Claude Code 内置了明确分工的 specialist agents：
  - Explore：只读探索
  - Plan：只读规划
  - Verification：对抗式验证
- Claude Code 还显式区分 fork path 与 fresh subagent path。fork 的价值在于继承上下文和 prompt cache，而不是只再开一个 worker。
- Nion 当前的子代理主语义集中在 `task_tool.py` + `SubagentExecutor`：
  - 支持 `general-purpose` 与 `bash` 两种子代理
  - 支持后台执行、流式状态回传、task telemetry、超时治理
  - `SubagentLimitMiddleware` 负责截断单次回复中的过量 `task` 调用
- Nion 还具备 `invoke_acp_agent` 作为外部 ACP agent 委派入口。

### 基于事实的推断

- Nion 现在已经有 agent delegation primitive，但还没有 Claude Code 那种 role-specialized orchestration layer。
- `task_tool` 解决了“怎么委派”，还没有解决“为什么用这个 agent、该给它什么约束、完成后怎样进入主线程决策”。
- 对 Nion 最值钱的借鉴点不是“多几个 agent 名字”，而是：
  - specialist agents 的职责边界
  - read-only exploration / planning lanes
  - verification 作为独立对抗角色
  - fork 与 fresh delegate 的区分
  - agent runtime constructor，而不是把子代理当另一个提示词模板

## 4. Extension Plane

### 已确认事实

- Claude Code 在 `src/tools/SkillTool/prompt.ts` 中把 Skill 明确成一等执行原语，而不是“可选文档”。
- 该 prompt 明确要求：当技能匹配任务时，必须先调用 Skill tool，而不是口头提及。
- Claude Code 的 `src/skills/loadSkillsDir.ts`、`src/commands.ts`、`src/utils/plugins/loadPluginCommands.ts` 显示：
  - skill / command / plugin 共用 frontmatter 解析体系
  - frontmatter 可表达 `allowed-tools`、`model`、`effort`、`user-invocable`、`hooks`、`context=fork` 等运行时语义
  - plugin markdown 不是普通文档，而是 runtime-loadable extension unit
- Claude Code 的 `src/services/mcp/client.ts` 表明 MCP 不只是 transport adapter：
  - 它参与 tool construction
  - 参与 auth / truncation / persistence
  - 在相关 prompt 逻辑中还能注入 MCP instructions
- Nion 当前已有：
  - `skills/loader.py` 加载技能目录
  - `lead_agent/prompt.py` 把可用技能列表注入 system prompt
  - `read_skill_control_plane` / `list_skills_control_plane` / `update_skill_control_plane`
  - `tool_search` + `DeferredToolFilterMiddleware` 作为 deferred tool discovery 机制
  - `mcp/client.py` 负责把扩展配置翻译成 MCP server params
- 但 Nion 还没有一个真正的 SkillTool，也没有 plugin-compatible frontmatter runtime。

### 基于事实的推断

- Nion 的 skills 目前更像“prompt-visible resources”，Claude Code 的 skills 更像“prompt-native workflow packages”。
- Nion 的 deferred tools 已经踩中了 Claude Code 很值钱的一点：不是所有动态工具都应该直接进模型上下文。
- 这意味着 Nion 的 extension plane 并不弱，但现在是断开的：
  - skills 没有一等执行入口
  - MCP 没有行为级 instructions 注入
  - plugin frontmatter 兼容面还没形成

## 5. Productization

### 已确认事实

- Claude Code 在多个锚点里都显式体现了 context hygiene：
  - `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`
  - Explore / Plan 省略部分 CLAUDE.md / gitStatus 注入
  - fork path 尽量复用 cache-safe prefix
  - tool hook / permission / transcript / additional context 都被产品化成标准机制
- Claude Code 的 Verification agent 明确要求用命令和输出给证据，而不是只“读代码判断没问题”。
- Nion 当前也已经有产品化雏形：
  - SummarizationMiddleware
  - Thread / task telemetry 与 diagnostics
  - `task_started` / `task_running` / `task_completed` 流事件
  - tool_search 降低 schema 噪音
- 但 Nion 还没有把这些收口成统一的 transcript hygiene / tool activity / resume model。

### 基于事实的推断

- Claude Code 的产品感，来自“上下文预算、权限、扩展、委派、验证”被同一条 runtime 规则约束。
- Nion 当前更像“已经有很多能力的 runtime”，还没完全变成“有强 operating discipline 的产品”。
- Nion 想偷到 Claude Code 的稳定性，真正要补的是制度层，不是文案层。

## 6. Nion 可直接复用

- `build_lead_runtime_middlewares()`、`GuardrailMiddleware`、`ToolErrorHandlingMiddleware` 已经是统一治理层的种子，不必推倒重来。
- `task_tool.py` + `SubagentExecutor` + task telemetry 已经是子代理 runtime primitive，可以继续向 specialist agents 演进。
- `tool_search.py` + `DeferredToolFilterMiddleware` 已经是 context-budget 友好的 deferred tool 机制，可直接演进成 Claude Code 式 discoverability 层。
- `skills/loader.py`、`list_skills_control_plane`、`read_skill_control_plane` 已经提供了 skill registry 雏形。
- `invoke_acp_agent_tool.py` 已经提供了外部 agent 连接面，未来可以收口进统一 AgentTool 体系。
- 现有 diagnostics / telemetry / thread stream 体系可以作为 Tool Activity Layer 的投影接收面。

## 7. Nion 适合借鉴

- 把 `lead_agent/prompt.py` 从模板字符串升级成 prompt section registry，并引入静态/动态边界。
- 把 tool middleware 串联升级成统一 tool execution contract，明确定义 pre-hook、permission、post-hook、failure-hook 阶段。
- 把 skill 从“提示词里列出目录”升级成真正的 `SkillTool`，并在匹配到 skill 时强制先执行 SkillTool。
- 增加 Explore / Plan / Verification 三类 specialist agents，但要先定义只读/验证边界，不要只加名字。
- 引入 plugin-compatible frontmatter 子集，优先支持：
  - `allowed-tools`
  - `model`
  - `effort`
  - `user-invocable`
  - `hooks`
  - `context=fork`
- 让 MCP 除了提供工具，也能提供 instructions 与 runtime-visible capability hints。
- 把 tool activity / summary / diagnostics 合并为一套 source-of-truth 事件层。

## 8. Nion 不该照抄

- 不该复制 Claude Code 的 prompt 文本。对 Nion 有价值的是 section 结构与制度，不是原句。
- 不该一口气复制完整 slash command surface、plugin marketplace、GrowthBook/telemetry 细节。这些是 Anthropic 自身产品环境的产物。
- 不该在基础 contract 未稳定前就把 remote/background/worktree/teammate 全量模式一并对齐，否则只会把 Nion 现有 runtime 搅散。
- 不该把 Verification agent 简化成“跑一下测试”。Claude Code 的价值在于对抗式验证心智，这必须作为行为 contract 落地。
- 不该把 MCP 简化成“再多接几把工具”。Claude Code 值钱的是 MCP 同时扩展工具面和行为面。

## 9. 最小实现顺序

这里给的是“Claude Code operating model 在 Nion 的最小正确落地顺序”，不是功能数量最多的顺序。

1. Prompt runtime 收口
   - 把单体 prompt 模板拆成 section registry
   - 引入 static / dynamic boundary
   - 定义 session-specific guidance 注入点
2. Tool runtime contract
   - 工具元数据
   - pre / post / failure hook contract
   - 统一 permission / denied / ask / error surface
3. SkillTool
   - 从 skill registry 过渡到 skill execution primitive
   - 明确“匹配 skill 必须先调用 SkillTool”
4. 高价值 coding-facing tools
   - Glob
   - Grep
   - Patch-oriented FileEdit
   - LSP diagnostics / symbol / references
5. Tool Activity Layer
   - 统一聊天流、task、diagnostics 的活动表达
6. Specialist agents
   - Explore
   - Plan
   - Verification
7. Plugin / MCP 深化
   - plugin frontmatter 兼容
   - MCP instructions
   - agent-specific MCP servers

如果跳过前两步，直接堆工具或 agent 名字，Nion 很容易得到一个更复杂但不更稳定的系统。

## 10. 关键源码锚点

### Claude Code

- `src/constants/prompts.ts`
  - 说明主系统提示词并非静态文本，而是 section assembler
- `src/tools/AgentTool/prompt.ts`
  - 说明 AgentTool 的模型侧协议、fork/fresh delegate 语义
- `src/tools/SkillTool/prompt.ts`
  - 说明 Skill 必须通过 SkillTool 触发
- `src/services/tools/toolExecution.ts`
  - 说明统一工具执行主线
- `src/services/tools/toolHooks.ts`
  - 说明 hook 如何参与 permission 与 continuation control
- `src/tools/AgentTool/AgentTool.tsx`
  - 说明 agent orchestration controller 的职责
- `src/tools/AgentTool/runAgent.ts`
  - 说明 agent runtime constructor 与子代理生命周期
- `src/tools/AgentTool/built-in/exploreAgent.ts`
  - 说明只读探索 agent 的边界
- `src/tools/AgentTool/built-in/planAgent.ts`
  - 说明只读规划 agent 的边界
- `src/tools/AgentTool/built-in/verificationAgent.ts`
  - 说明 verification contract 的强约束
- `src/utils/plugins/loadPluginCommands.ts`
  - 说明 plugin markdown / frontmatter 如何变成 runtime extension
- `src/skills/loadSkillsDir.ts`
  - 说明 skills/frontmatter/hook/context 的统一加载逻辑
- `src/services/mcp/client.ts`
  - 说明 MCP 在工具、认证、输出治理、扩展面上的深度角色

### Nion

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
  - 现有 prompt 注入面与单体模板边界
- `backend/packages/harness/nion/agents/lead_agent/agent.py`
  - lead runtime 的 agent 构造入口
- `backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
  - 现有 runtime middleware builder 与治理雏形
- `backend/packages/harness/nion/guardrails/middleware.py`
  - 当前 permission / approval / denial 主入口
- `backend/packages/harness/nion/tools/tools.py`
  - 当前 tool pool 装配入口
- `backend/packages/harness/nion/tools/builtins/task_tool.py`
  - 当前子代理委派 primitive
- `backend/packages/harness/nion/tools/builtins/tool_search.py`
  - 当前 deferred tool discoverability primitive
- `backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py`
  - 当前 schema deferral 机制
- `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
  - 外部 agent 连接面
- `backend/packages/harness/nion/skills/loader.py`
  - 当前 skill registry 入口
- `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
  - 当前 skill control-plane tools

## 对 Nion 的最终判断

Nion 不是“缺几个 Claude Code 工具”那么简单。
Nion 真正缺的是一条统一中轴，把 prompt、tools、skills、MCP、subagents、diagnostics 收口成同一套 runtime discipline。

换句话说：

- Claude Code 值得偷的是 operating model
- Nion 现阶段最值钱的工作不是抄 prompt，而是补 contract
- 一旦 contract 立住，很多 Claude Code 风格能力，Nion 其实已经有一半地基
