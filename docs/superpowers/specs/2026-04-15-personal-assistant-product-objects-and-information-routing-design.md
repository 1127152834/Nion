# Nion 个人助手产品对象与信息路由重构指导

日期：2026-04-15
状态：重构/优化指导文档
范围：`Notebook / Knowledge / Memory / USER.md / IDENTITY.md / SOUL.md / Automation / Agent behavior routing`

---

## 1. 文档目的

这份文档用于指导 Nion 从“功能强大的 agent runtime / platform”进一步收敛成一个成熟、稳定、安全、可长期依赖的个人办公生活助手。

本文件不是讨论某个页面怎么改，也不是补一个接口，而是给出更高层的产品对象合同和信息路由合同。后续所有实现、页面、API、runtime prompt、middleware、自动化、知识库编译，都应该以这份合同为准。

核心目标：

1. 让用户能清楚理解自己的材料、知识、记忆、助手身份和助手行为分别在哪里。
2. 让 agent 在每次输入后知道应该写哪里、读哪里、是否需要用户确认。
3. 防止 Notebook / Knowledge / Memory / USER / IDENTITY / SOUL 继续局部正确、整体分裂。
4. 让 Automation 从 job scheduler 收口成“助手持续承诺”。
5. 让产品层用更少、更稳定的对象承载复杂 runtime 能力。

### 1.1 文档优先级与废弃声明

本文件是当前阶段关于以下主题的上位产品合同：

- `Notebook / Knowledge / Memory`
- `USER.md / IDENTITY.md / SOUL.md / MEMORY.md`
- `Information Routing Contract`
- `Automation` 作为个人助手持续承诺的产品语义

当本文件与以下旧文档冲突时，以本文件为准：

- `docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md`
- `docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md`
- `docs/superpowers/specs/2026-04-15-nion-llm-wiki-knowledge-module-redesign.md`

显式废弃的旧表述包括：

1. 把 `IDENTITY.md` 视作用户身份主档。
2. 把 `Knowledge` 视作可独立创建、可直接编辑的用户资产空间。
3. 把 `Automation` 的主要产品语义定义为 job scheduler。
4. 把 Notebook / Knowledge / Memory 当成三个平级长期内容空间。

---

## 2. 已确认的新产品定义

### 2.1 Notebook

Notebook 是用户资产层。

它承载：

- 用户手写笔记
- 收件箱闪记
- 会议记录
- 文档草稿
- 聊天中显式保存的内容
- 工作区 artifact 的显式副本
- 用户认为值得保留但尚未结构化的材料

Notebook 的关键性质：

- 用户拥有
- 用户可直接编辑
- agent 不应默认全局主动检索
- 可作为 Knowledge 的原始来源
- 不是 agent memory
- 不是 agent diary

一句话定义：

> Notebook 是用户的原始材料箱。

### 2.2 Knowledge

Knowledge 是从 Notebook 经过用户授权、agent 编译后形成的 LLM Wiki。

它承载：

- 从 Notebook 中提炼出的 source pages
- concepts
- entities
- syntheses
- overviews
- links / graph
- 可被 agent 查询引用的长期知识

Knowledge 的关键性质：

- 它不是 Notebook 之外的另一个用户资产空间
- 它不能直接手工创建为独立内容
- 它必须有 Notebook source provenance
- 它不是传统向量数据库
- 它的本体是 LLM Wiki 页面，索引 / 图谱 / 向量只是 projection

一句话定义：

> Knowledge 是 Notebook 的编译产物，不是另一个 Notebook。

### 2.3 Memory

Memory 是 agent 从聊天、互动、任务执行中形成的长期记忆。

它承载：

- 用户事实
- 用户偏好
- 重要事件
- 长期背景
- 互动习惯
- 关系约定
- agent 在长期协作中形成的稳定经验

Memory 的关键性质：

- 来源主要是 conversation / task execution
- agent 可在明确规则下写入
- 用户可查看和治理
- 不存储用户原始长文档
- 不替代 Notebook
- 不等于 Knowledge

一句话定义：

> Memory 是助手根据互动形成的长期认识。

### 2.4 USER.md

`USER.md` 是用户身份主档。

它承载：

- 用户姓名
- 用户别名
- 用户角色
- 时区
- 长期背景
- 用户沟通偏好
- 用户互动边界
- 用户希望被如何称呼
- 用户对助手称谓的约定中属于用户侧的信息

