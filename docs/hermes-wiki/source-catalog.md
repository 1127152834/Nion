# Hermes Wiki Sources

最后更新：2026-04-15

这个目录按“证据强度”管理来源，避免把官方事实、搜索摘要和社区文章混成一层。

## A. 官方一手资料

这些来源优先级最高，构成 Hermes 设计哲学判断的主骨架。

| 来源 | 类型 | 说明 |
| --- | --- | --- |
| [Hermes Agent README](https://github.com/NousResearch/hermes-agent/blob/main/README.md) | 官方仓库 | 项目定位、核心能力矩阵、文档导航、OpenClaw 迁移、自我改进叙事 |
| [Hermes 官网首页](https://hermes-agent.nousresearch.com/) | 官方站点 | 产品级定位摘要，强调 server-resident、persistent、skill-generating、cross-platform |
| [Architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) | 官方文档 | 总体架构、provider resolver、tool system、session persistence 等 |
| [Architecture 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/architecture.md) | 官方仓库文档源码 | 可直接读取的 developer guide 原文，规避官网抓取限制 |
| [Agent Loop Internals 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/agent-loop.md) | 官方仓库文档源码 | `AIAgent` 主循环、tool dispatch、budget、fallback、compression |
| [Prompt Assembly](https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly) | 官方文档 | prompt 分层装配、缓存层次、session state 注入方式 |
| [Prompt Assembly 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/prompt-assembly.md) | 官方仓库文档源码 | cached layers、ephemeral layers、frozen snapshot、context file priority |
| [Context Compression and Caching](https://hermes-agent.nousresearch.com/docs/developer-guide/context-compression-and-caching) | 官方文档 | 双层压缩、prompt caching、context engine 抽象 |
| [Context Compression and Caching 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/context-compression-and-caching.md) | 官方仓库文档源码 | dual compression、plugin context engine、algorithm 细节 |
| [Tools Runtime 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/tools-runtime.md) | 官方仓库文档源码 | registry、自注册、toolset、dispatch、agent-level tools |
| [Session Storage 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/session-storage.md) | 官方仓库文档源码 | SQLite、FTS5、lineage、WAL、写冲突处理 |
| [Provider Runtime Resolution 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/provider-runtime.md) | 官方仓库文档源码 | provider resolution、api mode、fallback、auxiliary routing |
| [Gateway Internals 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/gateway-internals.md) | 官方仓库文档源码 | 多平台 gateway、session routing、busy guards、delivery、hooks |
| [Cron Internals 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/cron-internals.md) | 官方仓库文档源码 | fresh session、skill-backed jobs、delivery model、provider recovery |
| [Memory Provider Plugin 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/memory-provider-plugin.md) | 官方仓库文档源码 | MemoryProvider lifecycle、config、hooks、profile isolation |
| [Context Engine Plugin 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/context-engine-plugin.md) | 官方仓库文档源码 | ContextEngine ABC、single-select 策略层、engine tools |
| [Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) | 官方文档 | `MEMORY.md`、`USER.md`、持久记忆边界与用户建模 |
| [Memory 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/memory.md) | 官方仓库文档源码 | frozen snapshot、capacity、security scan、session search |
| [Personality](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality) | 官方文档 | `SOUL.md` 的角色与人格层边界 |
| [Skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) | 官方文档 | skills 作为 procedural memory 的使用和演化 |
| [Skills 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md) | 官方仓库文档源码 | progressive disclosure、skill metadata、fallback activation |
| [Context Files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files) | 官方文档 | `AGENTS.md` / `SOUL.md` / workspace context 的加载边界 |
| [Plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) | 官方文档 | general plugins、memory providers、context engines 三类插件 |
| [Plugins 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/plugins.md) | 官方仓库文档源码 | plugin types、discovery、hooks、provider plugin selection |
| [Delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation) | 官方文档 | subagent delegation、隔离会话、工具边界 |
| [Delegation 源 markdown](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/delegation.md) | 官方仓库文档源码 | fresh context、blocked toolsets、depth limit、parallel children |
| [Scheduled Tasks (Cron)](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron) | 官方文档 | 自然语言调度、跨平台投递、无人值守任务 |
| [Credential Pools](https://hermes-agent.nousresearch.com/docs/user-guide/features/credential-pools) | 官方文档 | same-provider key rotation、auth source 聚合 |
| [Fallback Providers](https://hermes-agent.nousresearch.com/docs/user-guide/features/fallback-providers) | 官方文档 | provider fallback、auxiliary fallback、custom endpoint precedence |
| [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security) | 官方文档 | prompt injection 防护、secret redaction、command approval、容器隔离 |
| [RELEASE_v0.6.0](https://github.com/NousResearch/hermes-agent/blob/main/RELEASE_v0.6.0.md) | 官方发布说明 | profiles、MCP server mode、多平台 gateway、remote skills/secrets 等重大演进 |
| [RELEASE_v0.7.0](https://github.com/NousResearch/hermes-agent/blob/main/RELEASE_v0.7.0.md) | 官方发布说明 | pluggable memory、API server continuity、security hardening、gateway hardening |

## B. 官方索引 / 搜索摘要

这些来源仍来自官方站点或官方仓库，但部分结论通过搜索索引、Tavily 摘要或 README 导航间接拿到。可以作为证据补充，但不应单独支撑强结论。

| 来源 | 类型 | 说明 |
| --- | --- | --- |
| Tavily 对 Hermes 官方文档页面的摘要 | 检索摘要 | 用于补足直接抓取受限页面的要点，例如 provider resolver、tool registry、session persistence |
| Tavily 对官方 release/issue/discussion 的摘要 | 检索摘要 | 用于识别近期演进方向，如 profile isolation、security patch、compression death spiral 修复 |
| Tavily 对 GitHub issue / release 的摘要 | 检索摘要 | 用于发现设计张力，例如 memory prefetch contamination、memory provider bridge 缺失 |
| Tavily 对 gateway / cron / approval / fallback 相关 issue 的摘要 | 检索摘要 | 用于构建设计失败模式语料：消息覆盖、审批误拦截、cron 交付静默失败、auth 层短路等 |

## C. 社区二手解读

这些材料有启发价值，但只作为辅助视角，不直接替代官方文档。

| 来源 | 类型 | 用途 |
| --- | --- | --- |
| [How Hermes Agent Solves the Context Window Problem](https://medium.com/@maclarensg_50191/how-hermes-agent-solves-the-context-window-problem-and-what-every-agent-builder-should-borrow-bf90071f4757) | Medium | 对 context compression、skills as procedural memory 的工程化解读 |
| [Nous Research Hermes Agent: Setup and Tutorial Guide](https://www.datacamp.com/tutorial/hermes-agent) | 教程 | 对 Hermes 的安装、memory、session search、cron 实例有概览价值 |
| [Hermes Agent Hands-On: Nous Research Personal AI Agent Review](https://www.heyuan110.com/posts/ai/2026-04-14-hermes-agent-guide/) | 博文 | 对 retrieve-on-demand 和记忆层次的实践视角 |
| [Reddit: native frontend on top of Hermes Agent](https://www.reddit.com/r/SideProject/comments/1sdaojm/i_took_the_nousresearch_hermes_agent_and_built_a/) | Reddit | 补充社区如何理解 6-layer prompt、profiles、skills browser |
| [Hermes Agent: The OpenClaw Alternative](https://nervegna.substack.com/p/hermes-agent-the-openclaw-alternative) | Substack | 对 Hermes 与 OpenClaw 位置差异的产品化概括 |
| [Inside Hermes Agent: How a Self-Improving AI Agent Actually Works](https://mranand.substack.com/p/inside-hermes-agent-how-a-self-improving) | Substack | 对 gateway 与 agent loop 的产品化转述，可用于辅助验证叙事结构 |

## D. 相关对照资料

这些来源不是 Hermes 本身，但对理解 Hermes 的差异化很重要。

| 来源 | 类型 | 说明 |
| --- | --- | --- |
| [OpenClaw / Hermes Memory & Soul 学习记录](../reviews/2026-04-10-openclaw-hermes-memory-soul-learning.md) | 仓库内研究笔记 | 现有 Memory / Soul 对照基础 |
| [OpenClaw 相关文章镜像](https://www.woshipm.com/ai/6357377.html) | 二手镜像 | 用于对照 OpenClaw 在 memory、skills、gateway、subagent 上的叙事 |

## 当前证据风险

1. Hermes 官方站点对部分直接抓取返回 403，因此若某个细节只在搜索摘要里出现，需要继续找仓库源码或未来再次核验。
2. 社区文章大量复述 README 与文档，不少观点是“高质量转述”，不是新的原始事实。
3. 最近发布节奏很快，涉及 release 的能力判断需要优先参考 `RELEASE_v0.7.0` 和主分支 README，而不是旧教程。
