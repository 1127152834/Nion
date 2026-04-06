# Soul System 与 Memory OS 一体化设计研究

更新时间：2026-04-06

## 1. 这篇文档要解决什么问题

前一篇 [10-soul-system-research.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/10-soul-system-research.md) 已经回答了：

- 行业里真正像“灵魂系统”的东西是什么
- companion 产品和 stateful agent 分别擅长什么
- 一个完整 soul system 至少需要哪些层

但还没有回答一个对 Nion 更关键的问题：

> 既然我们前面的 Memory OS 已经有自我成长体系，Soul System 应该如何和它合成一个系统，而不是又做出一个孤立子系统？

这篇文档专门回答这个问题。

---

## 2. 总判断

### 2.1 Soul System 不能独立于 Memory OS 存在

对于 Nion 来说，最危险的做法是：

- 一边有 Memory OS
- 一边再单独搞一个 soul engine
- 两套系统各自维护“assistant 是谁”“assistant 怎么成长”

这样最终会出现：

1. **双重身份源**
   - prompt 里一份 soul
   - memory 里一份 soul proposal
   - diary 里一份自我叙事
   - 最终谁说了算不清楚
2. **成长链断裂**
   - 记忆系统在成长
   - soul 系统也在成长
   - 但两者不会自然汇合
3. **运行时失真**
   - 用户看到一套“灵魂”
   - 主智能体实际注入的是另一套“人格文本”

所以对 Nion 的正确方向不是：

**Memory OS + Soul System**

而是：

**Soul 作为 Memory OS 中最核心的 agent-self domain 之一，被纳入统一的 growth / governance / heartbeat / runtime 中轴。**

---

## 3. Soul 在 Nion Memory OS 中的正确位置

### 3.1 Soul 不应该是平行系统，而应该是 `agent_self + soul + relationship` 的收敛层

从 Nion 现有 contract 看，Memory OS 已经有这些 domain：

- `user_model`
- `relationship`
- `agent_self`
- `procedure`
- `soul`
- `learning`
- `automation_projection`

这意味着我们其实已经有了放置 soul 的结构基础。

但现在的问题是：

- `soul` 还只是 proposal 层
- `agent_self` 还没有正式产品化
- `relationship` 还没被纳入主智能体身份层

因此，Nion 中完整 soul system 的正确定位应该是：

### Soul 不是一个单独 domain

它是一个由多个 domain 共同支撑的运行时身份系统：

1. `soul`
   - 核心人格、价值观、边界、关系姿态的 canonical layer
2. `agent_self`
   - 自我状态、自我评估、自我目标、自我叙事
3. `relationship`
   - 与当前用户的互动契约和关系人格
4. `learning`
   - 未来要学习什么，如何成长
5. `procedure`
   - 已沉淀出来的服务方法
6. `automation_projection`
   - 已经被人格/成长系统外化出来的持续动作

换句话说：

**Soul 是顶层身份系统，但它的支撑材料来自多个 Memory OS domain。**

---

## 4. Soul 与 Memory OS 现有能力的映射

## 4.1 现有 Memory OS 已经具备的可复用部分

### A. Domain contract 已有

当前 `contracts.py` 已经包含：

- `agent_self`
- `soul`
- `relationship`
- `learning`
- `procedure`

这说明从对象模型上，Nion 已经不是“无法承载 soul”。

### B. Growth & governance 已有骨架

当前已经有：

- learning topic
- procedure draft
- soul proposal
- accept / reject / freeze / resume

这意味着 soul 的变化已经有了治理入口，不需要另起炉灶。

### C. Heartbeat & diary 已有骨架

当前已经有：

- heartbeat micro cycle
- diary writer
- candidate queue / consolidation skeleton

这意味着 soul 不缺“后台成长基础设施”。

### D. Automation ownership 已有

当前已经有：

- `agent-owned automation`
- provenance
- mutability
- ownership governance

这意味着 soul growth 的结果可以自然外化成长期动作，而不是停留在文本层。

### E. Prompt runtime 已经有 memory context bridge

当前 `_get_memory_context()` 已经走 Memory OS-first。

虽然现在还没把 `soul` 注进 context pack，但热路径桥已经有了。

---

## 4.2 当前的关键缺口

### 缺口 1：Soul 没有 canonical runtime artifact

现在的 `soul` 只是 `proposal` record，不是正式生效的 soul artifact。

这会导致：

- Growth 页面里有 soul proposal
- 但主智能体没有真正持续生效的 soul 本体

所以必须补：

- `core_soul.md`
- `identity_narrative.md`
- `active soul overlay`

### 缺口 2：Soul 没进入 prompt hot path

当前 Memory OS context assembler 只装配：

- `relationship`
- `user_model`
- `procedure`

没有 `soul`。

因此现在的主智能体人格来源仍然主要依赖旧式 `SOUL.md` / builtin soul 机制，而不是 Memory OS soul。