一句话定义：

> USER.md 回答“用户是谁”。

### 2.5 IDENTITY.md

`IDENTITY.md` 是助手身份主档。

它承载：

- 助手是谁
- 助手的使命
- 助手与用户之间的长期关系定位
- 助手默认承担的角色
- 助手不是谁
- 助手长期自我认同

一句话定义：

> IDENTITY.md 回答“这个助手认为自己是谁”。

### 2.6 SOUL.md

`SOUL.md` 是助手行为与人格主档。

它承载：

- 说话方式
- 语气
- 主动性边界
- 价值边界
- 决策风格
- 陪伴方式
- 与用户互动时的长期行为原则

一句话定义：

> SOUL.md 回答“这个助手应该怎样行动和表达”。

### 2.7 IDENTITY.md + SOUL.md 的关系

`IDENTITY.md` 和 `SOUL.md` 合起来构成助手的完整人格。

```text
IDENTITY.md = 我是谁 / 我的使命 / 我的关系定位
SOUL.md     = 我如何说话 / 如何判断 / 如何行动
```

不要把二者混成一个文件。身份与行为应分开，否则后续很难处理“助手身份不变，但表达方式变化”或“使命变化，但语气不变”这类场景。

---

## 3. 当前命名与语义需要纠偏

### 3.1 UserIdentityProfile 命名问题

当前系统中 `UserIdentityProfile` 指的是用户身份。这个名字在代码层可以暂时保留，但产品语义上应逐步改为：

- `UserProfile`
- `UserDocument`
- `USER.md`

因为在新合同中：

- `USER.md` 是用户身份
- `IDENTITY.md` 是助手身份

如果继续把“用户身份”简称为 identity，团队会继续误解 `IDENTITY.md` 的归属。

### 3.2 现有 IDENTITY.md 语义必须重切

如果当前 `identity_document` 路由或 UI 仍把 `IDENTITY.md` 当作用户身份文件，需要重构。

新的语义是：

- `/api/user-identity` 或未来 `/api/user/document` 管 `USER.md`
- `/api/identity/document` 管助手身份 `IDENTITY.md`
- `/api/soul/document` 管助手行为 `SOUL.md`

### 3.3 Compatibility / Migration Contract

这次重构不能靠“从今天开始大家口头上都换个叫法”。必须提供明确迁移策略。

#### 短期兼容阶段

保留现有：

- `UserIdentityProfile`
- `/api/user-identity`
- `/api/identity/document`
- `/api/soul/document`

但语义规则改为：

- `UserIdentityProfile` 在代码层暂时保留，产品语义一律解释为 `User Profile`
- `/api/user-identity` 继续作为结构化用户身份写接口
- `/api/identity/document` 进入助手身份语义
- `/api/soul/document` 继续承载助手行为语义

#### 迁移阶段要求

必须新增：

1. `USER.md` 文件 owner
2. user-facing / runtime-facing migration adapter
3. 历史 identity 数据迁移脚本
4. compat tests
5. deprecation timeline

#### 验收标准

1. 没有任何新代码再把 `identity` 当成 user identity。
2. 旧接口可继续工作，但其文案和 contract 已更新到新语义。
3. runtime 注入时，`USER` 与 `IDENTITY` 的 owner 不再混淆。

---

## 4. 三类长期内容系统的最终命运

### 4.1 Notebook 的最终命运

Notebook 保持为用户原始资产空间。

未来应该强化：

- inbox-first capture
- 快速保存聊天片段
- 归档 artifact
- 版本历史
- 笔记助手
- 手动送入 Knowledge

未来不应该强化：

- 全局后台被 agent 随机搜索
- 自动变成 memory
- 自动变成 knowledge
- 直接承载 knowledge graph

### 4.2 Knowledge 的最终命运

Knowledge 应成为 Notebook 之上的编译层。

未来应该强化：

- source candidate
- compile queue
- activity log
- source provenance
- stale / archived / source missing 状态
- LLM Wiki page tree
- graph
- query
- citations
- synthesis
- lint / contradiction detection

未来不应该强化：

- 手工直接编辑知识页正文
- 用户直接创建独立 knowledge item
- 作为传统 RAG 向量库管理面
- 替代 Notebook
- 替代 Memory

### 4.3 Memory 的最终命运

Memory 应成为 assistant long-term memory。

未来应该强化：

