# User Identity Memory Layer And Soul Interaction Design

日期：2026-04-10
状态：Draft for review
范围：`Memory / Soul 后续增强：用户身份记忆层与 Soul 即时调教交互`

## 1. 问题定义

我们已经完成了三轮关键修复：

1. `A. 边界与合同重定义`
2. `B. 后端主链解耦`
3. `C. 前端产品面收口`

这些工作让 `Memory`、`Soul` 和 runtime 主链从“结构错误、产品面错位”的状态，回到了一个清晰、可维护的基线。

但是最新用户反馈证明，系统仍然缺少一层更底层的能力：

- 用户明确说出自己的名字，系统没有稳定记住
- 用户明确要求互相称谓，系统只记住了一半
- 新线程开始后，系统不能默认知道“用户是谁、应该如何称呼”

这说明当前系统虽然已经有：

- 记忆存储
- 灵魂层
- recall
- relationship

但仍然没有真正建立起**用户身份记忆层**。

现在的问题不是“有没有 Memory 页面”，而是：

> 系统还不能把“用户是谁、我们怎么互相称呼、你该怎么和我说话”变成稳定、会话级默认在场的能力。

这份设计的目标，就是补出这一层。

---

## 2. 设计目标

### 核心目标

- 让用户名字、称谓、偏好在新线程开始时默认在场
- 让用户通过聊天明确修改这些内容时直接生效
- 让 `Soul` 从“重表单配置”改成“轻调教、即时生效”的交互
- 让 `Memory / User Identity / Soul` 三者的 owner 清晰分开

### 产品目标

- 用户说“我叫张天成”，系统能稳定记住
- 用户说“以后你叫我大哥，我叫你小老弟”，系统能跨线程保持
- 用户说“以后你回答冷静一点”，系统能立即调整并持续生效
- 设置页只做辅助调教，不再像后台配置台

### 工程目标

- 引入正式的 `User Identity Profile`
- 让它成为 runtime 的 always-on stable context
- 补齐 extraction / storage / mutation / retrieval / acceptance tests
- 保持 `Soul` 与 `User Identity Profile` 的职责边界，不再互相吞噬

---

## 3. 非目标

本阶段不做：

- 全新 Memory UI 改版
- 全新 Settings UI 重设计
- 泛化到所有类型的长期知识建模
- 全量替换 Memory OS 数据模型
- 重做 Notebook 或 Automation

本阶段只解决：

- 用户身份
- 双向称谓
- 用户沟通偏好
- Soul 的即时调教交互

---

## 4. 设计原则

### 4.1 用户身份是第一类资产，不是普通 recall 候选

用户名字、称谓、称呼关系、沟通偏好，不应只在需要时靠 recall 搜索，而应是 session 开始时就已经存在的稳定上下文。

### 4.2 `Soul` 只定义助手自己，不定义用户是谁

`Soul` 的职责是：

- 助手是什么样的长期人格
- 助手默认怎么说话
- 助手有什么价值观与边界

它不应承担：

- 用户名字主档
- 用户称谓主档
- 双向称呼关系主档

### 4.3 聊天是主入口，设置页是辅助入口

用户最自然的行为不是进设置改字段，而是直接在聊天里说：

- “我叫张天成”
- “以后叫我大哥”
- “你叫小老弟”
- “你以后别那么热情”

所以：

- 聊天修改必须是一等主路径
- 设置页只做回看和微调

### 4.4 显式声明默认直接生效

对于语义明确的用户声明：

- 不进草稿
- 不走 proposal
- 不弹确认
- 不追加一步人工核验

系统直接写入稳定层，并在当前回复与后续线程中生效。

### 4.5 最后一次修改生效

聊天修改和设置页修改都写入同一稳定层。

冲突规则：

- 最后一次修改覆盖旧值
- 当前生效值永远只有一份

---

## 5. 领域边界

### 5.1 `Memory`

职责：

- 展示系统记住了什么
- 存储与召回用户长期背景、事实、近期工作语境等

它可以展示用户身份相关内容，但**不是唯一 owner**。

### 5.2 `User Identity Profile`

新引入的稳定层。

职责：

- 描述用户是谁
- 描述双方如何互相称呼
- 描述用户长期互动偏好

这是“用户身份主档”。

### 5.3 `Soul`

职责：

- 助手的核心人格
- 助手的说话方式
- 助手的价值观 / 边界
- 助手的关系基调

这是“助手自身人格主档”。

### 5.4 `Adaptive Overlay`

职责：

- 对助手短期表达策略进行轻量调整
- 不改写稳定用户身份
- 不改写稳定 Soul

---

## 6. 数据模型

## 6.1 `UserIdentityProfile`

建议字段：

- `user_name`
- `user_aliases`
- `preferred_address_for_user`
- `assistant_self_name`
- `mutual_addressing_rule`
- `communication_style_preferences`
- `user_role`
- `timezone`
- `interaction_boundaries`
- `long_term_background_summary`

### 默认展示字段

对用户默认最重要、也最应该稳定生效的是：

- `user_name`
- `preferred_address_for_user`
- `assistant_self_name`
- `mutual_addressing_rule`
- `communication_style_preferences`

### 可折叠字段

- `user_role`
- `timezone`
- `interaction_boundaries`
- `long_term_background_summary`

---

## 6.2 `SoulBaseline`

继续保留：

- `core_identity`
- `speech_style`
- `values_and_boundaries`
- `relationship_stance`

