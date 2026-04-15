# Hermes Wiki

状态：持续维护中  
最后更新：2026-04-15

这个目录用于系统化沉淀对 Hermes Agent 设计思想的学习，不把它当成“一个会聊天的模型壳”，而是把它当成一个长期运行、可恢复、可治理、可学习、可跨入口部署的 agent runtime 来研究。

## 当前结论

Hermes 最值得学的不是某一个单点功能，而是下面这套一体化思想：

1. Agent 的本体不是单轮推理，而是一条长期运行的执行链路。
2. Prompt 不是一段文案，而是一个分层装配系统，同时也是缓存系统。
3. 记忆不是“多记一点”，而是分层、限额、按需召回、可落盘。
4. Skills 不是工具列表，而是 procedural memory，是把经验转成可复用流程。
5. Context compression 不是补丁，而是长上下文 agent 的核心子系统。
6. Subagent 不是“多开几个模型”，而是严格隔离上下文和工具边界的执行单元。
7. 安全、调度、网关、多入口接入，都是 runtime 本体的一部分，不是外围配件。

## 目录

- [source-catalog.md](./source-catalog.md)：来源目录，区分官方一手、官方索引、社区二手和待验证材料
- [research-log.md](./research-log.md)：研究过程、判断修正、检索路径和阶段性结论
- [hermes-design-philosophy.md](./hermes-design-philosophy.md)：Hermes 设计哲学总论
- [runtime-architecture.md](./runtime-architecture.md)：运行时结构、入口、会话、profiles、tool runtime、service 化
- [prompt-memory-skills.md](./prompt-memory-skills.md)：prompt assembly、memory、skills、Honcho 与学习闭环
- [compression-delegation-safety.md](./compression-delegation-safety.md)：上下文压缩、subagent delegation、cron、安全边界
- [source-code-architecture.md](./source-code-architecture.md)：从源码与官方开发文档拆 AIAgent、prompt builder、SessionDB、tool registry 等骨干对象
- [agent-design-patterns.md](./agent-design-patterns.md)：从 Hermes 提炼出的 agent 应用设计模式与可迁移方法论
- [design-tensions-and-tradeoffs.md](./design-tensions-and-tradeoffs.md)：Hermes 暴露出来的架构张力、边界风险和设计取舍
- [service-runtime-and-time-model.md](./service-runtime-and-time-model.md)：gateway、cron、多入口服务化、时间驱动任务与会话连续性
- [plugin-and-provider-architecture.md](./plugin-and-provider-architecture.md)：general plugins、memory providers、context engines、provider runtime、auxiliary routing
- [expert-skill-blueprint.md](./expert-skill-blueprint.md)：面向未来“agent 应用专家 skill”的知识模块草案
- [openclaw-vs-hermes.md](./openclaw-vs-hermes.md)：和 OpenClaw 的对照，帮助明确 Hermes 的独特取舍

## 阅读顺序建议

如果目标是快速吃透 Hermes 的骨架，建议按下面顺序读：

1. `hermes-design-philosophy.md`
2. `runtime-architecture.md`
3. `prompt-memory-skills.md`
4. `compression-delegation-safety.md`
5. `source-code-architecture.md`
6. `agent-design-patterns.md`
7. `design-tensions-and-tradeoffs.md`
8. `service-runtime-and-time-model.md`
9. `plugin-and-provider-architecture.md`
10. `expert-skill-blueprint.md`
11. `openclaw-vs-hermes.md`
12. `research-log.md`

## 维护原则

1. 优先记录一手结论，再记录二手解读。
2. 明确标注“官方直接证据”“官方搜索索引/摘要”“社区推断”三种证据等级。
3. 所有新结论都尽量落到某个明确主题页，而不是只堆在日志里。
4. 如果后续发现先前判断不严谨，直接改主题页，不做补丁叠补丁式追加。