- 从聊天中提取稳定用户事实
- 从任务执行中提取长期经验
- 用户可查看、纠正、遗忘
- 与 USER.md / IDENTITY.md / SOUL.md 明确分层
- runtime 默认注入热记忆
- 检索长期记忆

未来不应该强化：

- 保存长文档
- 保存 Notebook 原文
- 保存 Knowledge 页面全文
- 变成资料库
- 变成治理控制台

---

## 5. Information Routing Contract

这是本文件最重要的部分。后续所有 agent 输入都应该通过信息路由合同判断目标。

### 5.1 路由输出格式

建议所有路由判断统一输出：

```json
{
  "target": "USER.md | IDENTITY.md | SOUL.md | MEMORY.md | Notebook | Knowledge | Automation | current_turn_only",
  "confidence": 0.0,
  "reason": "为什么归入该目标",
  "evidence": "原始用户话语或上下文证据",
  "write_policy": "none | direct_patch | save_raw | compile_candidate | suggest_then_confirm",
  "confirmation_required": true
}
```

### 5.1.1 Route Decision 类型族

上面的 envelope 不足以直接驱动后续写入。
实际落地时必须使用 target-specific payload schema。

建议采用 discriminated union：

```ts
type InformationRouteDecision =
  | CurrentTurnOnlyRouteDecision
  | UserRouteDecision
  | IdentityRouteDecision
  | SoulRouteDecision
  | MemoryRouteDecision
  | NotebookRouteDecision
  | KnowledgeRouteDecision
  | AutomationRouteDecision;
```

所有 route decision 的共有字段：

```ts
type BaseRouteDecision = {
  target:
    | "current_turn_only"
    | "USER.md"
    | "IDENTITY.md"
    | "SOUL.md"
    | "MEMORY.md"
    | "Notebook"
    | "Knowledge"
    | "Automation";
  confidence: number;
  reason: string;
  evidence: string;
  source_turn_id?: string;
  write_policy:
    | "none"
    | "direct_patch"
    | "save_raw"
    | "compile_candidate"
    | "suggest_then_confirm";
  confirmation_required: boolean;
};
```

### 5.1.2 Target-specific payload schema

#### USER.md

```ts
type UserRouteDecision = BaseRouteDecision & {
  target: "USER.md";
  payload: {
    field_patches: Partial<{
      user_name: string;
      user_aliases: string[];
      preferred_address_for_user: string;
      assistant_self_name: string;
      mutual_addressing_rule: string;
      communication_style_preferences: string[];
      user_role: string;
      timezone: string;
      interaction_boundaries: string[];
      long_term_background_summary: string;
    }>;
  };
};
```

#### IDENTITY.md

```ts
type IdentityRouteDecision = BaseRouteDecision & {
  target: "IDENTITY.md";
  payload: {
    patch_mode: "section_patch" | "document_patch";
    sections: Partial<{
      core_identity: string;
      mission: string;
      relationship_role: string;
      non_goals: string;
    }>;
  };
};
```

#### SOUL.md

```ts
type SoulRouteDecision = BaseRouteDecision & {
  target: "SOUL.md";
  payload: {
    patch_mode: "section_patch" | "document_patch";
    sections: Partial<{
      speech_style: string;
      values_and_boundaries: string;
      relationship_stance: string;
      initiative_policy: string;
      decision_style: string;
    }>;
  };
};
```

#### MEMORY.md

```ts
type MemoryRouteDecision = BaseRouteDecision & {
  target: "MEMORY.md";
  payload: {
    memory_kind:
      | "user_fact"
      | "user_preference"
      | "project_fact"
      | "interaction_fact"
      | "task_lesson";
    summary: string;
    provenance_refs?: string[];
  };
};
```

#### Notebook

```ts
type NotebookRouteDecision = BaseRouteDecision & {
  target: "Notebook";
  payload: {
    create_mode: "new_note" | "append_note" | "archive_asset";
    title?: string;
    directory?: string;
    body?: string;
    source_kind?: "chat" | "artifact" | "manual";
  };
};
```

#### Knowledge

```ts
type KnowledgeRouteDecision = BaseRouteDecision & {
  target: "Knowledge";
  payload: {
    source_note_id?: string;
    source_asset_id?: string;
    compile_intent: "new_candidate" | "recompile" | "revision_request";
    candidate_reason: string;
  };
};
```

#### Automation