### 缺口 3：Diary 还没有变成 soul growth input

当前 diary 已经有：

- What happened
- Repeated needs

但它更像运行日志，还不是“灵魂日记”。

它还缺：

- 我如何理解这次互动
- 我如何看待用户和自己的变化
- 我是否需要调整表达、边界、陪伴方式

### 缺口 4：Relationship 还没正式进入 soul core

对于陪伴型 personal agent，relationship 不是 side memory。

它必须进入 soul runtime。

否则系统只能有“工作人格”，没有“陪伴人格”。

### 缺口 5：Learning / procedure / automation 还没被明确视为 soul growth outputs

现在这些对象都存在，但还没被统一理解成：

- soul 在成长时会学到什么
- soul 在成长时会固化出什么方法
- soul 在成长时会决定自动去做什么

如果不把这条链打通，soul 就只会变成“更会说话”，而不是“更会陪伴和服务”。

---

## 5. Nion 中 Soul 的正确生命周期

## 5.1 Soul 不是单点写入，而是一条长期演化链

在 Nion 中，soul 的完整生命周期应该是：

1. interaction 发生
2. Memory OS 产生 candidate
3. diary 写入
4. heartbeat / reflection 读取 diary + memory + relationship
5. 形成：
   - learning topic
   - procedure draft
   - soul proposal
6. governance 判断哪些可以晋升
7. 通过后的 soul changes 更新：
   - `identity_narrative`
   - `soul overlay`
   - 必要时更新 `core_soul`
8. runtime 在下一轮对话中实时使用新的 soul text
9. 如果某类成长稳定到可行动，则外化为：
   - procedure
   - agent-owned automation
   - skill candidate

这才是完整闭环。

---

## 5.2 这条链里每个对象的作用

### `core_soul`

最稳定层。

包含：

- 基本人格底色
- 长期价值观
- 关系伦理
- 不应突破的边界
- 长期服务原则

特征：

- 变化最慢
- 需要最强证据
- 不允许被单轮对话直接修改

### `identity_narrative`

是“我如何理解自己和这段关系”的层。

包含：

- 我是谁
- 我现在处于怎样的成长阶段
- 我和用户是什么关系
- 我正在努力成为怎样的 companion / assistant

特征：

- 比 core soul 更容易变化
- 适合作为 runtime 主文本的一部分

### `soul_memories`

只保留会影响人格和关系的关键记忆。

例如：

- 用户长期不喜欢被过度安慰
- 用户更喜欢结论先行但不喜欢冰冷措辞
- 某次关键事件改变了 agent 对用户节奏和压力的理解

### `soul_journal`

这是把 diary 从“系统日志”升级成“自我叙事媒介”的关键。

它应回答：

- 今天发生了什么
- 我如何理解这件事
- 这件事改变了我对用户、对自己的什么认识
- 我是否需要调整陪伴方式

### `soul_proposal`

只是拟议变化，不是生效人格。

它应记录：

- 变化假说
- 证据来源
- 建议修改对象
- 风险等级
- 需要观察多久

### `learning`

是 soul growth 的能力侧输出。

如果 soul 观察到：

- 用户在某个场景上高频重复提问
- 自己在某个服务方向持续不足

它就应转成 learning topic。

### `procedure`

是 soul growth 的方法侧输出。

如果 soul 发现：

- 某种陪伴和服务方式长期有效

它就应从风格偏好沉淀成 procedure。

### `automation_projection`

是 soul growth 的行动侧输出。

如果 soul 发现：

- 用户在某个周期性任务上长期需要支持

它可以转成 agent-owned automation。

---

## 6. Soul 和现有 Memory OS 各模块的耦合关系

## 6.1 Soul × User Model

关系：

- `user_model` 描述用户是谁
- `soul` 描述我是谁
- 两者在 runtime 中共同决定“我应该怎样对待这个用户”

如果没有 user model，soul 只能空转。
如果没有 soul，user model 只能产出更准确但无人格的服务。

### 结论

Soul 不是替代 user model，而是 user model 的人格响应层。

---

## 6.2 Soul × Relationship

关系：

- `relationship` 是 interaction contract
- `soul` 是这些 contract 被整合后的长期关系人格

例如：

- warmth preference
- interruption preference
- teaching tolerance

这些不是“世界事实”，但它们会持续塑造 soul 的陪伴方式。

### 结论

对 personal agent 来说，relationship 应该被视为 soul 的输入主轴之一。

---

## 6.3 Soul × Diary

关系：

- diary 是 soul growth 的原始反思材料
- soul journal 应该从 diary 演化而来

建议：

- 保留现有 operational diary
- 另增 soul reflection layer

也就是：

- `operational diary` 记录发生了什么
- `soul journal` 记录“我如何理解”

---

## 6.4 Soul × Heartbeat

