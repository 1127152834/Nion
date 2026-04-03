# 外部 Agent 记忆系统模式研究

## 1. 研究目标

这份文档只回答一个问题：

**外部优秀 agent / memory 产品，是怎样把“记住你”升级成“更会服务你、更会维护自己”的？**

重点关注：

- 分层记忆
- 自我维护
- 持续成长
- 记忆转技能
- 后台任务 / heartbeat
- 时间语义 / 失效语义
- 本地优先与用户可治理

## 2. 总结判断

外部系统里最值得借鉴的，不是某一个 memory provider，而是下面五个共同规律：

1. 记忆一定分层，不会只有一个桶。
2. 长期记忆一定分 scope，不会所有东西都混在一起。
3. 高价值系统都区分 hot path 和记忆后台维护。
4. 更先进的系统开始处理“事实会变化”而不是只会追加。
5. 陪伴型 agent 真正稀缺的不是检索，而是 `user model + self-maintenance + procedural crystallization`。

下面每一节里我会尽量区分两类内容：

- **已确认事实**：来自公开官方文档或论文的直接结论
- **对 Nion 的启发**：基于这些材料做出的设计判断

## 3. 外部模式拆解

## 3.1 Mem0：分层 + 分实体 + 记忆运营化

### 已确认事实

根据 Mem0 官方文档：

- Mem0 明确区分 `conversation memory`、`session memory`、`user memory`、`organizational memory`。
- 它强调 conversation / session / user / org 的 scope 不同，避免把所有记忆写进同一个范围。
- 它支持 `user_id`、`session_id`、`agent_id`、`app_id` 等实体级 scope。
- 官方文档还强调：
  - working memory
  - factual memory
  - episodic memory
  - semantic memory
- Mem0 有自动 capture / retrieval / filters / graph memory 等能力面。

### 值得借鉴的点

1. **Scope first**
   - 记忆先问“属于谁、属于哪段会话、属于哪个 agent、属于哪个 app”。
2. **Layer first**
   - session 和 user 不混。
3. **运营化**
   - memory 不是死仓库，而是有 filters、search、entity-scope、graph write。

### 对 Nion 的启发

Nion 未来至少要明确区分：

- thread/session 级
- user 级
- agent-self 级
- shared/workspace 级

否则“用户信息”“助手自我成长”“项目经验”“临时任务上下文”一定会互相污染。

## 3.2 Letta / MemGPT：agent 自己管理记忆，不只是外部检索

### 已确认事实

根据 Letta 官方文档和 MemGPT 论文：

- Letta 把 memory 分成 in-context / out-of-context 两层。
- Letta Code 的新 memory 方案是 `MemFS`：
  - 一个 git-backed context repository
  - agent 会自己维护一组 markdown memory files
  - 支持版本化与回滚
- Letta 还保留 `archival memory`：
  - semantic searchable
  - 按需工具查询
  - 不直接常驻上下文
- MemGPT 的核心思想是多级内存管理：
  - core memory
  - recall memory
  - archival memory
  - 通过 interrupts 做上下文切换与控制流。

### 值得借鉴的点

1. **Core vs archival**
   - 始终可见的核心记忆，和按需检索的长期存档，必须分开。
2. **记忆是 agent 可操作对象**
   - agent 不只是“被动用 memory”，而是会维护 memory files。
3. **版本化**
   - 记忆不是一坨匿名向量，而是可回滚、可 diff 的工件。

### 对 Nion 的启发

这对你提的“日记、学习计划、成长笔记、灵魂、自我升级”非常关键。

因为这些东西本质上更像：

- agent-owned documents
- versioned self-artifacts

而不是普通 facts。

也就是说，Nion 未来不能只靠 `memory.json`，还需要一套 agent 自己维护的 memory/workbook 文件层。

## 3.3 LangGraph / Deep Agents：明确区分短期状态、长期存储、热路径、后台路径

### 已确认事实

根据 LangChain / LangGraph 官方文档：

- 短期记忆是 thread-scoped state，由 checkpointer 持久化。
- 长期记忆存在 store 中，按 namespace + key 组织。
- 官方明确区分：
  - `profile`
  - `collection`
  - `episodic memory`
  - `procedural memory`
- 官方也明确区分：
  - memory write on the hot path
  - memory write in the background
- Deep Agents 还支持把 `/memories/` 路由到持久后端，实现跨线程长期 memory。

### 值得借鉴的点

1. **State 不是 Memory**
   - 正在执行中的状态，不等于长期记忆。
2. **Profile vs collection**
   - 有些记忆适合更新统一 profile，有些更适合独立文档集合。