```ts
type AutomationRouteDecision = BaseRouteDecision & {
  target: "Automation";
  payload: {
    commitment_kind: "user_created" | "agent_suggested" | "agent_maintenance";
    intent: string;
    schedule: {
      kind: "once" | "interval" | "cron";
      value: string;
      timezone?: string;
    };
    input_scopes: string[];
    write_scopes: string[];
    delivery_scopes: string[];
    failure_policy: "notify_user" | "silent_retry" | "internal_only";
  };
};
```

### 5.2 路由规则总表

| 输入类型 | 目标 | 是否需要确认 | 说明 |
| --- | --- | --- | --- |
| 普通一次性任务 | `current_turn_only` | 否 | 不写长期层 |
| 用户姓名、别名、角色、时区 | `USER.md` | 否，若明确表达 | 用户身份 |
| 用户长期沟通偏好 | `USER.md` + 可投影到 `SOUL.md` | 视语义 | “我喜欢你直接”是 USER；“你以后直接回答”是 SOUL |
| 助手身份、使命、关系定位 | `IDENTITY.md` | 通常否，若明确命令 | 助手自我认同 |
| 助手说话方式、价值边界、行为风格 | `SOUL.md` | 通常否，若明确命令 | 助手行为人格 |
| 互动事实、长期事件、项目背景 | `MEMORY.md` | 通常否 | 聊天产生的长期记忆 |
| 用户原始材料、会议记录、草稿 | `Notebook` | 否，若用户要求保存 | 用户资产 |
| 用户要求沉淀知识 | `Knowledge` from Notebook | 是 | 必须有 Notebook source |
| 定时提醒、周期总结、长期跟进 | `Automation` | 是，除非用户明确命令 | 持续承诺 |

### 5.3 USER 与 SOUL 的 precedence 规则

当同一句输入既表达了用户偏好，又表达了助手行为要求时，允许双写，但 owner 不同：

1. `USER.md` 记录“用户偏好来源”
2. `SOUL.md` 记录“助手执行规则”
3. runtime 行为以 `SOUL.md` 为准
4. `MEMORY.md` 只记录相关事件或长期背景，不承载行为执行规则

例如：

> “我不喜欢废话，以后你直接点。”

应拆成：

- `USER.md`: 用户偏好直接、厌恶废话
- `SOUL.md`: 回答先给结论、压缩客套

### 5.4 Read Routing Contract

除了写入路由，还必须显式定义读取优先级。
建议按任务类型定义默认读取顺序：

| 任务类型 | 默认读取优先级 |
| --- | --- |
| 用户身份问题 | `USER.md -> MEMORY.md` |
| 助手身份问题 | `IDENTITY.md -> SOUL.md` |
| 助手行为/风格问题 | `SOUL.md -> USER.md preference source` |
| 当前关系/称谓问题 | `USER.md -> MEMORY.md` |
| 用户历史事实问题 | `MEMORY.md -> session recall` |
| 专业知识/沉淀知识问题 | `Knowledge -> Notebook (仅显式授权)` |
| 当前笔记相关问题 | `current Notebook note -> Notebook search (显式)` |
| 自动化任务运行 | `Automation input scopes -> USER/IDENTITY/SOUL/MEMORY/Knowledge/Notebook` |

全局原则：

1. 没有显式授权时，不默认全局读取 Notebook。
2. Knowledge query 优先于 Notebook raw search，除非用户明确要求原文。
3. `SOUL.md` 是行为执行权威，`USER.md` 是偏好来源，不可倒置。

---

## 6. 典型场景路由

### 6.1 “我叫张天成”

目标：

- `USER.md`

原因：

- 用户身份事实

不应写：

- Knowledge
- Notebook
- SOUL.md
- IDENTITY.md

### 6.2 “你以后叫我大哥，我叫你小老弟”

目标：

- `USER.md`

原因：

- 用户与助手之间的互称契约，属于用户关系配置

可投影：

- runtime greeting / address behavior

### 6.3 “你是我的长期办公生活助手，不是编码助手”

目标：

- `IDENTITY.md`

原因：

- 用户在定义助手身份与使命

可辅助写入：

- `MEMORY.md` 记录一次重大产品定位决策

### 6.4 “以后回答直接点，不要讨好我”

目标：

- `SOUL.md`

原因：

- 用户在定义助手行为方式

可辅助写入：

- `USER.md` 记录用户沟通偏好：“用户偏好直接沟通”

注意：

