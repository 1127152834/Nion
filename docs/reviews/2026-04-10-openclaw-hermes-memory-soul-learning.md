# OpenClaw / Hermes Memory & Soul 学习记录与对 Nion 的漏洞对照

日期：2026-04-10
状态：Research note
目的：研究 `OpenClaw` 与 `Hermes Agent` 是如何处理「用户记忆 / 用户画像 / 助手人格」的，并据此反查 Nion 当前 Memory / Soul 的结构漏洞。

---

## 1. 为什么要做这份学习

最新用户反馈已经证明，当前系统虽然完成了 `A. 边界与合同重定义` 与 `B. 后端主链解耦`，也推进了 `C. 前端产品面收口`，但**并不等于真实可用**。

用户给出的例子非常基础，却直接暴露了系统的底层失真：

1. 用户明确告诉助手自己的名字。
2. 用户明确告诉助手双方称谓。
3. 开新线程后再问“我叫什么”，助手答不出来。
4. 称谓也没有被稳定执行。

这不是“小细节没做好”，而是说明系统最基础的用户身份记忆与称谓策略还没有真正成立。

因此这份学习不是为了“模仿别家的 UI”，而是为了回答三个更根本的问题：

1. 别的成熟 agent 系统怎样把“用户身份”和“助手人格”变成第一层能力，而不是靠运气召回？
2. 它们怎样区分长期稳定信息与临时会话信息？
3. 我们当前到底缺了什么，才会在“记住名字”和“保持称谓”这种问题上失败？

---

## 2. 研究对象与资料范围

本次只使用官方资料，不依赖二手解读。

### OpenClaw

核心资料：

1. Memory Overview  
   https://docs.openclaw.ai/concepts/memory
2. Memory Search  
   https://docs.openclaw.ai/concepts/memory-search
3. Active Memory  
   https://docs.openclaw.ai/concepts/active-memory
4. SOUL.md Personality Guide  
   https://docs.openclaw.ai/concepts/soul
5. Agent Bootstrapping  
   https://docs.openclaw.ai/start/bootstrapping

### Hermes Agent

核心资料：

1. Persistent Memory  
   https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
2. Personality & SOUL.md  
   https://hermes-agent.nousresearch.com/docs/user-guide/features/personality/
3. Use SOUL.md with Hermes  
   https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes/

---

## 3. OpenClaw 的做法

## 3.1 记忆不是隐式状态，而是明确的文件系统资产

OpenClaw 的第一原则很直接：

- 记忆写到磁盘上
- 记忆是否存在，以文件内容为准
- 没写进文件，就不算真正记住

它的长期记忆不是“模型脑内的模糊印象”，而是 workspace 中的明确文件：

- `MEMORY.md`
- `memory/YYYY-MM-DD.md`
- 可选的 `DREAMS.md`

这意味着记忆有一个非常强的工程特性：

- **是否存在可被检查**
- **是否稳定可被版本化**
- **是否可被工具检索**

这和“把用户某次说的话偶然提炼成 runtime hot memory”是完全不同的思路。

## 3.2 OpenClaw 把用户身份和人格在第一次运行时就显式建档

OpenClaw 的 bootstrapping 不是可有可无的装饰流程，而是第一次运行的正式准备阶段。

官方文档明确写到，首次运行时它会：

- seed `AGENTS.md`
- seed `BOOTSTRAP.md`
- seed `IDENTITY.md`
- seed `USER.md`
- 通过短问答 ritual 收集身份信息与偏好
- 把 identity + preferences 写进 `IDENTITY.md`、`USER.md`、`SOUL.md`

这个设计的重要意义在于：

- 用户是谁
- 用户希望如何被对待
- 助手应该以什么人格面对用户

这些都不是“后来猜出来”的，而是在系统生命周期一开始就变成正式资产。

对于“你叫什么”“我该怎么称呼你”“你该怎么叫我”这类能力，这种设计天然更稳。

## 3.3 OpenClaw 的 `SOUL.md` 是会话级高优先级人格层