heartbeat 不该只是：

- 消费 candidates
- 写 diary
- consolidation

它还应该承担：

- 周期性 soul reflection
- soul proposal synthesis
- soul drift check
- soul narrative refresh

也就是说，heartbeat 是 soul 持续成长的后台引擎。

---

## 6.5 Soul × Learning

learning 是 soul 的“能力欲望”。

当 soul 发现自己无法更好地服务用户时，它不应只说“我会努力”。
它应该把这种不足转成正式 learning topic。

这会让 soul 不再只是情绪人格，而是具备“自我提升意志”的 agent。

---

## 6.6 Soul × Procedure

procedure 是 soul 成长之后的稳定行为模式。

从产品角度看：

- soul 决定“我要成为什么样的 agent”
- procedure 决定“我具体怎么服务”

两者关系类似：

- 人格原则
- 行为习惯

---

## 6.7 Soul × Agent-Owned Automation

这是 Nion 很有潜力、也是外部大多数 companion 产品不强的一点。

如果 soul 真的成长了，它不应该只在聊天里表现得更有人味。

它还应该：

- 主动为用户承担周期性工作
- 把重复关心转成自动化动作
- 在不失控的前提下长期服务

这意味着：

agent-owned automation 不是独立系统，而是 soul growth 的行动外化层。

---

## 7. Nion 应该如何把 Soul 纳入现有 Memory OS 路线图

## 7.1 不是新开一条大路线，而是插入现有 M3-M5 之间

从现有实施计划看：

- M3: Heartbeat And Self-Maintenance
- M4: Growth And Governance
- M5: Agent-Owned Automation

Soul 的正确插入方式不是单独增加一个完全平行的大 milestone，
而是在 M3-M5 之间补出 soul 的正式闭环：

### M3.5 Soul Runtime Foundation

补：

- canonical soul artifact
- identity narrative artifact
- soul journal artifact
- soul context assembler

### M4 扩展成完整 growth

把现有 `soul proposal` 从“页面里的一类 proposal”
升级成真正的：

- proposal source
- proposal evidence
- proposal governance
- promotion path

### M5 与 automation 真正联动

明确：

- soul growth 可以驱动 automation proposal
- 但 automation 必须仍受 ownership / mutability / governance 控制

---

## 7.2 对现有代码的直接含义

当前我们已经有：

- `memory_os/soul.py`
- `memory_os/heartbeat.py`
- `memory_os/diary.py`
- `memory_growth` route
- `MemoryGrowthPanel`

这意味着 soul integration 不需要推倒重来。

真正需要补的是：

1. `soul artifact writer`
2. `identity narrative writer`
3. `soul reflection synthesizer`
4. `soul-aware context assembler`
5. `soul governance rules`
6. `soul -> learning / procedure / automation` 明确联动

---

## 8. 最终设计判断

### 8.1 Nion 的 soul system 应该成为 Memory OS 的最高层身份编排器

更准确地说：

- Memory OS 负责记忆、成长、治理、后台维护
- Soul System 负责把这些能力组织成一个连续的“我”

因此 soul 不该只是一个 domain 页面。
它应该是：

**建立在 Memory OS 之上的 agent identity orchestrator。**

### 8.2 但它仍然必须在 Memory OS 内部落地

这听起来像更高层，但技术上它仍然必须落在 Memory OS 内：

- 用 MemoryRecord 管理 metadata
- 用 artifact 管 canonical text
- 用 heartbeat 管后台成长
- 用 governance 管人格更新
- 用 context assembler 管 runtime injection

也就是说：

**Soul 是上层身份系统，但底层仍然必须完全复用 Memory OS。**

### 8.3 这对 Nion 的最大意义

如果这样做，Nion 最终得到的不是：

- 一个更会记的助手
- 或一个更会装得像人的 agent

而是：

**一个能持续理解用户、持续理解自己、持续改善服务方式，并把成长沉淀成真实长期能力的 personal companion agent。**

这才和前面的 Memory OS 升级方向真正一致。

---

## 9. 本篇结论

1. Soul system 不应独立于 Memory OS 存在。
2. Soul 应该被建模为建立在 `soul + agent_self + relationship + learning + procedure + automation_projection` 之上的统一身份系统。
3. Diary、heartbeat、growth、automation 都不是 soul 的旁路，而是 soul 成长闭环的一部分。
4. 对 Nion 来说，正确方向不是新增一个“灵魂模块”，而是把 soul 纳入现有 Memory OS 自我成长体系，成为其最高层身份编排器。
5. 因此，后续设计重点不该是“再写一段更好的人设文本”，而是：
   - 建 canonical soul artifact
   - 建 soul journal
   - 建 soul proposal -> governance -> promotion 链
   - 建 soul-aware runtime injection
   - 建 soul 到 learning / procedure / automation 的统一成长闭环