- runtime 行为应以 SOUL.md 为准
- USER.md 是 preference source，不是行为执行规则

### 6.5 “我现在做 Nion，目标是个人办公生活助手”

目标：

- `MEMORY.md`

原因：

- 项目长期事实和上下文背景

不应写：

- Knowledge，除非用户要求整理成知识页

### 6.6 “把这段会议记录保存下来”

目标：

- `Notebook`

原因：

- 用户原始材料

不应写：

- Memory
- Knowledge

### 6.7 “这篇笔记很重要，沉淀成知识库”

目标：

- `Knowledge compile candidate`

前提：

- 必须已有 Notebook source

流程：

1. 读取 source note
2. 创建 source candidate
3. 进入 compile queue
4. 生成 LLM Wiki page
5. 建 source provenance
6. 可选用户确认

### 6.8 “每天早上帮我整理今天要做的事”

目标：

- `Automation`

原因：

- 周期性助手承诺

要求：

- 明确时间
- 明确输出
- 明确使用哪些信息源
- 明确是否允许访问 Notebook/Knowledge/Memory

---

## 7. Notebook -> Knowledge Promotion Contract

### 7.1 硬规则

Knowledge 只能从 Notebook promotion 产生。

不允许：

- 用户直接新建 Knowledge page
- agent 直接把聊天内容写 Knowledge
- API 绕过 Notebook source 创建 Knowledge
- 把 vector index 当 Knowledge 本体

允许：

- 用户把 Notebook note 送入 Knowledge
- 用户把 Notebook asset 送入 Knowledge
- agent 建议“这篇笔记值得沉淀”，但必须用户确认

### 7.2 Promotion 流程

```text
Notebook note / asset
  -> user selects "沉淀为知识"
  -> create KnowledgeSourceCandidate
  -> compile job
  -> generated wiki pages
  -> graph/index projection
  -> query/citation ready
```

### 7.3 Provenance 要求

每个 Knowledge page 必须记录：

- source note id / asset id
- source path
- source content hash
- compile job id
- created_at
- updated_at
- stale state

### 7.4 Notebook 变更后的行为

当原始 Notebook 内容变更：

- Knowledge page 不应静默更新
- 关联 source candidate 标记为 `stale`
- 用户或 agent 可建议 recompile

### 7.5 Notebook 删除后的行为

当原始 Notebook 被删除：

- Knowledge page 标记为 `source_missing`
- 不立即删除
- 若无引用、无近期查询命中、用户确认，才可清理

### 7.6 Knowledge Revision Request Contract

Knowledge 不能直接编辑正文，但必须允许用户纠错。

新增对象：

```ts
type KnowledgeRevisionRequest = {
  request_id: string;
  page_id: string;
  source_note_id?: string;
  source_asset_id?: string;
  reason: string;
  requested_action:
    | "fix_source_then_recompile"
    | "append_correction_note"
    | "recompile"
    | "archive_page";
  created_at: string;
  status: "pending" | "accepted" | "dismissed" | "completed";
};
```

用户对 Knowledge 的纠错流程必须是：

`page -> revision request -> source repair / correction note / recompile`

而不是：

`page -> direct body edit`

---

## 8. USER / IDENTITY / SOUL / MEMORY 写入合同

### 8.1 USER.md 写入

可直接写入：

- 用户姓名
- 用户别名
- 互称规则
- 用户角色
- 时区
- 用户长期背景
- 用户偏好
- 用户边界

禁止写入：

- 助手身份
- 助手使命
- 助手人格
- 专业知识全文
- 原始材料

### 8.2 IDENTITY.md 写入

可直接写入：

- 助手是谁
- 助手服务谁
- 助手使命
- 助手与用户关系定位
- 助手非目标身份

禁止写入：

- 用户个人事实
- 助手具体说话技巧
- 临时任务状态

### 8.3 SOUL.md 写入

可直接写入：

- 表达方式
- 语气
- 主动性边界
- 价值边界
- 互动风格
- 判断风格

禁止写入：

- 用户资料
- 文档内容
- 任务日志

### 8.4 MEMORY.md 写入

可写入：

- 聊天中形成的长期事实
- 用户明确决策
- 项目背景
- 反复出现的习惯
- 任务执行中学到的稳定经验

禁止写入：

- 原始长文档
- Notebook 内容副本
- Knowledge page 全文
- 短期任务进度
- 未经验证的猜测

---

## 9. Automation 重构指导：从 Job 到 Assistant Commitment