OpenClaw 对 `SOUL.md` 的定义非常明确：

- 这是 voice lives 的地方
- 正常 session 会注入
- 它决定 tone / opinions / brevity / humor / boundaries / bluntness

也就是说，`SOUL.md` 不是一个后台说明文件，而是 prompt 里的高优先级人格层。

它有几个非常重要的边界：

- 只放 voice / stance / style
- 不放项目路径、端口、repo workflow
- 不把人格和工程说明混在一起

这让 OpenClaw 的人格层具备两种能力：

1. **稳定**：每轮 session 都会带着它开始
2. **纯粹**：人格文件不被项目说明和一时上下文污染

## 3.4 OpenClaw 不是只靠“主 agent 想起来才搜记忆”

OpenClaw 有两条和记忆相关的能力：

1. `memory_search` / `memory_get`
2. `active-memory`

其中第二条很关键。

官方文档对 `active-memory` 的定位是：

- 它是一个阻塞式 memory sub-agent
- 在主回复之前运行
- 给系统一次“先把相关记忆提上来”的机会

也就是说，OpenClaw 不把“记忆何时被用到”完全交给主 agent 的临场发挥。

它承认一个现实：

- 大多数系统的 memory 能力是有的
- 但它们太被动
- 要么等用户说“记住”
- 要么等主 agent 主动想起去搜
- 那样往往已经错过了让回答自然的时机

这正是我们当前问题的关键对照点。

## 3.5 OpenClaw 的长期记忆和搜索记忆是两层，不是混成一团

OpenClaw 的结构大致是：

- `MEMORY.md`：长期稳定记忆
- 日记式 notes：近期上下文
- `memory_search`：跨这些层做 hybrid retrieval
- `active-memory`：必要时在回答前主动预取

这意味着它不是只有一个“记忆仓库”，而是：

1. 稳定长期层
2. 近期积累层
3. 检索层
4. 主动预取层

这套分层对“名字/称谓/偏好”特别有效，因为：

- 用户名和称谓属于长期稳定用户信息
- 不该只在 query 命中时才被想起来
- 更不该只在最近线程里才短暂存在

---

## 4. Hermes Agent 的做法

## 4.1 Hermes 明确把 `USER.md` 和 `MEMORY.md` 分成两本账

Hermes 的官方文档比 OpenClaw 还要直白：

它的持久记忆由两份文件组成：

- `MEMORY.md`
- `USER.md`

并且职责明确分开：

### `MEMORY.md`

记录：

- 环境事实
- 项目约定
- 工具怪癖
- 学到的技巧

### `USER.md`

记录：

- 名字
- 角色
- 时区
- 沟通偏好
- 讨厌什么
- 工作习惯
- 技能水平

这点对我们特别重要。

因为用户“叫什么”“你该怎么称呼我”“我喜欢什么语气”，在 Hermes 里不是零散地散落在不同 domain，而是明确属于 `USER.md` 这一层。

## 4.2 Hermes 的用户画像是 session start 冻结快照，而不是临时召回

Hermes 官方文档有一个核心设计：

- `MEMORY.md` 和 `USER.md` 会在每个 session 开始时从磁盘加载
- 渲染成 system prompt 中的 frozen block
- 本轮 session 中不再变化

这个设计的含义非常强：

1. 用户身份和偏好不是“有问题时再查”
2. 它们是 session 的默认上下文
3. 这一轮会话开始时就稳定存在

这对“用户名字”和“互相称谓”这种信息尤其关键，因为：

- 它们不该依赖 query wording
- 不该依赖搜索命中
- 不该依赖主 agent 有没有想起来

只要新会话开始，它们就应该已经在 prompt 里。

## 4.3 Hermes 的 `SOUL.md` 是第一槽位身份，而不是后置补丁

Hermes 文档里写得非常明确：

- `SOUL.md` 是 primary identity
- 它处于 system prompt 的 slot #1
- 如果存在，它直接替代内建默认人格
- `/personality` 只是 session 级 overlay

