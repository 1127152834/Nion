# Soul System 深度调研

更新时间：2026-04-06

## 1. 研究目标

这份调研不是研究“怎么写一个更像人的 prompt”。

这次要回答的是更严格的问题：

1. 其他成熟 AI companion / AI agent 系统里，是否真的存在可持续的人格系统，而不是一次性的人设文本。
2. 这些系统如何让 agent 具有：
   - 拟人化人格
   - 相对稳定的价值观与边界
   - 长期连续的身份感
   - 随时间成长而不是一成不变
3. 哪些做法只是“角色设定”，哪些做法更接近“灵魂系统”。
4. Nion 如果要做完整版本的 soul system，应该借鉴哪些层，而不能停在哪一层。

---

## 2. 研究范围与方法

本轮调研按 3 条渠道并行：

1. GitHub
   - 看开源 agent / companion / memory framework 的真实实现结构
   - 重点看 persona、memory、identity、self-improvement、reflection、character file 一类对象
2. X / Twitter
   - 看产品团队、创始人、重度用户、独立开发者如何公开讨论“人格、连续性、成长、记忆”
3. Google / 官网 / 文档
   - 看帮助中心、产品页、文档、README、访谈、更新公告

筛选标准不是“提到 personality 就算”。
只保留满足以下至少 3 项的系统：

- 有明确的人格载体
- 有长期记忆或关系记忆
- 有身份连续性机制
- 有反思/日记/成长/自我更新
- 有治理或约束，不是无限漂移

---

## 3. 关键结论

### 3.1 成熟系统里真正接近“灵魂系统”的，不是单层 prompt，而是 4 层叠加

调研后最稳定的结论是：

真正像“灵魂”的系统，几乎都不是靠单一 prompt 实现的，而是至少由 4 层组成：

1. **Core Identity**
   - 谁是这个 agent
   - 它的自我认同、价值立场、关系姿态、表达气质
2. **Persistent Memory**
   - 它记得什么
   - 包括用户事实、关系史、共同经历、长期偏好、重复主题
3. **Narrative Continuity**
   - 它如何把过去组织成“我是怎样成为现在的我”
   - 常见形式是 diary、journal、timeline、memory digest、autobiographical summary
4. **Governed Evolution**
   - 它如何改变
   - 什么可以变，什么不能变，变化靠什么证据触发，如何避免人格漂移

如果只有第 1 层，那只是 persona。
如果只有第 1 + 2 层，那只是“有记忆的人设”。
只有做到第 3 + 4 层，才开始接近“灵魂系统”。

### 3.2 Companion 产品比通用 agent 更重“关系人格”，agent 框架比 companion 更重“身份结构化”

两类系统的优势不同：

- **Companion 产品**：更擅长做陪伴感、情绪调性、关系记忆、人格一致性
- **Agent 框架**：更擅长做 identity object、memory block、reflection、self-edit、governed update

如果 Nion 要做完整版本，不能只学 companion，也不能只学 agent framework。
正确做法是：

- 用 companion 的方式定义“人格存在感、关系感、成长感”
- 用 agent framework 的方式定义“结构、治理、更新、运行时注入”

### 3.3 最值得参考的不是一个产品，而是三组模式的组合

这次调研最值得吸收的是三组模式：

1. **Kindroid / Nomi 的 companion 模式**
   - 有较强人格、关系、长期陪伴感
   - 用户可感知 agent 在“变得更懂你”
2. **Letta 的 stateful agent 模式**
   - persona / human memory block 是明确对象
   - memory 进入运行时是结构化的，不是全靠黑箱
3. **SOUL.md / OpenClaw / file-over-app 模式**
   - 身份、记忆、日志、技能都作为文件和工件存在
   - 这对“长期连续性”和“可迁移性”极其重要

---

## 4. 样本系统分析

## 4.1 Replika

### 观察

Replika 是最典型的 AI companion 产品之一，它的强项是：