### 9.1 当前问题

Automation 后端合同已经很强，但产品语义仍偏 job scheduler。

用户不应该首先看到：

- job id
- schedule kind
- delivery mode
- owner_type
- mutability
- provenance fields

用户应该首先理解：

> 助手会持续替我做什么。

### 9.2 新产品对象：Assistant Commitment

建议将 Automation 在产品层改称为：

- 持续任务
- 助手承诺
- 自动跟进

每个持续任务用户可见字段应是：

- 它要帮我做什么
- 为什么创建
- 什么时候做
- 做完告诉我什么
- 会用哪些资料
- 是否会访问 Notebook / Knowledge / Memory
- 我能不能改
- 我怎么暂停
- 上次做得怎么样
- 下次什么时候做

### 9.3 三类持续任务

#### 用户创建任务

用户明确要求创建。

语义：

- owner = user
- editable = true

#### 助手建议任务

agent 发现重复需求后建议。

语义：

- owner = agent_suggested
- 必须用户确认
- 确认后转为 user-owned 或 agent-owned

#### 助手自维护任务

用于维护系统状态。

例如：

- 定期整理 Memory
- 检查 Knowledge stale pages
- 检查失败任务
- 生成复盘建议

语义：

- owner = agent
- 默认低打扰
- 必须可见、可暂停

### 9.4 Assistant Commitment 权限矩阵

每个持续任务都必须带有明确权限矩阵：

| 字段 | 说明 |
| --- | --- |
| `input_scopes` | 可读取哪些信息源，例如 `["USER", "SOUL", "Knowledge"]` |
| `write_scopes` | 可写哪些层，例如 `["internal_log"]`、`["AutomationStatus"]` |
| `delivery_scopes` | 可向哪里投递，例如 `["thread"]`、`["bridge:telegram"]` |
| `failure_policy` | 失败如何处理 |
| `confirmation_policy` | 创建、升级权限、外发消息时是否需要确认 |

建议默认矩阵：

#### 用户创建任务

- `input_scopes`: 显式选择
- `write_scopes`: `current_thread`, `task_output`, 可选 `Notebook`
- `delivery_scopes`: 用户选择
- `failure_policy`: 默认 `notify_user`

#### 助手建议任务

- `input_scopes`: 由建议时明确列出
- `write_scopes`: 默认不允许写 `USER / IDENTITY / SOUL / MEMORY`
- `delivery_scopes`: 用户确认后启用
- `failure_policy`: 默认 `notify_user`

#### 助手自维护任务

- `input_scopes`: `system_state`, `Memory`, `Knowledge metadata`
- `write_scopes`: `internal_log`, `maintenance_state`
- `delivery_scopes`: 默认无，仅在需要时摘要通知
- `failure_policy`: `internal_only` 或低频提醒

硬规则：

1. agent-owned 自维护任务不得默认写 `USER.md / IDENTITY.md / SOUL.md`
2. agent-owned 自维护任务不得默认外发高影响通知
3. delivery success 与 execution success 必须分开记录

---

## 10. AI 行为链收口

### 10.1 当前最大风险

不是单个模块不知道怎么做，而是用户一句话可能被多个模块同时解释为“自己能处理”。

例如：

> 以后回答直接点。

可能被解释为：

- USER preference
- SOUL behavior
- MEMORY fact
- Settings update

如果没有统一路由规则，就会局部都合理，整体不稳定。

### 10.2 新主链

```text
User Input / User Material / Agent Run Result
        |
        v
Information Router
        |
        +-- USER.md
        +-- IDENTITY.md
        +-- SOUL.md
        +-- MEMORY.md
        +-- Notebook
        +-- Knowledge
        +-- Automation
        +-- Current Turn Only
```

### 10.3 Router 必须输出审计信息

每次长期写入都必须有：

- target
- evidence
- reason
- confidence
- source turn id
- whether user confirmed

### 10.4 Router 应先确定性，后 LLM

第一阶段不要一上来全靠 LLM classifier。

建议顺序：

1. 规则匹配显式身份 / 称谓 / 保存 / 沉淀 / 定时任务
2. 低风险直接写入
3. 中风险生成 candidate
4. 高风险必须用户确认
5. LLM 只处理不明确场景

---

## 11. 安全与成熟度要求

### 11.1 写入安全

所有长期写入都必须可审计：

- who / what triggered it
- source text
- target layer
- timestamp
- confirmation status