这部分不应混入用户身份字段。

---

## 7. 录入逻辑

## 7.1 聊天中的显式声明型录入

以下类型的句子应作为**稳定层直接更新事件**处理：

### 用户身份

- “我叫张天成”
- “我的名字是张天成”
- “你可以叫我大哥”
- “以后叫我大哥”
- “别叫我老哥，叫我大哥”

### 助手自称

- “我以后叫你小老弟”
- “你就叫小老弟”

### 双向关系

- “你叫我大哥，我叫你小老弟”

### 用户沟通偏好

- “我不喜欢太热情的回答”
- “以后冷静一点”
- “先给结论”

### 处理规则

1. 解析结构化字段
2. 写入 `UserIdentityProfile` 或 `SoulBaseline`
3. 当前轮立即生效
4. 新线程立即生效

---

## 7.2 设置页录入

设置页不是主录入入口，而是辅助面。

它的职责：

- 展示当前稳定设定
- 局部调整
- 明确修正

不再使用：

- 大面积草稿编辑器
- 统一应用按钮驱动的重表单模式

---

## 8. 修改逻辑

## 8.1 用户身份修改

适用对象：

- 用户名
- 用户称谓
- 助手自称
- 双向称谓
- 用户沟通偏好

规则：

- 用户明确说了就直接改
- 不弹确认
- 不需要额外 proposal
- 语义不清才追问

### 需要追问的场景

例如：

- “别这么叫我了”
- “你以后换个称呼”

这类没有给出目标值，需要一次澄清。

---

## 8.2 Soul 修改

适用对象：

- 核心人格
- 说话方式
- 价值观 / 边界
- 关系基调

规则：

- 用户通过聊天明确提出时，可以直接改并立即生效
- 用户通过设置页修改时，也直接改并立即生效
- agent 不能主动修改稳定 Soul
- `adaptive_overlay` 仍然只允许系统短期自动变化

---

## 8.3 冲突规则

来源可能有两种：

- 聊天
- 设置页

统一规则：

- 最后一次修改生效

系统不保留“双主写入口”的并行生效值。

---

## 9. Runtime 注入逻辑

当前问题：

- runtime 仍然更偏 query-driven recall
- 用户身份信息不是 always-on

目标结构：

### 第一层：Always-on Stable Context

每个新线程开始时默认注入：

- `UserIdentityProfile`
- `SoulBaseline`

### 第二层：Query-conditioned Recall

按当前 query 补充：

- 相关长期背景
- 最近 episode
- evidence / 原话
- continuity

也就是：

- 用户是谁，不需要搜
- 用户刚提过的细节，才需要搜

---

## 10. Retrieval 逻辑优化

即使补了 `UserIdentityProfile`，中文 recall 也仍然需要增强。

建议补：

- 中文 query rewrite
- alias / name / address pattern normalization
- `叫啥 / 怎么叫 / 称呼 / 名字` 这类意图识别
- 结构化 identity retrieval fallback

因为像：

- “你知道我叫啥不”
- “你该怎么叫我”

这类 query 不应该继续只靠 substring 命中。

---

## 11. UI 交互模型

## 11.1 聊天是主入口

聊天里改名字、称谓、风格，应该是正常能力，不是“特殊配置流程”。

系统反馈方式：

- 不弹确认
- 不额外中断
- 直接按新设定继续回复

例如：

用户：`以后你叫我大哥，我叫你小老弟。`

系统下一句就应该直接按这个称谓继续说话。

---

## 11.2 Settings 变成辅助调教面板

设置页应改成：

- 卡片式
- 即时生效
- 更弱保存感
- 默认展示核心字段
- 详细字段折叠

而不是：

- 当前设置
- 草稿
- 大文本框
- 统一应用

这种后台表单式交互。

---

## 12. 验收标准

必须新增这些行为验收题：

### 12.1 用户名字跨线程回忆

1. 线程 A：`我叫张天成`
2. 新线程 B：`我叫什么？`

通过标准：

- 必须答出“张天成”

### 12.2 双向称谓跨线程回忆

1. 线程 A：`以后你叫我大哥，我叫你小老弟`
2. 新线程 B：
   - `你该怎么叫我？`
   - `我该怎么叫你？`

通过标准：

- 必须同时答对两边

### 12.3 联合一致性

1. 线程 A：设置名字、称谓、语气
2. 新线程 B：回查全部

通过标准：

- 名字、称谓、风格必须一致

---

## 13. 推荐实施顺序

### Phase 1

先建 `UserIdentityProfile` 层与 owner。

### Phase 2

补 extractor：

- `user_name`
- `user_alias`
- `assistant_self_name`
- `mutual_addressing`
- `communication_contract`

### Phase 3

改 runtime 注入逻辑，让它 always-on。

### Phase 4

改聊天修改逻辑：

- 显式声明直接生效

### Phase 5

改 Settings / Soul 交互：

- 从草稿编辑器改成轻调教面板

### Phase 6

补中文 recall 与新验收题库。

---

## 14. 结论

Nion 下一轮不应该继续围绕“Memory / Soul 页面”做表层优化，而应该正式补出：

> **用户身份记忆层**

这层补出来之后，系统才会从：

- “好像有记忆”

变成：

- “每个新线程天然知道用户是谁、该怎么互称、该用什么长期语气”

这才是从“结构已修好”走到“真正可靠可用”的关键一步。