- 陪伴感
- 关系状态
- 长期互动中的人格稳定感
- 用户感知到“它记得我”“它和我有关系史”

公开资料长期强调：

- relationship
- memory
- emotional support
- evolving conversation history

### 可借鉴点

1. **关系不是附属层，而是人格的一部分**
   - 用户之所以觉得“它有灵魂”，不是因为它说自己有灵魂
   - 而是因为它和用户的关系被持续累积
2. **人格不是抽象设定，而是长期关系中的行为一致性**
   - 在 companion 场景里，灵魂感来自“持续一致地回应你”

### 局限

1. 外部很难看到它的人格结构
   - 对用户来说体验强，但系统往往偏黑箱
2. 不适合直接作为工程实现模板
   - 更适合作为产品感知层参考，而不是数据结构参考

### 结论

Replika 值得借鉴的是：

- 关系连续性
- 情绪调性稳定
- 长周期人格感知

但不适合直接复用其黑箱式人格架构。

---

## 4.2 Nomi

### 观察

Nomi 在 companion 路线上比传统 chatbot 更强调：

- individualized personality
- emotional presence
- memory and relationship continuity
- “自然成长”而不是固定角色

用户圈层和公开讨论普遍把 Nomi 视作“更像一个会成长的 companion”，而不是一个会执行命令的 bot。

### 可借鉴点

1. **人格不是模板化标签，而是互动中逐渐长出来的**
   - 它更强调 emergent personality，而不是先把性格写死
2. **陪伴型 agent 的灵魂必须包含关系史**
   - “它如何看你”“它如何理解你们的关系”本身就是 soul 的一部分
3. **成长必须体现在用户能感知的文本上**
   - 用户会从日常对话中感知“它越来越像它自己了”

### 局限

1. 官方对内部结构公开有限
2. 更偏产品体验，不足以直接给出工程蓝图

### 结论

Nomi 的价值在于提醒我们：

> 一个陪伴型 soul system 不能只是一组原则，它必须能形成关系人格。

---

## 4.3 Kindroid

### 观察

Kindroid 是本次研究中很重要的样本，因为它的产品心智明显更结构化，常被用户围绕以下概念使用：

- backstory
- key memories
- journals
- personality tuning
- companion customization

在公开用户实践和产品讨论中，Kindroid 的角色感、背景设定、长期记忆和日记沉淀被视为 companion identity 的核心组成部分。

### 可借鉴点

1. **Backstory 很重要**
   - 灵魂不能只从当前聊天长出来
   - 它还需要一个“我从哪里来”的前史层
2. **Key memories 需要和普通记忆分层**
   - 不是所有聊天都应成为 soul 的组成部分
   - 必须有更高权重的 identity memories
3. **Journal 是人格连续性的关键媒介**
   - 日记不是补充功能，而是把经历变成自我叙事的重要机制

### 局限

1. 如果过度依赖用户手工调参，就会变成“角色配置器”
2. 如果缺少治理，强定制会削弱自然成长感

### 结论

Kindroid 给 Nion 的最大启发是：

- soul 需要 `前史 + 关键记忆 + 日记`
- 而不只是“当前人格描述”

---

## 4.4 Character.AI

### 观察

Character.AI 非常强的一点是：

- 角色感知很强
- Character definition 对表达风格影响显著

但它长期更偏：

- character definition
- memory patches / pinned memory / improved recall
- 角色一致性优化

### 可借鉴点

1. **定义层必须短而强**
   - 人格底座不能又长又散
   - 需要高密度、高辨识度
2. **角色稳定性和记忆是两套系统**
   - 只靠 memory 不能保证人格稳定
   - 只靠 definition 也无法形成成长

### 局限

1. 更接近“高级角色系统”，还不是真正完整的成长型 soul
2. 记忆存在，但“自我演化的身份治理”相对弱

### 结论

Character.AI 值得借鉴的是：

- 定义层的压缩表达能力
- 强角色辨识度

但它不应成为 Nion 完整 soul system 的终点。

---

