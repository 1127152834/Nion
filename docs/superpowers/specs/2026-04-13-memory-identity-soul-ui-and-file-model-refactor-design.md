# Memory / Identity / Soul 文件原生模型与产品体验重构设计

日期：2026-04-13  
状态：Draft for review  
范围：`Memory / Identity / Soul / Runtime Context / UI` 一体化重构指导

---

## 原型入口

与本设计配套的高保真静态原型位于：

- [docs/prototypes/memory-identity-soul-file-native/README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/prototypes/memory-identity-soul-file-native/README.md)
- [docs/prototypes/memory-identity-soul-file-native/index.html](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/prototypes/memory-identity-soul-file-native/index.html)

原型用于冻结这轮重构的产品形态与交互方向，不等同于生产实现。

---

## 1. 为什么要做这轮重构

当前系统的问题已经不是“某几个接口还不够优雅”，而是**产品心智、存储模型、运行时主链、页面设计**四层同时拧巴。

你当前的实现里，至少有四个明显症状：

1. `Memory`、`Identity`、`Soul` 页面都是“把内容塞进卡片里”，像后台配置台，不像一个成熟 agent 产品。
2. `Identity` 与 `Soul` 被拆成很多字段直接存和直接 patch，工程上方便，但产品上非常碎，缺少“这就是我的身份文件 / 这就是这个 agent 的灵魂文件”的实体感。
3. `Memory` 的产品面与后台维护动作还没完全切开，导致心智是混的。
4. runtime 还在围绕数据库字段和兼容对象打转，而不是围绕“文件原生资产 + 活跃记忆 + 检索层”来组织。

这会导致一个很糟糕的结果：

> 系统表面上有很多模块，但用户感受到的不是一个成熟 agent，而是一套半成品的配置拼装器。

这轮重构的目标不是“小修小补地美化一下页面”，而是把这四层一起拉回正确模型。

---

## 2. 这轮重构的核心判断

我对这件事的判断很明确：

### 2.1 `Soul` 应该是文件，不应该先被拆成数据库字段

长期人格不是“几个表单项的集合”，它首先应该是**一个可阅读、可理解、可版本化的文档实体**。

更合理的模型是：

- `SOUL.md` 是稳定人格的权威源
- UI 只是这个文档的预览器 / 整文编辑器
- runtime 读取的是 compiled soul artifact，但 source of truth 是文件

也就是说：

- **主存储是文件**
- 数据库或索引层只是投影与缓存

### 2.2 `Identity` 也应该是文件，而不是拆开的散字段优先

用户身份不是零碎配置项的集合，而是 agent 持续理解用户的稳定主档。

更合理的模型是：

- `IDENTITY.md` 作为用户身份主档
- 包含姓名、互称、沟通偏好、角色、时区、长期背景、边界
- UI 默认预览整份 Markdown，进入编辑模式后直接编辑整篇文件

这会直接解决两个问题：

1. 用户终于有一个明确的“我是怎么被系统认识的”对象
2. 工程上可以继续保留字段级 patch，但那只是 derived editing model，不再是 source of truth

### 2.3 `Memory` 必须分成“活跃记忆文件”与“长期检索层”

这点不能含糊。

成熟 agent 系统里，记忆至少应该分两层：

1. **活跃记忆**
   - 小、热、当前经常要被带进上下文
   - 适合文件形态，例如 `MEMORY.md`
2. **长期记忆**
   - 多、冷、需要检索
   - 适合索引 / 向量库 / 结构化数据库

所以我建议：

- `MEMORY.md`：当前活跃长期上下文的结构化摘要文件
- `memory-os` / 向量索引 / 数据库：长期稳定记忆与检索层

这里最重要的不是“是不是一定叫 `MEMORY.md`”，而是：

> **热上下文必须文件化、可检查、可版本化；但普通用户页面可以把它渲染成结构化 UI，而不是直接展示 Markdown 原文。冷记忆必须可检索，但不能直接裸露给用户。**

### 2.4 UI 必须从“配置台”重构成“资产浏览 + 轻编辑”

现在这些页面丑，不只是视觉不够精致，而是信息架构就错了。

你现在的页面像在说：

- 这里有一堆字段
- 这里有一些卡片
- 你自己理解它们之间的关系

成熟 agent 产品会这么做：

- 先展示“这是什么资产”
- 再展示“当前状态”
- 最后提供“局部修改入口”

也就是说，UI 主体应该是：

- 文档资产感
- 清晰层级
- 轻交互、重阅读
- Identity / Soul 走整篇 Markdown 预览与编辑双态；Memory 以结构化阅读为主，不让普通用户手动直接维护

