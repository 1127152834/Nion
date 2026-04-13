# Nion System Capability Backbone Design

日期：2026-04-13  
状态：Draft for review  
范围：`能力自描述层 / 系统对象意图路由 / CLI-Tool-ControlPlane 对齐`

---

## 1. 问题定义

当前 Nion 已经拥有很多真实能力：

- models
- skills
- MCP
- notebook
- memory
- `IDENTITY.md`
- `SOUL.md`
- automation
- bridges / channels
- delegated child runs

但对主智能体来说，这些能力还没有形成一个统一的、自解释的、可查询的系统能力骨架。

这会产生一个非常具体的问题：

> 用户明明是在说一个系统内已知对象，但助手却把它当成开放式模糊自然语言需求来处理。

典型症状：

1. 用户说“帮我改 `IDENTITY.md`”或“帮我改 soul”，助手不先读取当前文档，而是先问用户究竟在说什么。
2. 用户说“帮我新增一个定时任务”，助手不把这识别成 automation capability，而是当作普通需求澄清。
3. 用户问“现在有哪些模型”“有多少 bridge 连上了”“有哪些 skill”，助手不优先查询系统状态，而是靠 prompt 里零碎信息猜。
4. 主智能体虽然有 capability catalog / control plane / bridge actions / skill runtime / document routes，但这些对象没有形成一张统一的“系统对象地图”。

结果就是：

- 系统里功能很多
- 但助手像不知道自己家里有什么

这不是模型不聪明，而是系统没有把“自己会什么、这些能力对应什么用户意图、优先该查什么”明确告诉模型。

---

## 2. 这轮设计要解决什么

这份设计只做一件事：

> 让主智能体拥有一套统一的、自描述的、可查询的系统能力骨架，并让常见用户意图能够被稳定路由到正确系统对象。

具体目标：

1. 用户提到系统内已知对象时，助手优先识别对象，不先泛化澄清。
2. 用户问系统状态时，助手优先查 capability surface，而不是凭空猜。
3. CLI、agent tools、control plane、prompt 注入、UI 五层围绕同一套 capability objects 建模。
4. 文档对象（`IDENTITY.md` / `SOUL.md` / `MEMORY.md`）和系统对象（automation / model / bridge / skill）都成为 agent 可显式理解的一等对象。

---

## 3. 为什么 Hermes / OpenClaw 看起来“更懂系统自己”

### 3.1 不是因为模型神奇

Hermes 与 OpenClaw 更像“知道自己会什么”，主要不是因为模型更强，而是因为它们把系统能力显式暴露给模型：

- context files
- tools
- skills
- docs
- memory systems
- current runtime objects

也就是说，模型面对的不是“一个神秘系统”，而是一张明确的能力地图。

### 3.2 Hermes 的做法

Hermes 官方文档明确强调：

- `SOUL.md` 是主 personality artifact
- `MEMORY.md` / `USER.md` 是长期上下文文件
- built-in tools 是显式列出的
- 这些对象会进入运行时上下文  

这使得模型更容易形成：

- 我知道系统里有这些长期文件
- 我知道自己能调哪些工具
- 我知道哪些信息应该先查而不是先问用户

### 3.3 OpenClaw 的做法

OpenClaw 官方文档更进一步：

- system prompt 直接包含 tooling / docs / skill / runtime context
- active memory 是正式 agent loop 的一部分
- memory search 建在文件宇宙之上

这使得模型天然具备：

- 先查 memory
- 先查 docs
- 先查 tools
- 再决定要不要问用户

### 3.4 Nion 当前欠缺的不是功能，而是“能力骨架”

Nion 现在的问题不是没有能力，而是能力分散在：

- control plane tools
- capability catalog
- capability bridge actions
- document routes
- memory routes
- notebook service
- model registry
- bridge runtime
- UI 页面

这些点都各自存在，但没有形成一个统一的 assistant-facing capability backbone。

---

## 4. 核心判断

### 4.1 CLI 不是全部，但 CLI 是关键外壳

是的，完整 CLI 是一个非常大的因素。

但更准确的说法是：

> 需要先有统一 capability backbone，然后 CLI、agent tools、UI、API 才能围绕它成为一致外壳。

如果只有 API 没有统一 CLI / control plane / tool surface，模型还是只能看见一堆散装能力。

而 CLI 的价值在于：

1. 强迫系统对象标准化
2. 让“人”和“agent”都通过同一套能力入口看系统
3. 给 agent 提供 shell fallback