这意味着 Hermes 的人格系统有清晰的分层：

1. `SOUL.md`：长期、稳定、实例级基线人格
2. `/personality`：临时模式切换
3. `AGENTS.md`：项目/仓库级规则

这三个层各管各的，不混。

而且 Hermes 明确强调：

- `SOUL.md` 只放身份、语气、风格、默认互动方式
- `AGENTS.md` 才放 repo-specific instruction

这让“人格”和“任务规则”之间边界非常稳。

## 4.4 Hermes 的 memory tool 允许 agent 主动维护用户画像

Hermes 的 `memory` tool 不是只读工具，它支持：

- add
- replace
- remove

而且目标分两个：

- `memory`
- `user`

这意味着 agent 在理解到“这是用户长期画像”时，可以显式写进 `user`，而不是只能模糊地塞进统一 memory。

对于你这次举的例子，这种结构天然更合理：

- “我叫张天成” 应进入 `user`
- “你叫我大哥，我叫你小老弟” 也应进入 `user` 或明确的 user-addressing profile

而不是：

- 名字丢在某条 user_model 摘要里
- 称谓丢在 relationship 里
- 最后新线程只能想起一半

## 4.5 Hermes 的持久记忆有容量约束，但这反而逼它把用户画像写得更紧凑、更稳定

Hermes 对两个记忆文件都设定了比较小的字符上限。

这不是弱点，反而带来一个很实际的好处：

- 系统被迫把“真正长期重要的信息”写得简洁、可用、可维护

也就是说，它更像：

- 一份稳定用户画像
- 一份稳定环境 / agent 笔记

而不是无限堆叠的“可能以后会用到的信息堆”。

---

## 5. OpenClaw 与 Hermes 的共同模式

虽然实现细节不同，但它们对 Memory / Soul 的共识其实非常一致。

## 5.1 用户身份是第一类资产，不是普通可选记忆

无论是 OpenClaw 的 `USER.md` / bootstrapping，还是 Hermes 的 `USER.md`，它们都在强调一件事：

- 用户是谁
- 用户希望怎样被称呼
- 用户偏好什么风格

这些必须进入**显式用户画像层**。

而不是：

- 等主 agent 临时检索
- 或埋在 generic memory list 里碰运气

## 5.2 人格基线是 durable baseline，不是近期记忆的衍生物

OpenClaw 用 `SOUL.md`。
Hermes 也用 `SOUL.md`。

共同点：

- 都是长期基线人格
- 都在高优先级 prompt 层
- 都不是由近期 needs 自动推导出来的

这和“根据 repeated needs 逐步把人格漂移出来”的系统思路差异非常大。

## 5.3 会话启动时必须拥有稳定画像快照

Hermes 明确采用 frozen snapshot。
OpenClaw 通过 `MEMORY.md` / `USER.md` / `SOUL.md` 常驻文件 + session 注入，效果上是一样的：

- **新线程开始时，关键身份信息已经在场**

不是：

- 新线程开始后，再看 query 要不要搜索

## 5.4 记忆检索是补充，不是基础身份信息的唯一来源

两者都支持 search。

但 search 的作用是：

- 找补充上下文
- 找更细的历史细节
- 找近期对话或环境笔记

而不是承担最基本的：

- 用户名字
- 用户偏好
- 用户称谓
- 助手人格基线

## 5.5 长期用户画像和关系称谓应该同属稳定层，而不是拆散到多个逻辑域

你这次给的例子恰好说明这点：

- “张天成”是身份
- “大哥 / 小老弟”是互相称谓
- 它们在用户感知里是一次设置动作

如果系统把这两部分拆进不同域：

- 一部分写到 `relationship`
- 一部分根本没提取
- 一部分只有 query 命中才召回

就非常容易出现“只记住称谓，不记住名字”这种半残废状态。

---

## 6. 对 Nion 的漏洞与不足

下面是基于上面两套系统，对我们当前 Nion 的直接对照结论。