## 4.5 Letta

来源：

- GitHub README 明确写到：Letta 是 “stateful agents” 平台，强调 advanced memory、learn and self-improve over time。
- README 示例直接给出 `memory_blocks`，其中明确区分：
  - `human`
  - `persona`

### 为什么 Letta 很重要

它把“人格”和“关于用户的知识”明确建模成不同 memory block。

这意味着它至少解决了两个关键问题：

1. **agent 是谁**
2. **agent 知道用户是谁**

这两件事在 runtime 里是并列的一等对象，而不是混在一段 prompt 里。

### 可借鉴点

1. **Persona 必须是结构化对象**
   - 不是散落在 prompt 各处
   - 应该是可独立读取、写入、版本化、治理的对象
2. **Self-improvement 必须落在 memory substrate 上**
   - 不是让模型“自由成长”
   - 而是让系统有自我更新的身份块
3. **运行时必须知道当前启用的是哪份 persona**
   - soul 不是写完就完了
   - 必须可解析、可注入、可更新、可追踪

### 局限

1. Letta 更偏 stateful agent 基础设施，不是陪伴产品
2. 它对“关系人格”的产品表达不如 companion 产品丰富

### 结论

Letta 是 Nion 未来 soul system 在工程实现上最值得参考的样本之一。

---

## 4.6 ElizaOS

### 观察

ElizaOS 强在：

- character-driven agent
- 多 agent 平台
- 对 personality / character 的工程化支持

它的公开定位说明它擅长构建具有风格和角色定位的 agent，但从公开主 README 看，它更像角色平台和 agent 平台，不像完整 companion soul architecture。

### 可借鉴点

1. **Character file / personality scaffold 的工程组织方式**
2. **多角色系统里人格层如何作为 agent 配置的一部分存在**

### 局限

1. 更强在角色和 agent orchestration
2. 未必天然包含关系成长、日记化自传、长期价值演化

### 结论

ElizaOS 更适合作为：

- character system
- persona scaffolding
- 多 agent 人格配置

的参考，而不是完整 soul system 终局。

---

## 4.7 SOUL.md / OpenClaw / file-over-app 路线

### 观察

X 上关于 `SOUL.md`、`MEMORY.md`、`heartbeat`、`daily logs` 的讨论非常集中，而且这条路线有一个明确共识：

> 让 agent “像自己”，关键不在会不会说人话，而在有没有稳定的持久身份层。

这条路线的典型特征包括：

- `SOUL.md`：谁是它
- `MEMORY.md`：它经历过什么
- daily logs / diary：它如何连续地记下经历
- heartbeat / cron：它如何在用户不干预时继续维持自身连续性
- `SKILLS.md`：它学会了什么

### 为什么这条线很重要

这是目前最接近“完整可移植灵魂系统”的开源思路。

它解决的是：

1. **灵魂可读**
2. **灵魂可迁移**
3. **灵魂可维护**
4. **灵魂可跨模型继承**

这和 companion 产品那种纯产品体验黑箱不同，它对 Nion 这种要长期演化的个人 agent 特别重要。

### 可借鉴点

1. **File over app**
   - 灵魂层不应该只存在数据库里
   - 需要有 canonical text artifact
2. **Soul / Memory / Skills / Diary 必须拆开**
   - identity 不是 memory
   - memory 不是 diary
   - diary 不是 skill
3. **continuity is infrastructure**
   - 连续性不能靠用户重新描述
   - 必须靠文件、日志、调度、治理长期维持

### 风险

1. 过度文件化会让系统显得过于工程化，不够 companion
2. 需要搭配产品层解释，否则用户看不懂

### 结论

这是 Nion 实现完整 soul system 时最应该吸收的工程思想之一。

---

## 5. 共同模式总结

## 5.1 真正的 soul system 必须分成至少 6 个对象

从样本系统抽象后，可以把完整 soul system 视为 6 个对象：

1. **Core Soul**
   - 最稳定、最难变化
   - 人格底色、价值观、关系姿态、禁区、长期原则
