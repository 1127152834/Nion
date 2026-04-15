# Hermes 与相邻系统的范式对照

最后更新：2026-04-15

这页关注的不是“谁更强”，而是它们分别代表什么架构范式。

## 1. Hermes vs OpenClaw

这个对照在 [openclaw-vs-hermes.md](./openclaw-vs-hermes.md) 已经有一版，这里只提炼最重要的范式差异。

### OpenClaw 更像什么

- agent 主体性更强
- bootstrap / identity / soul / user 语义更显式
- 更强调“长期关系中的 agent”
- active memory / ritual / workspace 文件的存在感更强

### Hermes 更像什么

- runtime 平台性更强
- provider / tool / session / profile / gateway 更像系统骨架
- service 化、多入口、cron、API/MCP server 更完整
- plugin / provider contract 更成熟

### 我的总结

- OpenClaw 更像“人格与持续关系优先的 agent”
- Hermes 更像“运行时与平台优先的 agent”

两者都重要，但不是同一路线。

## 2. Hermes vs Claude Skills

### Claude Skills 的代表范式

从 Anthropic cookbook 和相关公开材料看，Claude Skills 更强调：

1. progressive disclosure
2. 结构化知识包
3. 低 token 成本的技能发现
4. agent capability packaging

换句话说，Claude Skills 的主问题是：

> 如何让 agent 在不被 prompt stuffing 压垮的前提下，拥有大量专长能力？

### Hermes 的不同点

Hermes 当然也用了 progressive disclosure，而且做得很好。
但它的 ambition 更大：

1. 不只是 skills
2. 还要解决 memory、gateway、cron、provider、profiles、session persistence

所以 Claude Skills 更像 **capability packaging pattern**，
而 Hermes 更像 **full agent runtime pattern**。

### 对 expert skill 的启发

未来专家 skill 应该吸收 Claude Skills 的：

- progressive disclosure
- skill 包结构
- capability packaging 方法

但不能把 skill 误当成整个 agent 平台。

## 3. Hermes vs Codex

### Codex 的公开定位

从 README 和 OpenAI 文档看，Codex 更明确定位为：

- 本地运行的 coding agent
- terminal / IDE / app / web 多表面共享核心
- 安全策略、sandbox、skills、subagents、MCP 集成

这里和 Hermes 有一个非常重要的共性：

> 二者都不是“模型加壳”，而是把 agent loop 做成 runtime core。

### 差异在哪里

Hermes 更强调：

- messaging gateway
- cron
- persistent memory / user model
- service-like always-on runtime

Codex 更强调：

- 本地 coding harness
- core runtime across surfaces
- sandbox / approval / local execution discipline
- developer workflow integration

### 我的总结

- Hermes 偏 persistent service agent
- Codex 偏 local coding runtime

二者共享很多 runtime 思维，但目标场景不同。

## 4. Hermes vs Claude Code

从公开材料和缓存分析可以看出，Claude Code 最强的一点之一是：

- 围绕 prompt caching 做了高度 prefix-friendly 的组织
- skills / AGENTS.md / subagents 都在为上下文复用服务

Hermes 在这方面也很强，但两者的重点略不同：

### Claude Code 强项

- coding 任务中的上下文复用
- skill 机制和项目上下文兼容
- prefix cache 友好编排

### Hermes 强项

- 把这种思维扩展到 service runtime
- 再往上叠 memory、gateway、cron、profiles、provider plugins

### 对 expert skill 的启发

未来那个 skill 不应只学 Hermes，也该明确吸收 Claude Code 这一类系统在：

- cache-oriented prompt design
- local workflow discipline
- skill activation economy

上的经验。

## 5. 这几个系统其实分别代表三个层次

### 层次一：Capability Layer

代表：Claude Skills
关注点：如何把专长打包给 agent。

### 层次二：Task Runtime Layer

代表：Codex / Claude Code
关注点：如何让 agent 在本地/IDE/terminal 里可靠执行复杂任务。

### 层次三：Persistent Service Runtime Layer

代表：Hermes / OpenClaw
关注点：如何让 agent 成为长期运行、跨入口、有记忆、有调度、有策略层的系统。

## 6. 为什么这层对照很重要

因为未来 expert skill 如果只站在某一个层次上，就会歪：

1. 只学 Claude Skills，会过度关注技能包装，忽略 runtime。
2. 只学 Codex，会过度关注 coding harness，忽略 persistent service。
3. 只学 Hermes，会把某些 Hermes 特有选择误当成唯一正确答案。

## 7. 当前结论

真正强的 agent 应用专家 skill，应该融合三类范式：

1. Claude Skills 的能力包装与 progressive disclosure
2. Codex / Claude Code 的本地任务运行时与 cache-friendly 编排
3. Hermes / OpenClaw 的 persistent runtime、memory、service、调度与治理

只有这样，它才不会只是“某个项目的复读机”。
