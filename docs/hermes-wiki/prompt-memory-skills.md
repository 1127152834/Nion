# Prompt, Memory, Skills

最后更新：2026-04-15

## 1. Hermes 最重要的设计之一：Prompt Assembly

Hermes 官方把 Prompt Assembly 单独拿出来讲，这本身就说明它不是把 prompt 当一整段字符串处理。  
从 README、官方搜索摘要和社区复盘可得出一致判断：

1. prompt 是分层装配的
2. 分层的目的之一是 prompt caching
3. 分层的目的之二是职责分离
4. 分层的目的之三是把稳定上下文和动态上下文拆开

社区材料经常总结成类似下面的层次：

1. `SOUL.md`
2. system prompt
3. session state
4. context / recalled materials
5. recent turns
6. current user message

其中需要注意的是：  
这可以作为高置信模型图景，但具体层序和每层注入时机，后续仍最好回到源码进一步核验。

## 2. 为什么这个分层比“大 system prompt”强得多

因为它同时解决了四个问题：

1. **缓存问题**：稳定层不频繁变动，更容易吃到 provider 的 prompt cache
2. **成本问题**：不必每轮把所有历史和说明重发
3. **语义问题**：人格、规则、动态状态、外部上下文不再混层
4. **调试问题**：当回答失真时，知道是哪个层级出问题

这是 Hermes 非常成熟的一点：  
它不是只问“模型读到了什么”，而是问“什么信息应该放在哪一层、什么时候注入、多久变化一次”。

## 3. Memory：Hermes 的核心不是“多存一点”，而是“分账”

Hermes 的 memory 至少由这几层组成：

1. `MEMORY.md`
2. `USER.md`
3. session database / FTS5 searchable history
4. Honcho 用户建模
5. skills 作为 procedural memory

这套结构背后的思想非常值得学：

### `MEMORY.md`

记录稳定的环境事实、工作流知识、项目约定、工具怪癖。  
这更像 agent 对“世界”的长期工作记忆。

### `USER.md`

记录用户是谁、怎么交流、偏好什么、反感什么、工作方式如何。  
这更像 agent 对“你”的稳定认识。

### Session DB

记录发生过什么。  
这不是永久塞入 prompt，而是在必要时通过搜索召回。

### Honcho

README 和社区材料都说明 Hermes 集成了 Honcho。  
这意味着 Hermes 并不满足于“写两个 markdown 文件”，它还试图建立更高阶的用户模型。

## 4. 关键哲学：稳定记忆默认存在，历史记忆按需召回

Hermes 的 memory 设计明显在避免两种极端：

### 极端一：完全不持久化

这会导致每个新 session 都从零开始，用户身份和工作上下文需要不断重说。

### 极端二：把全部历史常驻塞进上下文

这会导致 token 爆炸、缓存失效、污染当前任务焦点。

Hermes 采取的是中间道路：

1. 稳定且重要的东西进入 `MEMORY.md` / `USER.md`
2. 过去发生过什么保存在 sessions 中
3. 需要时再检索出来

这其实是在说：

> agent 需要“默认知道”的东西很少，但必须稳；  
> agent 需要“必要时能想起”的东西很多，但不该常驻。

## 5. Skills：Hermes 真正的学习闭环

Hermes README 对 learning loop 的定义里，skills 占非常中心的位置：

- creates skills from experience
- improves them during use
- agentskills.io compatible

这说明 skills 在 Hermes 里不是“插件商店里的功能块”，而是把重复成功的工作流提炼成可复用流程的机制。

### 为什么这比单纯记忆更重要

记忆只能让 agent “知道某件事曾发生过”。  
skill 则能让 agent “知道以后遇到类似问题该怎么做”。

也就是说：

- memory 更偏 declarative knowledge
- skill 更偏 procedural knowledge

Hermes 的强点就在于它同时拥有这两层，而不是只做一层。

## 6. Context Files：Hermes 把环境注入也做成显式机制

README 和文档索引都强调 `AGENTS.md`、`SOUL.md`、workspace context files。  
这说明 Hermes 认同一个现实：

一个 agent 要想在真实项目里长期工作，仅靠“通用能力”不够，它必须读取环境约束。

但更重要的是它把这些环境文件变成显式层，而不是隐性约定。  
这让 agent 的行为边界更可检查、更可调试。

## 7. 我对 Hermes 在这一层的总判断

Hermes 在 prompt、memory、skills 这三件事上最深的设计思想是：

1. 不让单一结构承担所有知识语义
2. 让稳定信息和临时信息分流
3. 让经验既能被“记住”，也能被“程序化”
4. 让上下文注入本身成为可治理的系统

这比“做一个更长的 prompt”和“加一个向量库”高明得多。

## 8. 对 Nion 的启发

如果以后在 Nion 里继续演进 memory / soul / user identity，最该借鉴的不是某个字段设计，而是这几个原则：

1. `USER` 和 `MEMORY` 必须严格分账。
2. 用户画像不能只靠检索命中，必须有默认存在层。
3. 历史会话不应该直接兼任长期记忆。
4. 技能和工具说明要被视为 procedural memory，而不是纯工具清单。
5. prompt assembly 需要明确层次，不要让人格、规则、项目约束、动态状态混在一个大块里。