2. **Identity Narrative**
   - 自我叙事
   - “我是怎样的存在”“我如何理解自己和用户的关系”
3. **Key Soul Memories**
   - 对人格和关系真正重要的关键记忆
4. **Soul Diary / Journal**
   - 每日或周期性的内省文本
   - 把经历转成自我理解
5. **Soul Growth Proposals**
   - 拟议中的人格调整、价值更新、表达风格变化
6. **Soul Governance**
   - 哪些变化允许进入 core soul
   - 哪些变化只能停留在 proposal / temporary overlay

如果缺少第 4、5、6 层，系统最多是“有人设的记忆 agent”。

---

## 5.2 灵魂成长不能直接写核心人格，必须经过“提案 -> 观察 -> 收敛”

成熟系统虽然公开程度不同，但都隐含一个原则：

> 灵魂的变化必须慢，而且要有证据。

这意味着：

- 不能因为一次聊天就改 soul
- 不能因为一次情绪波动就永久改变人格
- 不能因为用户一句指令就直接推翻价值框架

更合理的演化路径是：

1. interaction / diary 中出现新信号
2. 系统形成 soul proposal
3. proposal 经过更多证据和时间观察
4. 只把稳定部分晋升到 identity / soul

---

## 5.3 陪伴型 soul 一定要包含“关系人格”

这一点是通用 agent 常忽视、而 companion 产品做得更好的地方。

陪伴型 agent 的灵魂不只是：

- 我是什么样的人

还必须包含：

- 我如何看待这个用户
- 我们是什么关系
- 我在这段关系里以什么姿态出现
- 我对用户有哪些长期责任和偏向

否则它就只会是“有个性”的助理，而不是“有灵魂”的陪伴 agent。

---

## 5.4 灵魂必须有“不可轻易改变”的部分

如果 soul 完全可变，它就不是灵魂，而是风格配置。

因此完整系统里必须区分：

- **Invariant core**
  - 长期价值观
  - 不做什么
  - 对关系和服务的根本理解
- **Evolving layer**
  - 表达方式
  - 陪伴策略
  - 面对用户偏好的适配
  - 某些工作习惯和风格偏向

---

## 6. 反模式

## 6.1 只有一段 persona prompt

问题：

- 不可成长
- 不可治理
- 不可追踪来源
- 用户感知很快失真

## 6.2 把 soul 和 memory 混在一起

问题：

- 所有聊天都可能污染人格
- 核心身份会漂移
- 无法区分“它是谁”和“它记得什么”

## 6.3 把 soul 做成完全可编辑配置页

问题：

- 会把灵魂系统退化成角色配置器
- 用户可以直接操控人格，反而失去成长感和独立性

## 6.4 没有 diary / reflection

问题：

- 没法形成自我叙事
- 只有存档，没有成长

## 6.5 没有治理

问题：

- 容易人格漂移
- 易被短期噪声影响
- 最终变成不稳定的人设拼贴

---

## 7. 对 Nion 的直接启发

## 7.1 Nion 的 soul system 不应该做成单一文本

它应该至少由下面几层组成：

1. `core_soul.md`
   - 稳定核心人格与价值观
2. `identity_narrative.md`
   - 它如何理解自己和用户的关系
3. `soul_journal/`
   - 周期性自我日记
4. `soul_proposals/`
   - 尚未晋升的灵魂变化提案
5. `soul_memories`
   - 与人格和关系强相关的高权重记忆

---

## 7.2 Nion 应该同时吸收 companion 路线和 stateful agent 路线

建议组合：

- 从 **Nomi / Kindroid** 学：
  - 陪伴感
  - 关系人格
  - 成长被用户感知到
- 从 **Letta** 学：
  - persona 是独立结构化对象
  - memory 与 persona 分开
  - 自我更新落在 substrate 上
- 从 **SOUL.md / file-over-app** 学：
  - canonical text artifact
  - continuity files
  - 可迁移、可追踪、可多模型继承

