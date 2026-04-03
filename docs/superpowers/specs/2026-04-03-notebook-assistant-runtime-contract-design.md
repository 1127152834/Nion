# Notebook Assistant Runtime Contract Design

## 背景

当前 `Notebook Assistant` 的产品表面已经存在：

- Notebook 右侧独立助手面板
- 独立会话 bootstrap
- 独立 `agent_name = "notebook-chat"`
- 独立 `scope = "notebook_assistant"`

但从实际行为看，它仍然会退化成一个通用聊天助手，而不是一个真正围绕当前笔记工作的内容助手。

暴露出的典型问题是：

1. 用户在 Notebook 中向笔记助手提问“你叫什么”，它会按通用助手身份回答“我是 Nion 2.0”
2. 用户继续问“笔记里说了啥”，它会说“你没有上传文件或笔记”
3. 它没有稳定地围绕当前笔记内容回答

这说明当前 Notebook Assistant 虽然有独立入口，但还没有形成一个真正的 **Notebook-specific runtime contract**。

## 已确认事实

### 1. 它是独立 built-in agent，但没有独立 soul

当前 built-in agent 配置：

- `slug = "notebook-chat"`
- `name = "笔记助手"`
- `tool_policy = "notebook-basic"`
- `soul = ""`

这意味着它当前没有独立 SOUL 文本，不具备专属人格与行为约束。

### 2. 它没有专门的 notebook prompt overlay

当前 lead prompt 在 `agent_name == "notebook-chat"` 时，只把 `agent_kind` 标成 `builtin`，没有 Notebook-specific 的额外 prompt section。

换句话说：

- 没有“你是笔记助手”的专属系统约束
- 没有“必须以当前笔记为中心回答”的硬规则
- 没有“禁止退化成通用助手”的 guardrail

### 3. 前端传了 notebook 上下文，但后端主链路没有真正消费

前端发送时携带：

- `notebook_note_id`
- `notebook_note_title`
- `notebook_session_id`

但当前 `ThreadService -> NionClient -> apply_prompt_template` 链路并没有把这些字段接到 prompt 装配主链路中。

这意味着当前助手很可能并没有真正拿到：

- 当前 note 正文
- 当前 note 元信息
- 当前 note 选择区

## 根因判断

根因不是“模型不够聪明”，而是：

**Notebook Assistant 只有 surface isolation，没有 runtime grounding。**

也就是说，当前只实现了：

- 独立入口
- 独立线程
- 独立 agent 名称

但没有实现：

- 独立 notebook prompt contract
- 独立 note-grounded context injection
- 独立失败语义

因此它自然会退化成通用聊天助手。

## 目标

把 Notebook Assistant 从“带 Notebook UI 的通用聊天线程”升级成：

**一个围绕当前笔记内容工作的 note-grounded content assistant。**

用户应得到的体验是：

- 问“这篇笔记讲了什么”，它直接总结当前 note
- 问“这句话什么意思”，它默认基于当前 note / 当前选区回答
- 问“帮我改写”，它默认对当前 note 内容进行操作
- 如果当前 note 不可读，它明确说明 Notebook context 缺失，而不是装成通用助手

## 非目标

本轮不做：

- Notebook Assistant 的全新 UI 重做
- 多 note / 多 asset 联合上下文
- 独立 Notebook specialist tool set 扩张
- Notebook Assistant 的 MCP / plugin 扩展
- 长链路记忆提炼
- 项目管理 / 工作流编排

本轮只做：

- runtime contract
- prompt contract
- failure contract
- 与当前 note 的硬绑定

## 设计原则

### 1. Notebook Assistant 是 note-grounded，不是 open-domain chat

它的第一职责不是聊天，而是：

- 理解当前 note
- 改写当前 note
- 总结当前 note
- 围绕当前 note 进行问答

### 2. Notebook Assistant 的第一上下文必须是当前 note

不允许当前 note 只是“前端顺手带一个 title”。

必须把：

- note id
- title
- body
- relative path
- selection

作为 runtime contract 的正式输入。

### 3. notebook-chat 需要独立 soul / prompt overlay

它不应该继续共享通用助手的默认身份表达。

最少要具备：

- 你是谁
- 你不是谁
- 你优先做什么
- 你不能做什么

### 4. 缺失 note context 时必须显式失败

如果当前 note 不存在、不可读、未传入：

- 不能继续假装自己知道用户在说哪篇笔记
- 不能退化成普通聊天助手
- 必须给出 notebook-specific 的明确提示

## 方案对比

### 方案 A：前端文案 + 少量提示词修补

做法：

- 调整 composer placeholder
- 调整 panel header copy
- 在用户首轮消息前拼一段 note title 文本

优点：

- 快

缺点：

- 治标不治本
- 仍然没有把当前 note 正文接入 runtime
- 仍然会在很多情况下退化成通用助手

结论：

**不采用。**

### 方案 B：Notebook Assistant Prompt Overlay

做法：

- 给 `notebook-chat` 增加独立 soul / prompt section
- 但 note 内容仍然只由前端软注入

优点：

- 比方案 A 稍稳