所以 CLI 不是终点，但通常是最好的第二外壳。

### 4.2 系统对象必须成为一等概念

下面这些不能再只是“散落的模块名”，而必须成为统一对象：

- `identity_document`
- `soul_document`
- `active_memory_document`
- `model_catalog`
- `bridge_status`
- `automation_registry`
- `skill_registry`
- `notebook_registry`
- `child_run_registry`

只要这些对象没有被显式定义，模型就会继续把用户的话当模糊自然语言处理。

### 4.3 必须建立意图路由层

用户说：

- `identity`
- `identify`
- `身份`
- `身份文件`

系统都应该理解成：

- `identity_document`

同理：

- `soul` / `灵魂` / `人格`
- `定时任务` / `提醒`
- `模型`
- `桥接` / `bridge`
- `技能`
- `笔记`

这些都应该有归一化规则。

没有这层，主智能体就不可能稳定地“知道用户要调哪个系统对象”。

### 4.4 “先查系统，再决定是否澄清”要高于泛化澄清

当前 prompt 的问题不是澄清错，而是澄清太早。

新的优先级应该是：

1. 如果请求明显指向系统对象，先查系统对象
2. 如果系统对象已存在且可读，先读当前状态
3. 只有在读完后仍缺关键输入时，再 ask_clarification

也就是说：

`System Object Read` 的优先级要高于 `Generic Clarification`

---

## 5. 目标架构

## 5.1 Capability Backbone 分层

建议建立 5 层统一模型：

### Layer A: Capability Source

唯一能力源，返回结构化 capability objects。

来源对象：

- models
- skills
- MCP servers
- bridges/channels
- automations
- notebook
- memory
- documents
- child runs

### Layer B: Control Plane / Query Surface

这是系统状态查询层。

职责：

- 读取当前对象状态
- 列出当前对象集合
- 返回结构化 JSON

例如：

- `get_model_catalog`
- `get_bridge_status`
- `get_automation_registry`
- `get_document_catalog`

### Layer C: Agent Tools

这是给主智能体直接调用的 typed tools。

规则：

- 优先于 shell
- 直接暴露产品语义
- 不让模型自己拼 API / shell

### Layer D: CLI

这是给人和 agent shell fallback 的统一命令面。

规则：

- 与 agent tools 一一映射
- 输出结构化 JSON 优先
- 不只是给开发者用，也给 agent 做后备查询

### Layer E: Prompt / Intent Router

这是把“用户语言”路由到“系统对象”的层。

职责：

- 识别用户是否在说系统内对象
- 识别对象类型
- 判断先查什么
- 判断是否需要澄清

---

## 5.2 能力对象模型

建议统一成：

```json
{
  "kind": "document | automation | model | bridge | skill | notebook | child_run | memory",
  "id": "stable-id",
  "label": "user-facing label",
  "status": "available | unavailable | active | paused | degraded",
  "actions": ["read", "list", "create", "update", "run"],
  "query_tool": "tool-name",
  "mutation_tool": "tool-name",
  "cli_command": "nion ...",
  "aliases": ["common words", "mistyped words", "Chinese labels"],
  "description": "what this object is"
}
```

`aliases` 非常关键。  
这就是把：

- `identify`
- `identity`
- `身份`
- `身份文件`

都收口到同一个对象的地方。

---

## 6. 第一批必须支持的对象

我建议第一批只支持 4 组对象，不贪多。

### 6.1 Documents

- `identity_document`
- `soul_document`
- `active_memory_document`

### 6.2 Automation

- `automation_registry`
- `automation_create`

### 6.3 System Status

- `model_catalog`
- `bridge_status`
- `skill_registry`

### 6.4 Notebook

- `notebook_registry`
- `notebook_create_note`

这是收益最高的一批。

因为它们刚好覆盖你抱怨的那些高频用户意图：

- 帮我改 identity
- 帮我改 soul
- 帮我新增定时任务
- 现在有哪些模型
- 现在有哪些 skill
- 现在多少桥接在线
- 帮我写个笔记

---

## 7. 第一批 agent tools 设计

建议新增这些工具：

### Documents

- `read_identity_document`
- `write_identity_document`
- `read_soul_document`
- `write_soul_document`
- `read_active_memory_document`

### Automation

- `list_automations`
- `create_automation`

### Status

- `get_model_catalog`
- `get_bridge_status`
- `get_skill_registry`