## 6.1 我们缺少“稳定用户画像常驻注入层”

这是当前最严重的问题。

目前 Nion runtime 的 `RuntimeMemorySections` 只有：

- `core_identity`
- `speech_style`
- `values_and_boundaries`
- `relationship_stance`
- `adaptive_overlay`
- `hot_memories`
- `relevant_procedures`
- `scoped_recall`
- `verbatim_evidence`

问题在于：

- 没有一个明确的 `user_profile_baseline` 或 `always_on_user_facts` 段
- 用户名字、称谓、长期偏好并不保证在每个新线程启动时就已经进入 prompt

这和 Hermes 的 `USER.md frozen snapshot`、OpenClaw 的 `USER.md + MEMORY.md 常驻注入` 是根本差异。

**直接后果：**

- 新线程里，最关键的用户身份信息要靠检索命中
- 一旦命不中，就像没记住一样

## 6.2 我们的提取器根本没有把“用户名字”当成正式记忆类型

`backend/packages/harness/nion/memory/extraction/service.py` 当前只提取：

- explicit preference
- work context
- address style
- initiative boundary
- learning topic hint

这里没有：

- 用户自我介绍
- 用户姓名
- 用户角色身份（通用）
- 用户与助手互相称谓的双向绑定

这意味着对话里就算出现：

- “我叫张天成”

系统也**没有正式提取路径**把它写成稳定用户画像。

这不是召回差，而是**根本没入库**。

## 6.3 我们把“名字”和“称谓”拆散到了不同逻辑域

当前提取器里：

- “叫我 xxx” 会进入 `relationship.address_style`
- 但“我叫张天成” 没有对应提取器

所以系统很容易出现：

- 记住了怎么叫用户
- 却没记住用户叫什么

这正是你截图里发生的事情。

这说明我们当前的用户身份建模不是“用户画像”，而只是“零散偏好信号”。

## 6.4 我们的运行时召回对中文自然提问非常脆弱

`_collect_matching_summaries()` 的命中逻辑本质上是：

1. query 整串直接出现在 summary 里
2. 或按空格分词后的 token 命中 summary

这对英文还凑合，对中文自然问句非常脆弱。

例如：

- 用户存的是“姓名：张天成”
- 新线程问的是“你知道我叫啥不”

这个 query：

- 没有空格
- 也不会直接是 summary 的子串

结果就是：

- recall 很可能返回空

但称谓相关信息之所以能被想起来，是因为 `relationship_stance` 被稳定注入了，不依赖 query 命中。

这再次说明：

- 用户名字这种基础信息不该只放在 query-conditioned recall 里

## 6.5 我们缺少“session-start 用户画像冻结快照”机制

Hermes 和 OpenClaw 的共同点是：

- 新会话开始前，就把稳定用户画像装进 prompt

而我们目前更像：

- 先起会话
- 再按 query 做 recall plan

这就导致“基础用户信息”被降级成了“检索候选”，不是“默认上下文”。

这在体验上会非常伤：

- 用户越觉得这是长期关系
- 对“你应该知道我是谁”越敏感

一旦答不出来，系统信任感就直接崩。

## 6.6 我们的验收题库没有覆盖最基础的名字 / 称谓跨线程回忆

`docs/test/10-memory-soul/behavioral-acceptance-questions.md` 里有：

- 工作信息记忆
- 风格偏好记忆
- Soul 基线
- 回答方式调教

但缺少最关键的一组题：

- “我叫张天成”
- “以后你叫我大哥，我叫你小老弟”
- 新线程回查：
  - “我叫什么？”
  - “你应该怎么叫我？”
  - “我应该怎么叫你？”

这意味着系统可能通过了“风格偏好记忆”验收，却仍然在最基础的人际身份记忆上失败。

这是明显的行为验收缺口。

## 6.7 我们把 Soul 修成了独立模块，但还没有把“用户称谓策略”与“稳定用户画像”真正统一

当前我们已经做对了很多边界：