缺点：

- 仍然没有真正 runtime-grounded
- 只靠 prompt overlay 无法保证拿到当前 note body

结论：

**不单独采用。**

### 方案 C：Notebook Assistant Runtime Contract

做法：

- 给 `notebook-chat` 增加独立 soul / prompt overlay
- 把当前 note 内容正式接入 runtime contract
- 在后端 prompt 装配中注入 current note section
- 在缺失 note context 时显式失败

优点：

- 产品化
- 稳定
- 可测试
- 可扩展到 future selection / multi-note / asset summarize

缺点：

- 需要补一层 context 装配 contract

结论：

**采用。**

## 目标架构

### 1. Notebook Assistant Session Contract

当前保留：

- `scope = "notebook_assistant"`
- `note_id`
- `notebook_session_id`

新增要求：

- 会话 bootstrap 只负责会话身份，不负责携带 note body
- note body 不写进 thread persisted values，避免状态膨胀
- note body 在每次请求时动态读取并注入

### 2. Notebook Assistant Runtime Input Contract

每次 notebook assistant 发消息时，后端必须拿到：

- `note_id`
- `note_title`
- `note_relative_path`
- `note_body`
- `selection_text`（可空）
- `selection_start`（可空）
- `selection_end`（可空）
- `session_id`

这些字段应形成一个正式结构，例如：

```text
notebook_context = {
  note_id,
  note_title,
  note_relative_path,
  note_body,
  selection_text,
  selection_start,
  selection_end,
  session_id,
}
```

### 3. Notebook Prompt Overlay

Notebook Assistant 的系统层必须额外注入：

- 你是一个“笔记内容助手”
- 你的主要职责是理解、总结、改写和整理当前笔记
- 你的回答默认必须以当前笔记内容为依据
- 如果用户问的是当前笔记内容，不要回答通用助手身份介绍
- 如果没有拿到当前笔记内容，必须明确告诉用户当前笔记上下文不可用

### 4. Current Note Section

在 prompt 中增加一个 Notebook-specific section，例如：

```text
<current_notebook_note>
<note_id>...</note_id>
<title>...</title>
<relative_path>...</relative_path>
<body>
...
</body>
<selection>
...
</selection>
</current_notebook_note>
```

这是最关键的 grounding section。

## 行为规则

### 1. 默认回答策略

当用户没有显式切换范围时：

- 默认围绕当前 note 回答
- 默认优先使用当前 note 内容

### 2. 问“你是谁 / 你叫什么”时

Notebook Assistant 不应答成通用 `Nion 2.0`。

它应该回答类似：

- “我是你的笔记助手，主要帮你理解、总结和改写当前这篇笔记。”

### 3. 问“这篇笔记讲了什么”时

必须直接总结当前 note 内容，而不是要求用户上传文件或继续澄清。

### 4. note context 缺失时

必须返回 Notebook-specific error behavior，例如：

- “当前没有成功加载这篇笔记的内容，我暂时无法基于笔记回答。请重新选择笔记或刷新后再试。”

而不是：

- “你没有上传文件或笔记”

### 5. 严禁退化行为

禁止：

- 通用自我介绍优先于 note-grounded 回答
- 把当前 note 问题当成 open-domain 问题
- 在 note context 缺失时假装继续工作

## 实现切面

### Backend

需要调整：

- notebook assistant runtime input 装配
- `notebook-chat` 的 prompt section provider
- note content read path
- note missing error contract

### Frontend

需要调整：

- notebook assistant request payload contract
- selection 传递（后续可先保留空值）
- panel 中的 error 文案对齐 notebook-specific 语义

### Prompt Runtime

需要新增：

- notebook-chat soul / overlay
- current note prompt section

## 测试方案

### Backend

新增 contract 测试：

1. `notebook-chat` 生成 prompt 时包含 current note section
2. note context 缺失时返回 notebook-specific failure
3. notebook assistant session values 不膨胀持久化 note body

### Frontend

新增 contract 测试：

1. notebook assistant 发送消息时携带 notebook runtime context
2. panel 错误文案不再使用“上传文件”语义
3. composer/panel 不再暴露通用助手身份暗示

### 行为验收

最小验收场景：

1. 当前 note 中写着一段文本，问“这篇笔记说了什么”，必须直接总结 note
2. 问“你叫什么”，必须回答“笔记助手”身份，而不是 `Nion 2.0`
3. 断开当前 note 上下文时，必须明确报 notebook context 缺失

## 验收标准

1. Notebook Assistant 不再答成通用助手
2. Notebook Assistant 的回答默认 anchored 到当前 note
3. 当前 note 缺失时，失败语义正确
4. 当前 note 正文不再只是 UI 层隐式上下文，而是 runtime contract

## 依赖顺序

1. 先补 notebook runtime input contract
2. 再补 notebook-chat prompt overlay / soul
3. 再补 notebook-specific failure semantics
4. 最后补 contract tests 与行为回归

## 决策

采用：

**Notebook Assistant Runtime Contract 正修**

不采用：

- 文案修补式方案
- 纯 prompt 小修方案