### Notebook

- `list_notebook_notes`
- `create_notebook_note`

要求：

1. 工具描述必须包含常见别名
2. 工具输出尽量结构化
3. 工具名要表达产品语义，而不是实现细节

例如：

- 好：`read_identity_document`
- 差：`get_user_identity_projection_from_store`

---

## 8. CLI 设计原则

建议同步有 CLI：

```bash
nion documents identity read
nion documents identity write --file /tmp/identity.md
nion documents soul read
nion automations list
nion automations create --json payload.json
nion models list --json
nion bridges status --json
nion skills list --json
nion notebook list --json
```

规则：

1. agent tools 和 CLI 一一映射
2. CLI 支持 `--json`
3. shell fallback 时，模型应优先跑 CLI 查询，而不是胡乱猜

---

## 9. Intent Router 规则

## 9.1 别名映射

### Identity

- identity
- identify
- 身份
- 身份文件
- 用户身份
- IDENTITY.md

### Soul

- soul
- 灵魂
- 人格
- 助手风格
- SOUL.md

### Memory

- memory
- 记忆
- MEMORY.md
- 活跃记忆

### Automation

- 定时任务
- 自动任务
- 自动化
- 提醒

### Models

- 模型
- 现在有哪些模型
- 模型列表

### Bridges

- bridge
- 桥接
- 连接
- 在线桥接

### Skills

- skill
- 技能
- 能力包

### Notebook

- 笔记
- notebook
- 记一条笔记

## 9.2 路由优先级

建议 prompt 规则明确写成：

1. 先识别是否是系统对象
2. 如果是系统对象，先调用读工具
3. 只有在读完对象后仍缺关键意图时，才 ask_clarification

例如：

用户说：`帮我重新设计一下我的 identify`

正确行为：

1. 路由到 `identity_document`
2. 调 `read_identity_document`
3. 看当前内容
4. 再问一个真正必要的问题，例如“你想偏正式档案还是偏日常协作风格？”

错误行为：

1. 不读当前文档
2. 先问“你说的是哪一类身份”

---

## 10. Prompt 设计要求

当前 prompt 应新增一个明确 section：

`<system-object-routing>`

内容要求：

1. 告诉模型系统里有哪些一等对象
2. 告诉模型这些对象有哪些别名
3. 告诉模型这些对象应该先查哪个工具
4. 明确规则：

> 当用户请求明显指向系统内已知对象时，优先读对象，不要立刻 ask_clarification。

示意：

```text
If the user mentions identity / identify / 身份 / 身份文件 / IDENTITY.md,
first call read_identity_document.

If the user mentions soul / 灵魂 / 人格 / SOUL.md,
first call read_soul_document.

If the user asks what models / skills / bridges / automations currently exist,
first call the matching system status tool.

Only ask for clarification after reading the current system object if a real requirement gap remains.
```

---

## 11. 为什么这比继续修 prompt 文案更值钱

因为这解决的是结构问题，不是台词问题。

如果只改一句 prompt：

- 可能今天能识别 `identity`
- 明天又在 `automation`
- 后天又在 `bridge`

继续翻车

而有了 capability backbone 后：

- 系统对象统一
- tool surface 统一
- CLI 统一
- prompt 路由统一

这才是能扩展的解法。

---

## 12. 与当前 file-native 重构的关系

这不是新方向，而是当前重构的必需补全项。

已经完成的 file-native 工作解决的是：

- `IDENTITY.md`
- `SOUL.md`
- `MEMORY.md`
- speaking owner

System Capability Backbone 解决的是：

- 主智能体如何知道这些对象存在
- 主智能体如何知道系统里还有 automation / models / bridge / skills / notebook
- 主智能体遇到系统对象请求时应该先查什么

所以它不是并行副线，而是当前重构的下一层。

---

## 13. 最终结论

Nion 下一步最该补的，不是继续局部修 clarification，而是建立：

### `System Capability Backbone`

包含：

1. 统一 capability objects
2. agent tools
3. CLI 映射
4. intent router
5. prompt 中的 system-object read-first policy

如果这层补上，主智能体才会真正像：

- 知道自己有哪些模型
- 知道哪些 bridge 在线
- 知道有哪些 skill
- 知道怎么读写 `IDENTITY.md` / `SOUL.md`
- 知道怎么新增 automation

而不是继续像一个住在自己家里却找不到电灯开关的人。