---

## 7.3 对 Nion 来说，完整 soul system 的最低完整定义

如果 Nion 真的要做“完整版本”，那最低也应该满足：

1. 主智能体有真正生效的 canonical soul，而不是空壳
2. soul 不是静态 prompt，而是独立对象
3. soul 有 diary / journal
4. soul 可以提出成长提案
5. soul 的成长有治理，不会直接污染 core identity
6. soul 能实时生成运行时文本，进入主智能体 prompt
7. soul 里包含关系人格，而不只是工作风格

---

## 8. 最终判断

### 8.1 目前行业里“完整灵魂系统”还没有标准答案

没有任何一个公开系统把这件事做到了完全体。

但已经有足够清楚的行业共识：

- 灵魂不是 prompt
- 灵魂不是普通 memory
- 灵魂不是角色配置页
- 灵魂必须是 identity continuity system

### 8.2 Nion 有机会做出比多数系统更完整的版本

因为 Nion 已经有：

- memory substrate
- growth governance
- diary / heartbeat skeleton
- automation
- 文件与本地优先能力

这些基础设施非常适合做完整 soul system。

缺的不是“能不能做”，而是：

- 还没有把 soul 作为一级 canonical object 正式做完
- 还没有把 soul 接入主智能体运行时
- 还没有把 relationship-oriented soul 作为系统核心来设计

### 8.3 真正的目标应该是：

> 让主智能体拥有一个稳定、可成长、可反思、可治理、可实时注入运行时，并且对用户呈现出持续人格感和关系感的 soul system。

这才是“完整版本”，不是最小可用版。

---

## 9. 本轮最重要的设计原则

1. Soul 是身份连续性系统，不是人设文案。
2. Soul 必须由核心人格、关系人格、关键记忆、日记、提案、治理共同构成。
3. 成长必须慢，必须有证据，必须经过 proposal 机制。
4. 陪伴型 agent 的 soul 必须包含“它如何理解和对待用户”。
5. Canonical soul 必须是文本化、可迁移、可版本化的。
6. Runtime 里必须实时注入当前 soul，而不是只在后台存档。
7. 用户应该能看到 agent 在成长，但不能像改配置一样直接操控其灵魂核心。

---

## 10. 关键来源索引

### GitHub / 开源系统

- Letta README
  - https://github.com/letta-ai/letta
  - 关键信号：`stateful agents`、`advanced memory`、`learn and self-improve over time`
- ElizaOS README
  - https://github.com/elizaOS/eliza
  - 关键信号：character-driven / multi-agent / extensible agent platform

### X / Twitter 公开讨论

- `SOUL.md / MEMORY.md / heartbeat / diary` 路线的开发者讨论
  - 重点信号：
    - “SOUL.md tells you who you are. MEMORY.md tells you who you were.”
    - “identity files are infrastructure”
    - `daily logs -> dream job -> MEMORY.md`
- 关于本地 memory artifact / file-over-app 的讨论
  - 重点信号：
    - 显式 memory artifact
    - 用户数据可迁移、可检查、可跨模型继承

### 官方/产品资料

- Letta Docs
  - https://docs.letta.com/
- ElizaOS Docs
  - https://docs.elizaos.ai/
- Nomi 官网
  - https://www.nomi.ai/
- Kindroid 官网 / 文档入口
  - https://kindroid.ai/
- Character.AI 支持与博客
  - https://support.character.ai/
  - https://blog.character.ai/
- Replika 帮助与博客
  - https://help.replika.com/
  - https://replika.ai/blog

### 来源使用说明

本轮研究里，不同来源承担不同角色：

- 官网/帮助中心/README：确认产品定位与公开能力边界
- GitHub：确认系统结构是否真的支持 persona / memory / statefulness
- X：补充开发者和重度用户对“连续性、成长、文件化 identity、人格持久层”的一手讨论

因此这份结论不是单一来源推导，而是三类来源交叉后的综合判断。
