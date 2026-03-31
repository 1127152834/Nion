# Claude Code Source Anchors

当用户要“具体文件、具体链路、具体模块”时，再读这份资料。

## 目录

1. Prompt 相关
2. Agent 调度相关
3. built-in agents
4. Tool Runtime 与 Hook
5. Plugin / MCP
6. 一张速查表

## 1. Prompt 相关

### `src/constants/prompts.ts`

用户问这些问题时优先引用它：

- 主系统提示词在哪里
- `getSystemPrompt()` 如何装配
- 哪些 section 是静态、哪些是动态
- cache boundary 为什么重要
- default agent prompt 在哪里定义

从报告可提炼的结论：

- 这是主系统提示词核心文件
- `getSystemPrompt()` 更像编排器，不是纯文本常量
- 这里还能看到 session-specific guidance、output efficiency、tone/style 等 section

### `src/tools/AgentTool/prompt.ts`

用户问这些问题时优先引用它：

- Agent tool 给模型看的协议是什么
- fork 语义为什么强
- 怎样给子 agent 写 prompt
- 什么时候适合 fresh agent，什么时候适合 fork

从报告可提炼的结论：

- 它像 AgentTool 的模型侧协议说明书
- 明确约束 delegation 方式，防止懒 delegation

### `src/tools/SkillTool/prompt.ts`

用户问这些问题时优先引用它：

- Skill 在 Claude Code 里是不是 first-class primitive
- 为什么“提到 skill”不等于“执行 skill”
- skill 的触发和注入规则是什么

从报告可提炼的结论：

- Skill 是 workflow package，不是说明文档
- 匹配 skill 时必须调用 Skill tool

## 2. Agent 调度相关

### `src/tools/AgentTool/AgentTool.tsx`

用户问这些问题时优先引用它：

- Agent 调度总控在哪里
- background / foreground / teammate / remote 怎么分流
- fork path 与 normal path 怎么分叉

从报告可提炼的结论：

- 这是 orchestration controller，不只是转发器
- 负责解析输入、选 agent、处理 isolation、启动 runAgent

### `src/tools/AgentTool/runAgent.ts`

用户问这些问题时优先引用它：

- 子 agent runtime 是怎么构造的
- agent-specific MCP servers 怎么接
- frontmatter hooks / skills 怎么注入
- transcript、cleanup、metadata 写在哪一层

从报告可提炼的结论：

- 这里负责子 agent 的完整生命周期构造
- 不是简单 wrapper，而是 runtime constructor

### `query()` 主循环

PDF 没展开源码，但给出明确定位：

- `runAgent()` 最终会调用 `query()`
- `query()` 才是模型消息流和 tool-calling 主循环执行器

如果用户追问主循环，回答时应明确说这部分是根据报告对调用关系的确认，而不是对 `query.ts` 细节的全文解读。

## 3. built-in agents

### `src/tools/AgentTool/built-in/exploreAgent.ts`

适合回答：

- Explore agent 为什么强调只读
- 只读探索 agent 的权限边界怎么定

报告里的锚点：

- 不创建、不修改、不删除、不移动文件
- 不写临时文件
- Bash 只允许读操作

### `src/tools/AgentTool/built-in/planAgent.ts`

适合回答：

- 规划 agent 应该承担什么职责
- 为什么规划和实现要拆开

报告里的锚点：

- 只读
- 理解需求和代码库
- 输出 step-by-step implementation plan
- 最后列出 Critical Files for Implementation

### `src/tools/AgentTool/built-in/verificationAgent.ts`

适合回答：

- 为什么 verification agent 值钱
- 如何把“别偷懒验证”写进系统
- adversarial validation 应该怎么做

报告里的锚点：

- 核心心智是 try to break it
- 不允许 verification avoidance
- 要跑 build、tests、linter/type-check 和专项验证
- 输出必须包含 command、observed output、VERDICT

## 4. Tool Runtime 与 Hook

### `src/services/tools/toolExecution.ts`

适合回答：

- 工具执行主线在哪里
- 为什么不是模型决定后直接调函数
- schema、permission、hooks 的顺序是什么

### `src/services/tools/toolHooks.ts`

适合回答：

- Hook 能做什么
- pre/post hooks 如何参与控制流
- hook 与 permission model 怎么粘合

报告里的锚点：

- `PreToolUse`
- `PostToolUse`
- `PostToolUseFailure`
- `updatedInput`
- `permissionBehavior`
- `preventContinuation`

## 5. Plugin / MCP

### `src/utils/plugins/loadPluginCommands.ts`

适合回答：

- 插件能扩展什么
- 插件为什么不只是注册命令
- runtime 变量替换是怎么参与模型行为的

### `src/entrypoints/mcp.ts` 及 `src/services/mcp/*`

适合回答：

- MCP 在 Claude Code 里扮演什么角色
- 为什么它不只是 tool bridge
- agent-specific MCP servers 如何成为 additive capability

## 6. 一张速查表

| 用户问题 | 优先引用的锚点 |
|---|---|
| Claude Code 主 prompt 在哪 | `src/constants/prompts.ts` |
| subagent/fork 怎么工作 | `src/tools/AgentTool/prompt.ts`, `src/tools/AgentTool/AgentTool.tsx`, `src/tools/AgentTool/runAgent.ts` |
| 为什么 verification 很强 | `src/tools/AgentTool/built-in/verificationAgent.ts` |
| 技能系统怎么接入 | `src/tools/SkillTool/prompt.ts`, `src/commands.ts` |
| Hook / permission 怎么协同 | `src/services/tools/toolExecution.ts`, `src/services/tools/toolHooks.ts` |
| plugin / MCP 有什么价值 | `src/utils/plugins/loadPluginCommands.ts`, `src/services/mcp/*` |