3. **Hot path vs background**
   - 不是所有记忆都该在主响应链路里处理。

### 对 Nion 的启发

Nion 下一轮设计里，至少应分清：

- thread continuity
- user model profile
- episodic archives
- procedural/skill memory
- background reflective maintenance

这点和你想要的 heartbeat / 自我升级是天然一致的。

## 3.4 Zep / Graphiti：记忆不仅要记住，还要处理“变化”

### 已确认事实

根据 Zep 官方站点与文档：

- Zep 当前的核心是 temporal knowledge graph。
- 它明确强调：
  - facts 会变化
  - 旧事实会 invalidated
  - 会保留历史上下文
- Zep 把会话、业务数据、结构化数据统一进动态时间图。
- 它把 agent memory、graph RAG、context assembly 放在同一条上下文工程链上。

### 值得借鉴的点

1. **Temporal truth**
   - 不是只存“用户喜欢 Adidas”，还要能表示“后来改穿 Nike 了”。
2. **Invalidation**
   - 旧记忆不是硬删除，而是先失效。
3. **Context assembly**
   - 检索结果不是终点，还要统一组装成高质量上下文。

### 对 Nion 的启发

这正好击中当前 Nion 的薄弱点：

- 缺少时态
- 缺少事实失效
- 缺少记忆淘汰链

如果 Nion 想做真正长期陪伴型 agent，这层非常值得吸收。

## 3.5 CoALA：给记忆分类型，而不是只分存储

### 已确认事实

CoALA 论文提供了一个认知架构视角，把 agent memory 拆成：

- working memory
- episodic memory
- semantic memory
- procedural memory

### 值得借鉴的点

这套分类很适合拿来做 Nion 的顶层信息架构，因为它直接解释了：

- 什么应该在当前线程里
- 什么应该做长期用户事实
- 什么应该成为经验总结
- 什么应该被提炼成可复用 procedure / skill

### 对 Nion 的启发

你想要的“记忆转 skill”本质上就是：

**把 episodic / semantic memory 提炼成 procedural memory。**

这比简单说“把记忆做大一点”高级得多，也更容易产品化。

## 4. 哪些模式最适合 Nion

Nion 是通用个人办公 AI agent，不是纯 code agent，因此最适合它的不是单一产品的全量照抄，而是组合拳：

### 4.1 从 Mem0 借 scope discipline

- user / session / agent / org 分层
- memory filters
- entity ownership

### 4.2 从 Letta / MemGPT 借 memory-as-artifact

- core vs archival
- memory files / notebooks / versioning
- agent 自己维护自我材料

### 4.3 从 LangGraph 借 runtime discipline

- thread state vs long-term store
- profile vs collection
- hot path vs background path

### 4.4 从 Zep 借 temporal graph thinking

- facts change
- invalidate stale beliefs
- retain history without污染当前 truth

### 4.5 从 CoALA 借 top-level taxonomy

- working
- episodic
- semantic
- procedural

## 5. 外部模式对你这次想法的直接映射

你提到的这些目标：

- 心跳
- 灵魂
- 自我升级
- 日记
- 学习计划
- 记忆转 skill
- 自发自动化
- 归档与删除

如果放到外部 best practice 里，对应关系大致是：

| 你的目标 | 外部最接近模式 | Nion 应吸收什么 |
|---|---|---|
| 心跳 | Memoh / LangGraph background writes / 自维护 loops | 后台维护调度器，不占主响应链 |
| 灵魂 | Letta MemFS + versioned persona artifacts | 可版本化、可提案更新的人格工件 |
| 自我升级 | Letta 自维护 memory、CoALA procedural memory | 把经验提炼成 procedure / skill |
| 日记 | Letta memory files | agent-owned diary / logbook |
| 学习计划 | background memory formation + scoped tasks | agent self-learning queue |
| 记忆转 skill | CoALA procedural memory | skill crystallization pipeline |
| 自发自动化 | background scheduling | agent-owned automation lane |
| 归档/删除 | Zep temporal invalidation + Mem0 scopes | decay / archive / delete lifecycle |

## 6. 结论

外部优秀系统真正共同的经验，不是“上向量库”这么简单，而是：

1. 记忆一定分层。
2. 记忆一定分 owner。
3. 记忆一定分时态。
4. 记忆一定分热路径与后台路径。
5. 最终一定要把记忆变成服务能力，而不只是检索命中率。

对 Nion 来说，最值得追求的不是“最强 memory retrieval”，而是：

**最强的用户理解能力 + 最强的自我维护能力 + 最强的面向这个用户的服务能力演化。**
