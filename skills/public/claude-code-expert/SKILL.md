---
name: claude-code-expert
description: Use when the user asks about Claude Code internals, architecture, prompt assembly, AgentTool or SkillTool, built-in agents, fork/background agents, hooks, permissions, MCP, plugin/skill loading, or wants to recreate a Claude Code-like coding agent. 也用于“Claude Code 原理/源码/prompt/AgentTool/SkillTool/fork/hook/MCP/权限模型/复刻 Claude Code/做一个类似 Claude Code 的系统”等请求。
---

# Claude Code Expert

把 Claude Code 当成一种 operating model 来分析，而不是一段神秘 prompt。这个 skill 适合做源码导读、架构拆解、复刻方案设计，以及对 Claude Code-like 系统做差距评审。

## 任务分类

先判断用户请求属于哪一类：

- 原理解释：为什么 Claude Code 稳、强、像产品而不是脚本
- 源码导读：关键文件、调用链、模块边界、哪个文件回答哪个问题
- 架构复刻：如何做一个 Claude Code-like coding agent
- 差距评审：拿现有 agent 系统和 Claude Code 的设计做对比

## 资料加载

- 默认先读 `references/operating-model.md`
- 用户要具体文件、函数、调用链、source-map 锚点时，再读 `references/source-anchors.md`

不要一上来把所有参考资料都塞进上下文；按问题加载。

## 分析框架

回答时优先按这五层展开：

1. Prompt assembly：静态前缀、动态会话注入、cache boundary
2. Tool runtime governance：输入校验、permission、hooks、执行后治理
3. Agent orchestration：specialized agents、fork path、background lifecycle
4. Extension plane：skills、plugins、hooks、MCP instructions
5. Productization：context hygiene、transcript、cleanup、telemetry、用户体验

如果用户要“复刻 Claude Code”，默认给出最小可用实现顺序：

1. 先做 prompt assembly 和 session-specific guidance
2. 再做结构化工具层和 tool usage grammar
3. 再做 permission + hook pipeline
4. 再做 Explore / Plan / Verification 这类 specialist agents
5. 最后补 skills / plugins / MCP / background tasks / transcript cleanup

## 输出要求

- 先给一句总判断，再分层展开
- 明确区分“报告中已确认的事实”和“基于报告的推断”
- 讲源码时优先给文件锚点，讲设计时优先给职责边界
- 讲复刻方案时优先给 operating model，不要只给 prompt 模板

## Guardrails

- 不要把 Claude Code 简化成“一个 system prompt + 几个工具”
- 不要建议只复制 prompt，而忽略 permission、hooks、agents、context hygiene
- 不要把 report 里的结论说成 Anthropic 官方公开设计文档；要注明这是基于 `cli.js.map` 还原后的研究
- 如果用户的问题只需要局部解释，不要把整套生态全倒出来
