# 成熟记忆系统对比矩阵

## 1. 目标

这份矩阵不是为了列全市场产品，而是为了回答一个更务实的问题：

**哪些成熟系统里的记忆模式，已经足够稳定到可以拿来支撑 Nion 的最终 Memory OS 方案。**

## 2. 评价维度

我把样本放在同一张表里时，只看下面这些维度：

- `scope discipline`
  - 是否明确区分 user / session / agent / org / project
- `memory layering`
  - 是否明确区分 short-term / long-term / core / archival / working / procedural
- `background maintenance`
  - 是否存在 sleep-time / heartbeat / consolidation / async scheduler
- `temporal invalidation`
  - 是否支持事实失效、时间范围、覆盖旧事实
- `memory as artifact`
  - 是否把记忆做成可版本化、可审计、可回滚的工件
- `governance`
  - 是否有 ownership、access log、policy、audit
- `service evolution`
  - 是否支持把记忆转成 procedure / skill / workflow

## 3. 样本矩阵

| 系统 | 已确认强项 | 对 Nion 最值得吸收 | 不该照抄的点 |
|---|---|---|---|
| `Mem0` | session/user/org 分层；entity scope；graph memory；memory operations | scope discipline、entity ownership、memory promotion | 不要把 Nion 变成纯外部 memory SDK 壳 |
| `Letta Code / Letta agents` | MemFS；core vs archival；sleep-time agents；memory self-editing | memory-as-artifact、sleep-time reflection、agent self-maintenance | 不要把 Nion 完全绑定成 code-agent shell |
| `MemGPT` | core/recall/archival 多级内存；上下文工程 | core vs archival 分层、有限上下文管理 | 不要直接把论文里的 OS 比喻原样落产品 |
| `LangGraph / LangChain / Deep Agents` | thread state、store、profile vs collection、hot path / background writes | runtime contract、state != memory、background consolidation | 不要只停留在框架概念层，不补产品 contract |
| `Zep / Graphiti` | temporal knowledge graph；`valid_at/invalid_at`；图级事实更新 | temporal invalidation、历史保留、不只追加 | 不要一上来就把 Nion 全盘图化 |
| `AWS Bedrock AgentCore Memory` | extraction + consolidation 策略；user preference memory；self-managed strategy | extraction 与 consolidation 分离、策略化 memory pipeline | 不要照抄云服务形态与云中心依赖 |
| `MemOS` | MOS/MemScheduler；多记忆类型；异步调度；生命周期与治理 | heartbeat/scheduler、lifecycle、memory governance、audit | 不要一开始就引入过重的参数记忆/复杂栈 |
| `OpenMemory` | project-scoped memory；tagged memory types；access logs | project scope、access logs、可见性 | 当前公开信息仍偏产品首页，不足以照抄细节 |
| `AgentMem` | hybrid pattern：本地 + 云层 + 文件层；procedural memory；token-efficient recall | hybrid substrate、procedural memory、summary-first retrieval | 它是 persistence layer，不是完整 Memory OS |

## 4. 每个样本的精确结论

## 4.1 Mem0

### 已确认事实

- 官方文档明确把 memory 分为 `conversation`、`session`、`user`、`organizational`。
- 它还显式提到 `working / factual / episodic / semantic` 等记忆类型。
- 写入和查询时使用 `user_id`、`session_id`、`run_id`、metadata 等 scope 标识。

### 对 Nion 的结论

Mem0 最强的地方不是“能存 memory”，而是：

- **知道 memory 属于谁**
- **知道 memory 属于哪一层**

对 Nion，这意味着 owner/scope 设计必须是 P0，而不是后补字段。