---

## 3. 外部参考研究：我采纳什么，不采纳什么

你提到要参考 Hermes 和 OpenClaw。这方向是对的，但不能无脑抄。

本节参考的公开资料主要来自：

- Hermes Persistent Memory  
  - https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
- Hermes Use SOUL.md with Hermes  
  - https://hermes-agent.nousresearch.com/docs/guides/use-soul-with-hermes/
- OpenClaw Memory Overview  
  - https://docs.openclaw.ai/concepts/memory
- OpenClaw Active Memory  
  - https://docs.openclaw.ai/concepts/active-memory

### 3.1 从 Hermes 里采纳什么

Hermes 的值得学的地方：

1. `Soul` 是明确的一等概念，不是普通设置残片。
2. memory 有“始终在场的稳定层”和“按需检索层”的区分。
3. 用户长期偏好与 agent 行为约束，会进入运行时默认上下文，而不是只待在设置页里。
4. 它把长期人格和长期记忆都做成真实文件，而不是先从数据库字段长出 UI。

Hermes 公开文档里很明确：

- `SOUL.md` 是 primary identity
- 持久记忆由 `MEMORY.md` 与 `USER.md` 两个文件组成
- 两个文件都会在 session 开始时以 frozen snapshot 方式进入系统 prompt

我认同的部分：

- `Soul` 应该是稳定资产
- 用户显式声明应该直接写稳定主档
- runtime 应该天然带上 identity/soul，而不是靠 recall 碰运气

我不采纳的部分：

- 过度依赖抽象术语向用户解释内部机制
- 把某些内部调优概念直接产品化

### 3.2 从 OpenClaw 里采纳什么

OpenClaw 值得学的地方：

1. 文件原生资产非常强。
2. `MEMORY.md` / 工作日志 / 结构化文件的存在，让 agent 状态具备可读性与可操作性。
3. 工作区、文件、长期上下文之间关系比较自然。
4. 它不是把文件和向量检索对立起来，而是把向量索引建在文件之上。

OpenClaw 的公开文档里给出的方向也很清楚：

- `MEMORY.md` 与 `memory/*.md` 是记忆资产层
- active memory 是一个在主回复前运行的 bounded blocking memory sub-agent
- memory search / semantic index 建立在这些 workspace Markdown 文件之上

我认同的部分：

- 用文件作为长期资产载体
- 用索引层服务检索，而不是反过来让数据库字段支配产品模型
- 用文档和目录建立“这个 agent 到底记得什么”的直觉

我不采纳的部分：

- 把太多内部工作文件直接暴露给普通用户
- 把偏工程化的目录心智强加给非工程用户

### 3.3 最终取舍

我建议的 Nion 路线不是照抄 Hermes，也不是照抄 OpenClaw，而是：

- **产品心智学 Hermes**
- **资产形态学 OpenClaw**
- **运行时分层坚持你们自己已经明确过的 Memory / Identity / Soul / Orchestration 边界**

一句话：

> Nion 应该做成“文件原生的长期上下文系统”，而不是“数据库字段驱动的设置台”。

这里还有一个必须说清楚的取舍：

- Hermes 的 `SOUL.md` 更偏实例级全局人格文件
- OpenClaw 的 `MEMORY.md` / `memory/YYYY-MM-DD.md` 更偏 agent workspace 内的文件宇宙

Nion 不应该简单二选一。

我建议的落点是：

- `SOUL.md` / `IDENTITY.md` / `MEMORY.md` 保留文件原生形态
- 但它们应该归属于 **Nion 当前运行时上下文 / 用户工作区**，不是简单抄成一个全局 home 目录单文件模型
- 这样既保留“文件即资产”的成熟心智，也不破坏你们已经建立起来的 workspace / runtime / thread 模型

---

## 4. 重构后的目标模型

## 4.1 四个 owner

这轮重构后，系统要严格只剩这四个 owner：

### A. Identity Owner

负责：

- 用户是谁
- 双方如何互称
- 用户长期沟通偏好
- 用户角色、时区、长期背景、互动边界

权威资产：

- `IDENTITY.md`

### B. Soul Owner

负责：

- 助手的长期人格
- 说话方式
- 价值观 / 边界
- 关系基调

权威资产：

- `SOUL.md`

### C. Memory Owner

负责：

- 当前活跃上下文摘要
- 长期结构化记忆
- 检索与召回

权威资产：

- `MEMORY.md` 作为活跃记忆文件
- `memory-os` / 向量索引 / 结构化存储作为长期记忆层

