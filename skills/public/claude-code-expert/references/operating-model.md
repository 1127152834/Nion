# Claude Code Operating Model

这份参考资料把 PDF 里的稳定结论整理成可复用的分析框架。默认把 Claude Code 视为一个可扩展、可治理、可产品化的 agent operating model。

## 目录

1. 核心结论
2. 已确认的研究基线
3. Prompt Architecture
4. Tool Runtime Governance
5. Agent Orchestration
6. Skill / Plugin / Hook / MCP
7. Productization Themes
8. 回答模板
9. 常见误区

## 1. 核心结论

最重要的结论不是“Claude Code 有一段很强的 prompt”，而是：

- Prompt 是模块化 runtime assembly
- Tool 调用不是裸执行，而是受 permission、hooks、analytics、MCP-aware execution pipeline 治理
- Agent 不是万能 worker，而是有 specialization 的调度系统
- Skill 不是说明文档，而是 prompt-native workflow package
- Plugin 不是外挂脚本，而是 prompt + metadata + runtime constraints 的扩展单元
- MCP 不只是工具桥，也会注入行为说明
- Context 被当作稀缺预算管理，而不是免费空气

用户问“Claude Code 为什么强”时，默认用这组结论作答。

## 2. 已确认的研究基线

根据 PDF 内容，这份研究建立在以下基线上：

- 研究对象来自 `@anthropic-ai/claude-code` npm 包中的 `cli.js.map`
- 报告作者从 `sourcesContent` 里还原了 4756 个源码文件
- 报告明确点名的关键文件包括：
  - `src/constants/prompts.ts`
  - `src/tools/AgentTool/prompt.ts`
  - `src/tools/SkillTool/prompt.ts`
  - `src/tools/AgentTool/AgentTool.tsx`
  - `src/tools/AgentTool/runAgent.ts`
  - `src/services/tools/toolExecution.ts`
  - `src/services/tools/toolHooks.ts`

如果你引用这些信息，要注明它们来自 reverse-engineering report，而不是直接来自官方源码仓库。

## 3. Prompt Architecture

Claude Code 的 prompt 不是一整块固定文本，而是按 section 动态装配。

### 3.1 主框架

报告把 `getSystemPrompt()` 描述为一个编排器而不是纯文本。可以用下面的方式理解：

- 静态前缀：更适合 cache 命中
- 动态后缀：按当前会话、当前工具集、当前 feature gate 注入

### 3.2 关键 section

报告提到的核心 section 包括：

- 身份与基础定位：interactive agent、软件工程协作者、风险基调
- 基础系统规范：tool result 可见、permission mode、拒绝后不能原样重试、外部结果可能 prompt injection
- Doing tasks 哲学：不乱加功能、不瞎抽象、先读代码再改代码、如实报告验证结果
- 风险动作规范：destructive / hard-to-reverse / shared-state / external-visible actions 要谨慎
- 工具使用规范：工具优先级与正确语法
- Session-specific guidance：按当前会话注入局部规则
- Output efficiency：更像产品，不像日志
- Tone and style：统一交互感受
- Default agent prompt：子 agent 的基础人格

### 3.3 设计启发

如果用户要做 Claude Code-like 系统，prompt 层至少应该有：

- 固定的全局行为规范
- 根据当前工具和模式装配的局部规则
- 明确的 cache-stable 边界
- 对输出风格、风险动作、验证义务的硬约束

## 4. Tool Runtime Governance

报告里的工具执行链是 Claude Code 稳定性的核心来源之一。

### 4.1 执行链

可以按下面的顺序概括：

1. 找到 tool
2. 解析 MCP metadata
3. 做 schema parse
4. 跑 tool-specific input validation
5. 跑 PreToolUse hooks
6. 解析 hook permission result
7. 走 permission flow
8. 执行 tool
9. 记录 analytics / tracing
10. 跑 PostToolUse hooks
11. 失败时走 PostToolUseFailure hooks

### 4.2 关键点

- Hook 不只是日志回调，而是 policy layer
- Hook 可以返回 `updatedInput`、`permissionBehavior`、`preventContinuation`
- Hook 很强，但不会绕开统一 permission model
- Tool 成功返回也不是终点，后处理阶段仍可补充上下文或阻断继续执行

### 4.3 设计启发