- Soul 独立于 Memory
- stable soul 不再被自动乱改

但这不等于“用户与助手之间的稳定称谓关系”已经成为一等公民。

现在看起来仍像：

- Soul 管助手人格
- relationship 管部分称呼
- user_model 管部分画像

可用户的实际体验并不是按这三个概念拆开的。

用户会把下面这些看成一个整体：

- 我是谁
- 你是谁
- 我们互相怎么叫
- 你应该用什么语气和我说话

如果系统内部把它们拆得过细，却没有一个真正统一的“用户关系画像基线”，体验就会碎。

---

## 7. 这次用户问题的最可能根因

基于当前代码与外部系统对照，我认为这次“名字没记住、称谓没稳定”最可能由 4 个原因叠加造成：

1. **名字根本没有被 extractor 提取**
   - 当前 extraction service 没有 name/self-identification proposal

2. **称谓进入了 relationship，但名字没有进入稳定 user profile**
   - 导致两者状态不对齐

3. **新线程时基础用户画像不是 always-on**
   - 要靠 query recall 命中

4. **中文 query recall 对自然问法过脆**
   - “你知道我叫啥不” 很难命中结构化 summary

所以这不是一个单点 bug，而是：

**用户身份记忆层还没有被当成正式系统层来设计。**

---

## 8. 我们下一步应该怎么检查 Nion

基于这次学习，我建议下一轮不要再笼统说“检查 Memory/Soul 是否可用”，而要专门检查下面 5 件事：

### 8.1 用户身份提取层

要检查：

- 是否存在正式的 `name / role / alias / mutual naming` 提取器
- 它们是否进入稳定用户画像

### 8.2 稳定用户画像注入层

要检查：

- 新线程启动时，用户名字、称谓、风格偏好是否默认在 prompt 中
- 还是仍然依赖 recall 命中

### 8.3 中文 recall 召回层

要检查：

- 中文自然问句是否能命中相关 memory
- 是否需要专门的 query rewrite / alias mapping / structured identity retrieval

### 8.4 用户关系画像统一层

要检查：

- 名字
- 称谓
- 回答风格
- 关系基调

这些是否属于同一个稳定关系画像，而不是散落在多个域里。

### 8.5 行为验收题库

必须新增最基本的跨线程身份题：

- 用户名字回忆
- 双向称谓回忆
- 名字 + 称谓 + 风格的联合一致性

---

## 9. 结论

OpenClaw 和 Hermes 在实现风格上不同，但它们在 Memory / Soul 上有一条共同原则：

> **用户身份、用户偏好、助手人格，必须是显式、稳定、会话开始即在场的一等资产，而不是依赖临时 recall 才偶然被想起来的次级信息。**

而 Nion 当前最明显的缺口正是这里。

我们虽然已经完成了：

- 边界收口
- 后端主链修正
- 前端产品面收口

但在“用户身份记忆层”上，系统仍然没有真正长出来。

所以接下来的检查重点不该再是泛泛的“Memory / Soul 有没有页面、有没有 API”，而应该是：

1. 用户名字是否被正式提取
2. 用户称谓是否与身份统一持久化
3. 新线程启动时这些信息是否 always-on
4. 中文自然问法是否还能可靠召回

如果这 4 件事不成立，那么系统在用户看来就仍然是不可靠的。

---

## 10. 参考链接

### OpenClaw

1. Memory Overview  
   https://docs.openclaw.ai/concepts/memory
2. Memory Search  
   https://docs.openclaw.ai/concepts/memory-search
3. Active Memory  
   https://docs.openclaw.ai/concepts/active-memory
4. SOUL.md Personality Guide  
   https://docs.openclaw.ai/concepts/soul
5. Agent Bootstrapping  
   https://docs.openclaw.ai/start/bootstrapping

### Hermes Agent

1. Persistent Memory  
   https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
2. Personality & SOUL.md  
   https://hermes-agent.nousresearch.com/docs/user-guide/features/personality/
3. Use SOUL.md with Hermes  
   https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes/