Sources:
- [Memory Types - Mem0](https://docs.mem0.ai/core-concepts/memory-types)
- [Add Memory - Mem0](https://docs.mem0.ai/core-concepts/memory-operations)

## 4.2 Letta / MemGPT

### 已确认事实

- Letta Code 当前把 agent memory 放在 git-backed `MemFS` 中，由 agent 自己维护 markdown files。
- Letta 明确区分 core memory 和 archival memory。
- Letta 还有 `sleep-time agents`，可在后台异步修改 primary agent 的 memory。
- MemGPT 把 memory 分成 core / recall / archival，多级上下文工程是主设计。

### 对 Nion 的结论

这组样本证明了一点：

**高阶 personal agent 的“灵魂、日记、成长记录”更像版本化 memory artifacts，而不是 facts 列表。**

Nion 后续的：

- soul
- diary
- learning plan
- procedure draft

都应该进入 artifact layer。

Sources:
- [Memory | Letta Docs](https://docs.letta.com/letta-code/memory/)
- [Sleep-time Agents | Letta Docs](https://docs.letta.com/guides/agents/sleep-time-agents/)
- [Agent memory & architecture | Letta Docs](https://docs.letta.com/guides/agents/architectures/memgpt)
- [MemGPT Paper](https://arxiv.org/abs/2310.08560)

## 4.3 LangGraph / LangChain / Deep Agents

### 已确认事实

- LangGraph 把短期记忆视为 thread state。
- 长期记忆使用 store，并推荐通过 namespace 组织。
- LangChain 文档明确区分 `profile` 与 `collection` 两种长期记忆建模方式。
- 官方也明确提到 hot path 和 background memory writes 的区分。

### 对 Nion 的结论

它给 Nion 的核心启发不是“怎么存”，而是：

- state 不等于 memory
- 统一 profile 不等于所有记忆都应并到 profile
- 后台 consolidation 必须从主响应链拆出来

Sources:
- [Add long-term memory - LangGraph](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Memory overview - LangChain](https://docs.langchain.com/oss/python/concepts/memory)
- [Long-term memory - Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/long-term-memory)

## 4.4 Zep / Graphiti

### 已确认事实

- Zep 官方文档强调 temporal graph。
- facts 带有 `valid_at` / `invalid_at` 时间戳。
- 新信息进入时，系统会判断是新增、更新还是使旧事实失效。

### 对 Nion 的结论

这直接解决了 Nion 当前一个薄弱点：

**用户事实是会变化的。**

因此 Nion 未来必须支持：

- valid / invalid
- supersede
- historical truth

而不是简单覆盖或无限追加。

Sources:
- [Facts | Zep Documentation](https://help.getzep.com/facts)
- [Understanding the Graph | Zep Documentation](https://help.getzep.com/v2/understanding-the-graph)

## 4.5 AWS Bedrock AgentCore Memory

### 已确认事实

- `UserPreferenceMemoryStrategy` 把 pipeline 明确拆成 extraction 和 consolidation。
- 官方还提供 self-managed strategy，允许自行控制 extraction/consolidation。
- 官方文档明确指出，有些一次性信息不应进入长期偏好理解。

### 对 Nion 的结论

这组材料最大的价值是：

**长期记忆不应该在抽取时立刻当真，而要经过 consolidation。**

对 Nion 来说，这意味着：

- turn 后抽取的是 candidate
- heartbeat/self-maintenance 才做 consolidation

Sources:
- [User preference memory strategy - Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/user-preference-memory-strategy.html)
- [System prompt for user preference memory strategy - Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-user-prompt.html)
- [Self-managed strategy - Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-self-managed-strategies.html)

## 4.6 MemOS

### 已确认事实

- MemOS 明确把自己定义成 `Memory Operating System`。
- 文档描述了 `MOS`、`MemCube`、`MemScheduler`、`MemLifecycle`、`MemGovernance`。
- 它支持多种 memory type，并强调异步调度、生命周期状态与审计日志。
- 官方文档还明确列出生命周期：生成、激活、合并、归档、冻结。

### 对 Nion 的结论

MemOS 最值得借的是系统观：

- memory scheduler
- lifecycle
- auditability
- governance

这与 Nion 要做 heartbeat、淘汰、成长记录非常契合。

Sources:
- [什么是 MemOS？](https://memos-docs.openmem.net/cn/home/memos_intro/)
- [架构设计](https://memos-docs.openmem.net/cn/open_source/home/architecture)
- [MemScheduler](https://memos-docs.openmem.net/modules/mem_scheduler)

## 4.7 OpenMemory

### 已确认事实

- 官方首页明确强调 project-scoped memory。
- 记忆按类型打 tag，如 preferences / decisions / patterns / troubleshooting / team conventions。
- 它还把 access logs 作为产品面的核心一部分。

### 对 Nion 的结论

OpenMemory 证明：

- project scope 很重要
- typed memory 很重要
- access logs / observability 也很重要

这对 Nion 的 notebook/workspace/project 场景是直接启发。

Sources:
- [OpenMemory](https://openmemory.ai/)

## 4.8 AgentMem

### 已确认事实

- AgentMem 官方明确说自己不是完整 memory solution，而是 persistence layer。
- 它推荐 `本地 session memory + 云持久层 + 文件系统` 的 hybrid pattern。
- 官方还强调 procedural memory、token-efficient summaries first, full content on demand。

### 对 Nion 的结论

这验证了一个现实取向：

**Nion 不必为了“完整记忆系统”而只押注单一底层。**

更合理的是：

- 本地 working/recall
- durable structured store
- artifact files
- 搜索层

Sources:
- [AgentMem Docs](https://agentmem.io/docs)

## 5. 最终取舍

基于这些样本，我对 Nion 的最终取舍是：

### 必须吸收

- owner / scope discipline
- core vs archival 分层
- extraction vs consolidation 分离
- background maintenance / scheduler
- temporal invalidation
- artifact-based self memory
- audit / access log / provenance
- procedural crystallization

### 暂不作为 P0

- 全盘 graph-first
- 参数化记忆
- 复杂多租户 SaaS 能力
- 纯云中心托管 memory

### 不该照抄

- 把 Nion 收缩成 code-first shell
- 让 notebook 直接变成 agent memory
- 让用户直接编辑 agent internal memory artifacts
- 在没有 governance 的情况下让 agent 自由生长

## 6. 结论

如果只选一句话作为矩阵结论，那就是：

**Nion 的最终方案不该是“更大的 memory store”，而该是“有 owner、有时态、有后台维护、有 artifact、有程序化升级能力的 Personal Memory OS”。**
