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
- `specification-package-plan.md`
  - 实施前置规格包总计划，说明要写哪些冻结文档、谁依赖谁。
- `00-memory-os-scope-and-principles.md`
  - 冻结范围、非目标、术语与核心原则。
- `01-memory-os-domain-model.md`
  - 冻结 domain / owner / scope / canonical source。
- `02-memory-os-business-rules.md`
  - 冻结 candidate、晋升、失效、升级链的业务逻辑。
- `03-memory-os-data-contracts.md`
  - 冻结核心数据对象、artifact 合同、automation ownership 字段。
- `04-memory-os-runtime-flows.md`
  - 冻结 hot path、post-turn、heartbeat、consolidation 时序。
- `05-memory-os-governance-and-permissions.md`
  - 冻结 `AUTO / SUGGEST / CONFIRM / FORBID` 治理矩阵。
- `06-memory-os-interaction-model.md`
  - 冻结用户看到什么、能控制什么、如何理解 agent 成长。
- `07-memory-os-migration-and-compatibility.md`
  - 冻结 legacy -> Memory OS 的渐进迁移与回滚路径。
- `08-memory-os-observability-and-risk.md`
  - 冻结预算、背压、drift、日志与降级策略。
- `09-memory-os-implementation-plan.md`
  - 基于规格包生成的正式实施方案。
- `10-soul-system-research.md`
  - 外部 companion / stateful agent / SOUL.md 路线调研，说明完整灵魂系统应由哪些层组成。
- `11-soul-memory-os-integration.md`
  - 说明 soul system 应如何和现有 Memory OS 自我成长体系一体化，而不是平行存在。
- `12-nion-complete-soul-system-architecture.md`
  - 收敛后的完整 Soul System 架构：对象、artifact、runtime、成长闭环、治理与接线方式。
- `13-soul-data-contracts.md`
  - Soul System 实施前置规格第 1 篇，冻结 soul 相关对象、artifact、metadata、状态合同，并明确派生层与 observability 边界。
- `14-soul-runtime-compilation.md`
  - Soul System 实施前置规格第 2 篇，冻结 soul 如何编译成主智能体 runtime text 并进入热路径，同时明确替换现有双轨注入。
- `15-soul-growth-and-reflection-rules.md`
  - Soul System 实施前置规格第 3 篇，冻结 soul 如何从现有 Memory OS 自我成长体系中成长出来，并补最小可执行阈值。
- `16-soul-governance-matrix.md`
  - Soul System 实施前置规格第 4 篇，冻结 soul 各对象的 `AUTO / SUGGEST / CONFIRM / FORBID` 矩阵，并收紧 narrative 治理绕行风险。
- `17-soul-product-interaction-model.md`
  - Soul System 实施前置规格第 5 篇，冻结用户看到什么、能控制什么、如何理解 soul growth。
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
3. 再读 [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)
4. 再读 [10-soul-system-research.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/10-soul-system-research.md)
5. 再读 [11-soul-memory-os-integration.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/11-soul-memory-os-integration.md)
6. 再读 [12-nion-complete-soul-system-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/12-nion-complete-soul-system-architecture.md)
7. 再读 [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
8. 再读 [14-soul-runtime-compilation.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/14-soul-runtime-compilation.md)
9. 再读 [15-soul-growth-and-reflection-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/15-soul-growth-and-reflection-rules.md)
10. 再读 [16-soul-governance-matrix.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/16-soul-governance-matrix.md)
11. 再读 [17-soul-product-interaction-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/17-soul-product-interaction-model.md)
12. 然后从 [specification-package-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/specification-package-plan.md) 开始顺着 `00 -> 09` 阅读