### D. Orchestration Owner

负责：

- 子智能体调度
- A2A / ACP transport
- child work products

不负责：

- 直接生成最终用户人格化回复

---

## 4.2 文件原生资产模型

我建议在 runtime / workspace 数据目录下，引入明确的文件原生资产层。

建议结构：

```text
runtime-context/
  identity/
    IDENTITY.md
  soul/
    SOUL.md
  memory/
    MEMORY.md
    active/
      snapshots/
    archive/
      YYYY-MM-DD.md
```

### `IDENTITY.md`

建议结构：

```md
# Identity

## Core
- User name: 张天成
- Preferred address: 大哥
- Assistant self name: 小老弟
- Mutual addressing: 你叫我大哥，我叫你小老弟

## Preferences
- 先给结论
- 直接一点

## Boundaries
- 不要替我拍板
- 少施压

## Background
- Role: 财务 BP
- Timezone: Asia/Shanghai
- Long-term background: 长期负责经营分析与月度复盘。
```

要求：

- 对用户可读
- 对 agent 可注入
- 对系统可解析
- 页面默认以 Markdown 预览模式打开
- 用户进入编辑模式后，编辑整篇 `IDENTITY.md`

### `SOUL.md`

建议结构：

```md
# Soul

## Core Identity
长期陪伴、克制稳定、结论先行。

## Speech Style
先给结论，再补上下文。表达直接，但不粗暴。

## Values And Boundaries
不替用户做最终判断。提醒风险，但不越权拍板。

## Relationship Stance
低刺激、少施压、稳定陪伴。
```

要求：

- 不拆成碎字段作为主存储
- UI 默认预览整篇 `SOUL.md`
- 用户进入编辑模式后，编辑整篇 `SOUL.md`
- 保存后直接生效
- 运行时读取 compiled profile，但 source of truth 是文档

### `MEMORY.md`

这不是“全量长期记忆备份”，而是**热记忆文件**。

建议结构：

```md
# Active Memory

## Identity Highlights
- 用户叫张天成
- 用户希望被称呼为大哥
- 用户习惯先给结论

## Long-Term Context
- 长期负责经营分析与财务复盘

## Current Stable Facts
- 用户喜欢结构化记忆
- 当前系统中需要保持低刺激协作方式
```

要求：

- 小
- 热
- 可读
- 适合直接进 prompt
- 底层是 Markdown 文档，产品面默认渲染成结构化阅读页
- 当前阶段不让普通用户手动直接编辑

### 长期记忆层

长期记忆继续放在结构化存储与向量索引：

- facts
- background
- episode
- evidence
- procedures

但这些不再直接等于产品面，也不再直接等于 UI 主资产。

---

## 5. 存储与运行时关系

这轮重构最关键的一个原则：

> 文件是主资产，数据库是索引与投影，不反过来。

也就是说：

1. `IDENTITY.md` / `SOUL.md` / `MEMORY.md` 是用户和 agent 真正“看到的东西”
2. 数据库存的是：
   - 结构化投影
   - 检索索引
   - 历史版本
   - 向量 embedding
3. runtime 注入优先从文件资产和编译产物取值
4. 不再让 UI 围绕数据库字段长出来

### 运行时注入顺序

```text
RuntimeContextBundle
1. IDENTITY.md compiled summary
2. SOUL.md compiled summary
3. adaptive overlay
4. MEMORY.md active summary
5. retrieved long-term memories
6. procedures / evidence / scoped recall
```

这里的关键区别是：

- `IDENTITY.md` / `SOUL.md` / `MEMORY.md` 是静态热资产
- 向量检索是动态补充

不是反过来。

---

## 6. UI / 交互重构原则

## 6.1 先把“资产”展示出来，再谈编辑

你现在的页面最大的问题，是一上来就把一堆输入框和小卡片扔给用户。

正确方式应该是：

1. 先看到这是什么资产
2. 再看到当前内容
3. 最后决定局部改什么

所以新的页面主形态应该是：

- **文档浏览器**
- **整文编辑器**
- **状态总览**

而不是：

- **字段表单墙**

## 6.2 页面要有“主视觉对象”

### Memory 页面

主视觉对象应该是：

- 结构化的活跃记忆阅读区（底层对应 `MEMORY.md`）
- 三类长期记忆摘要

不是统计卡片堆。

### Identity 页面

主视觉对象应该是：

- `IDENTITY.md` 文档预览
- Markdown 双态切换：预览 / 编辑
- 整篇文档保存后立即生效