### 11.2 Knowledge 安全

Knowledge 编译必须防止：

- 没有来源的知识页
- 幻觉来源
- source drift 后页面继续 active
- 用户以为 Notebook 改了 Knowledge 就自动改

### 11.3 Memory 安全

Memory 必须防止：

- 原文材料污染长期记忆
- 临时任务进度污染长期记忆
- agent 猜测用户偏好并固化
- `temporary_chat` 写入 durable memory

### 11.4 Automation 安全

持续任务必须防止：

- agent 静默创建高影响任务
- 定时任务继承不明确上下文
- delivery failure 被当成任务成功
- agent-owned automation 无法暂停

---

## 12. 分阶段实施建议

### Phase 0：冻结概念合同

产物：

- 本文件进入 approved/design 状态
- README / backend/CLAUDE / frontend 文档同步术语
- `USER.md / IDENTITY.md / SOUL.md / MEMORY.md` 定义写入项目主文档

验收：

- 不再把 user identity 称作 identity
- 不再把 Knowledge 说成独立用户资产空间
- 不再把 Automation 主要表述为 job scheduler
- 明确本文件对旧 spec 的优先级与废弃语义清单

### Phase 1：建立 Information Router

产物：

- `InformationRouteDecision` 模型
- target-specific payload schema
- 确定性 route rules
- route audit log
- router tests

验收：

- 用户姓名写 USER
- 助手身份写 IDENTITY
- 助手行为写 SOUL
- 原始材料写 Notebook
- 知识沉淀只产生 Knowledge candidate
- 普通任务不写长期层
- USER / SOUL precedence 可预测
- read routing 有明确默认顺序

### Phase 2：修正文件原生主档

产物：

- `USER.md`
- `IDENTITY.md`
- `SOUL.md`
- `MEMORY.md`
- 文件读写 owner
- runtime projection

验收：

- UI 和 runtime 都能说明每个文件的 owner
- 文件修改可进入 runtime
- runtime 不再混淆 user identity 与 assistant identity

### Phase 3：Notebook -> Knowledge promotion 主链

产物：

- source candidate
- compile queue
- activity log
- source provenance
- stale/source_missing 状态

验收：

- Knowledge 不能直接创建
- 每个 Knowledge page 都有 Notebook source
- Notebook 修改后 Knowledge 标记 stale
- Agent query 能引用 Knowledge page 与 source

### Phase 4：Automation 语义重构

产物：

- Assistant Commitment 产品模型
- 用户创建 / 助手建议 / 助手自维护 三类任务
- delivery status 与 execution status 分离
- agent-owned visibility / pause controls

验收：

- 用户看到的是“助手持续替我做什么”
- 后端仍保留 owner/provenance/mutability
- 但产品主文案不再暴露 job substrate

### Phase 5：产品入口收口

产物：

- 主导航重构
- 设置页高级项下沉
- Notebook / Knowledge / Memory 新入口层级

验收：

- 用户面对更少一级入口
- 高级 runtime/platform 能力不再抢占普通用户心智
- Settings 不再像 agent platform control panel

---

## 13. 关键验收题

重构后，系统必须能稳定回答：

1. 用户问“我是谁”，系统读哪里？
2. 用户问“你是谁”，系统读哪里？
3. 用户说“以后直接点”，系统写哪里？
4. 用户保存会议记录，系统写哪里？
5. 用户要求沉淀专业知识，系统从哪里到哪里？
6. agent 想记住用户事实，写哪里？
7. agent 想保存可复用流程，写哪里？
8. agent 想定期帮用户做事，写哪里？
9. Notebook 删除后 Knowledge 怎么办？
10. Knowledge stale 后 agent 查询时怎么提示？
11. temporary chat 能否写长期层？
12. agent-owned automation 用户如何暂停？

如果这些问题回答不稳定，说明产品和 runtime 还没收口。

---

## 14. 最终目标

最终 Nion 不应该让用户感觉自己在管理：

- memory system
- knowledge graph
- agent runtime
- bridge daemon
- skill registry
- automation scheduler

最终 Nion 应该让用户感觉自己拥有：

- 一个长期认识自己的助手
- 一个可靠的材料库
- 一个可查询的知识库
- 一组持续替自己办事的承诺
- 一个随时可达的个人电脑入口

所有复杂 runtime 都应该在这些对象背后工作，而不是跑到用户面前。
