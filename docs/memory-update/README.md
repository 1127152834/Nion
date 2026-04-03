# Memory Update 研究目录

这组文档用于支撑 Nion 下一轮记忆系统升级讨论，目标不是先堆功能，而是先把下面四件事说清楚：

1. 我们现在真实在线的记忆系统是什么。
2. 它有哪些已经不错的设计亮点。
3. 它为什么还支撑不起“陪伴型 personal agent”的目标。
4. 外部优秀 agent / memory 产品里，哪些模式值得吸收，哪些不该照抄。

## 文档列表

- `current-memory-system-audit.md`
  - 当前仓库中真实在运行的记忆链路、亮点、缺点。
- `external-agent-memory-patterns.md`
  - 外部产品与论文里值得借鉴的 memory / self-maintenance / growth 模式。
- `memory-upgrade-direction-v1.md`
  - 面向 Nion 的升级主张，强调“更懂用户、更会服务、更会自我维护”。
- `mature-memory-systems-matrix.md`
  - 成熟记忆系统能力矩阵，说明哪些模式值得吸收、哪些不该照抄。
- `nion-memory-os-final-architecture.md`
  - 收敛后的完整方案：对象模型、生命周期、后台维护、自动化 ownership、接线顺序。
- `sources.md`
  - 本轮调研用到的内部材料与外部公开来源。

## 当前总判断

Nion 现在已经不是“完全没有记忆”的状态，但它仍然更像一组并存机制：

- `memory.json` 结构化长期记忆
- `recall.sqlite3` 对话召回
- OpenViking notebook chunk 检索
- `SOUL.md` 身份/人格注入

这说明它已经有一些很关键的基础：

- 会记
- 会召回
- 会注入 prompt
- 开始有 notebook / memory / soul 的边界意识

但它还没有形成真正统一的 `Memory OS`。尤其还缺：

- 心跳驱动的后台自我维护
- 面向用户的长期用户模型
- agent 自己的日记、学习计划、成长记录
- 记忆转技能、记忆转自动化、记忆淘汰与归档
- “用户设置的任务”和“agent 自发形成的任务”的治理分层

因此这轮升级不该理解成“给 memory.json 再加几个字段”，而应该理解成：

**把 Nion 从“有几个记忆机制的 agent”升级成“有长期用户模型、自我维护、自主学习和可治理成长回路的 personal agent”。**

## 当前推荐阅读顺序

1. 先读 [current-memory-system-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/current-memory-system-audit.md)
2. 再读 [mature-memory-systems-matrix.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/mature-memory-systems-matrix.md)
3. 最后读 [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)