### Soul 页面

主视觉对象应该是：

- `SOUL.md` 文档预览
- Markdown 双态切换：预览 / 编辑
- 当前 overlay 状态的弱提示

不是四张孤零零的大卡片。

## 6.3 交互应该像“编辑整篇文档”，不是“填后台表”

正确交互：

- 默认进入 Markdown 预览模式
- 点击“编辑文档” -> 进入整篇文档编辑模式
- 保存 -> 回写文件 -> 实时更新编译视图 -> 立即生效

而不是：

- 页面一打开到处都是 textarea
- 每块一个保存按钮
- 用户像在维护 CMS

这太丑，也太没气质。

## 6.4 页面视觉语言要更像主流 agent 产品

我建议的方向：

- 大留白
- 强文档感
- 卡片减少
- 层级更克制
- 采用“文档 + 片段状态”布局
- secondary controls 弱化
- 把系统动作藏到局部 hover / action bar

你给的截图里现在的问题很明显：

- 边框太多
- 卡片太多
- 层级同质化
- 大块空白没有被设计，只是“没内容”
- 页面没有一个真正的主对象

换句话说，不是“设计不够精”，是根本没构图。

---

## 7. 目标页面设计

## 7.1 Memory 页面

### 目标心智

“这是系统当前真正带着的记忆，而不是后台面板。”

### 目标结构

```text
Memory
├─ Hero: Active Memory
│  ├─ Structured active memory view
│  └─ 最近更新时间 / 热记忆条数 / 当前作用范围
├─ Long-Term Memory Sections
│  ├─ Identity highlights
│  ├─ Long-term background
│  └─ Stable facts
└─ Retrieval status (弱化显示)
```

### 交互

- 默认看到结构化阅读页
- 底层资产仍然是 `MEMORY.md`
- 下方三组长期记忆是 secondary
- 每条记忆可展开看来源与更新时间
- 不提供“导入/导出/删除/手改”产品动作
- 当前阶段不提供用户直接编辑 `MEMORY.md`
- 如果要纠正，直接给一个“去对话里纠正”的轻链接提示

### 视觉方向

- Hero 像文档封面，而不是 KPI 卡片
- 内容块数量减少
- 一屏内重点只有一个：Active Memory

## 7.2 Identity 页面

### 目标心智

“这是 agent 理解我的身份主档。”

### 目标结构

```text
Identity
├─ Hero: IDENTITY.md preview
├─ Mode switch: Preview / Edit
└─ Single Markdown document surface
```

### 交互

- 主页面默认展示 `IDENTITY.md` 的 Markdown 预览
- 点击“编辑文档”后，切换到整篇 Markdown 编辑模式
- 保存后：
  - 更新 `IDENTITY.md`
  - 更新 parsed projection
  - 更新 runtime compiled bundle

### 视觉方向

- 主体是文档
- 字段编辑是附属
- Badge 只用来提示同步状态，不是页面主角

## 7.3 Soul 页面

### 目标心智

“这是这个 agent 的长期灵魂文件。”

### 目标结构

```text
Soul
├─ Hero: SOUL.md preview
├─ Mode switch: Preview / Edit
├─ Adaptive Overlay (弱提示)
└─ Single Markdown document surface
```

### 交互

- 默认看 `SOUL.md` 的 Markdown 预览
- 点击“编辑文档”后，进入整篇 Markdown 编辑模式
- 如果有 overlay，只在页面顶部弱提示：
  - 当前存在临时表达层
  - 不和 stable soul 混显示

### 视觉方向

- 把 Soul 做成“文档资产页”
- 别再做成四块 textarea 的墙

## 7.4 Memory 设置页

这个页面现在的问题是混得太多：

- embedding provider
- 索引状态
- 打开记忆
- 改长期信息
- 改 soul

它其实不应该叫 Memory Settings，而应该收成：

### 方案

- `Memory Settings` 只保留索引 / embedding / retrieval 系统设置
- `Open Memory`
- `Open Identity`
- `Open Soul`

这三个不再作为大卡片堆叠，而是顶部切换入口或工具条。

换句话说：

- “看内容”去内容页
- “配检索系统”来 settings

别继续把导航和内容混成一个页面。

---

## 8. 工程落地方案

## 8.1 Backend 结构

新增建议：

```text
backend/packages/harness/nion/runtime_context/files/
  identity_file.py
  soul_file.py
  memory_file.py
  compiler.py
```

职责：

- 读写 `IDENTITY.md`
- 读写 `SOUL.md`
- 读写 `MEMORY.md`
- 编译成 runtime bundle