如果用户在做复刻，不要从“让模型直接调函数”起步。Claude Code-like runtime 至少要有：

- 输入 schema 和 validateInput
- pre/post hook 机制
- 统一的 permission 语义
- tool-specific 的恢复与失败信息

## 5. Agent Orchestration

Claude Code 不是“主 agent + 若干普通子 agent”，而是有明确角色和生命周期分层。

### 5.1 built-in agents

PDF 里明确提到的角色包括：

- General Purpose Agent
- Explore Agent
- Plan Agent
- Verification Agent
- Claude Code Guide Agent
- Statusline Setup Agent

最重要的三个 specialist agents：

- Explore：只读探索专家，强调快、只读、并行搜索
- Plan：纯规划，不做编辑，输出 step-by-step plan 和 critical files
- Verification：以 try to break it 为导向的 adversarial validator

### 5.2 fork path vs normal path

报告强调 fork 不是“再开一个普通 agent”，而是一条为上下文继承和 cache 命中优化的路径：

- fork path：继承父线程 system prompt 和上下文，尽量保持 prefix byte-identical
- normal path：按 agent definition 生成自己的 system prompt 和 tool restrictions

### 5.3 background vs foreground

Claude Code 对 agent lifecycle 做了显式分流：

- foreground sync path
- async background path
- remote launched path
- teammate spawned path

这意味着 agent 调度已经产品化，而不是一次性的函数调用。

## 6. Skill / Plugin / Hook / MCP

这是 Claude Code 扩展能力最容易被低估的一层。

### 6.1 Skill

报告给出的核心判断：

- Skill 是 first-class primitive
- Skill 不是文档，而是 workflow package
- 能按需注入 prompt 内容
- 能压缩重复工作流

### 6.2 Plugin

Plugin 被描述为：

- prompt + metadata + runtime constraints
- 可以带 commands、skills、commandsMetadata、allowed-tools、model hints、runtime vars

### 6.3 Hook

Hook 是 runtime governance layer，能影响：

- 输入
- 权限决策
- 是否继续执行
- MCP 输出
- 额外上下文

### 6.4 MCP

MCP 的价值不止在“提供新工具”：

- 连接的 server 可以提供 instructions
- 这些 instructions 会被拼入 system prompt
- 所以 MCP 同时扩展了工具面和行为面

## 7. Productization Themes

Claude Code 的产品感来自一组系统级主题，而不是单点技巧。

### 7.1 Context hygiene

报告反复强调上下文预算意识：

- static/dynamic prompt boundary
- prompt cache boundary
- fork path 共享 cache
- skill 按需注入
- MCP instructions 按连接状态注入
- summarize tool results
- transcript / compact / resume

### 7.2 Institutionalized good behavior

Claude Code 的另一个核心是把“好习惯”制度化：

- 不要瞎加功能
- 不要过度抽象
- 不要验证前声称成功
- 不要把风险操作当捷径
- 匹配 skill 时必须执行 skill
- verification 不能只看代码

### 7.3 Role separation

研究、规划、实现、验证分开之后，系统更稳，因为：

- 探索不污染主线程
- 规划不和实现混在一起
- 验证对抗实现者偏差

## 8. 回答模板

### 8.1 原理解释

推荐输出顺序：

1. 一句总判断
2. 用 3 到 5 层解释它为什么像 operating system
3. 给 2 到 4 个关键文件锚点
4. 总结对用户的启发

### 8.2 架构复刻

推荐输出顺序：

1. 先拆“最小可用子集”
2. 再拆“强化层”
3. 明确哪些只是 prompt，哪些是 runtime contract
4. 最后指出最容易做错的地方

### 8.3 方案评审

拿用户方案对照下面的检查项：

- 有没有 prompt assembly，而不是单块 prompt
- 有没有统一 tool runtime
- 有没有 permission + hooks
- 有没有 specialist agents
- 有没有 skill/plugin/MCP 的模型可感知扩展层
- 有没有 context hygiene
- 有没有 transcript / cleanup / telemetry

## 9. 常见误区

- 把 Claude Code 归因为某段秘密 prompt
- 只学表层交互，不学 runtime contracts
- 只做子 agent，不做角色 specialization
- 只做工具注册，不做工具使用语法和治理
- 只做插件安装，不让模型“感知这些能力何时该用”