### 现有服务的改造方向

- `UserIdentityService`
  - 从“直接存 JSON 主档”改成“文件主档 + 结构化投影”
- `SoulSettingsService`
  - 从“字段 patch 优先”改成“文件主档 + 整文编辑”
- `MemoryReadService`
  - 生成产品面分组视图
  - 同时维护 `MEMORY.md`

### 数据层

- `IDENTITY.md` / `SOUL.md` / `MEMORY.md` 为 source of truth
- repository / sqlite / vector 为 projection layer

## 8.2 API 设计

建议目标：

```text
GET   /api/identity/document
PUT   /api/identity/document

GET   /api/soul/document
PUT   /api/soul/document

GET   /api/memory

GET   /api/internal/memory/index
PATCH /api/internal/memory/index
POST  /api/internal/memory/rebuild
```

产品面看到的是 document + grouped memory view。  
internal settings 看到的是索引和 provider。

## 8.3 Frontend 结构

建议新增：

```text
frontend/src/components/workspace/documents/
  document-hero.tsx
  markdown-document-view.tsx
  markdown-document-editor.tsx
  sync-status-badge.tsx
```

然后：

- `IdentitySettingsPage` 重做成文档预览页
- `SoulSettingsPage` 重做成文档预览页
- `MemoryHomePage` 重做成 active memory + long-term sections

不再让每页自己手搓一堆卡片。

---

## 9. 分阶段迁移路线

### Phase A：先把设计和边界冻结

1. 写合同测试
2. 确认新文件模型
3. 确认新页面 IA

### Phase B：把文件原生主档建起来

1. 建 `IDENTITY.md`
2. 建 `SOUL.md`
3. 建 `MEMORY.md`
4. 做 compile / parse 层

### Phase C：让设置页变成文档编辑器

1. Identity 页面重构
2. Soul 页面重构
3. Memory 页面重构

### Phase D：让 runtime 正式切换到文件主档

1. runtime bundle 优先读 compiled document artifacts
2. vector recall 作为补充层
3. 删除错误 fallback

### Phase E：清 compat 和旧 UI 壳

1. 退休旧字段直写主链
2. 退休错误合同测试
3. 删除多余卡片式旧页面结构

---

## 10. 我明确建议不做的事

1. 不要继续把 `Soul` 主存储维持成多个数据库字段。
2. 不要继续让 `Identity` 只有 JSON patch 而没有文档实体。
3. 不要把 `MEMORY.md` 做成全量长期记忆 dump。
4. 不要让 embedding/provider/index settings 继续和内容展示页面混在一起。
5. 不要再给这些页面加更多解释文案来弥补信息架构错误。

最后一条很重要：

> 页面丑的时候，往上加说明文字，通常只是把丑解释得更详细。

---

## 11. 最终结论

这轮重构应该明确采用：

### 存储模型

- `SOUL.md` 作为灵魂主档
- `IDENTITY.md` 作为身份主档
- `MEMORY.md` 作为活跃记忆主档
- 向量库 / sqlite / 结构化存储作为长期记忆与检索层

### 产品模型

- Memory 是“当前记住了什么”
- Identity 是“系统如何认识你”
- Soul 是“助手长期怎么表现”
- Memory settings 是“检索系统怎么工作”

### 交互模型

- 主体看文档
- 局部做编辑
- 保存即编译
- runtime 默认注入文件编译产物

### 参考策略

- Hermes：学产品心智和稳定层默认在场
- OpenClaw：学文件原生资产与热记忆文档
- Nion：保留自己已经建立起来的 owner 边界，不再回到“字段驱动的设置台”

一句话总结：

> Nion 的 Memory / Identity / Soul 不该继续长成一堆数据库字段加表单卡片，而应该重构成“文件原生的长期上下文系统”，页面围绕文档资产设计，runtime 围绕文档编译产物与检索层组织。

这才像一个成熟 agent，而不是一个会说话的后台配置页。

---

## 12. 下一步执行建议

如果按这份设计继续推进，推荐直接拆成三个连续 implementation plan：

1. `文件主档与编译层`
   - 建立 `IDENTITY.md` / `SOUL.md` / `MEMORY.md`
   - 建立 parse / compile / projection 层

2. `产品面与交互重构`
   - 重做 Memory / Identity / Soul 页面
   - 从卡片堆切到文档预览 + 整文编辑双态

3. `runtime 与 retrieval 切换`
   - runtime 以文件编译产物为主
   - 向量 / sqlite / recall 作为补充层
   - 清 compat 与旧字段直写主链
