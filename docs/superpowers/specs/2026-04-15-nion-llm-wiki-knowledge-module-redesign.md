# Nion Knowledge Module Redesign

日期：2026-04-15
状态：Draft for review
范围：`Notebook / Knowledge / Agent runtime / Query / Graph / Activity`
参考：`https://github.com/nashsu/llm_wiki`
关系：在 Knowledge 模块重设计范围内，本文件作为新的主设计文档，优先于 [2026-04-13-notebook-to-knowledge-base-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md) 中较早的局部表述

---

## 1. 问题定义

Nion 当前已经有了 `Notebook`、`Memory`、部分 `Knowledge` 页面与若干知识库相关能力，但它们还没有形成一个产品级、边界清晰、可被用户和 Agent 同时信任的知识系统。

当前主要问题不是“功能不够多”，而是模型不够对：

1. `Notebook` 里已经有原始内容、助手、转知识库动作，但用户很难看见一个真实存在、持续更新的知识库。
2. “转为知识库”过于瞬时，缺少可见的编译过程、失败状态、重试入口和活动记录。
3. 当前知识页、图谱、查询、Agent 调用和引用呈现还不够稳定，用户无法确认 Agent 是否真的利用了 Knowledge。
4. 如果继续把“知识库”做成 Notebook 边栏能力、Memory 替代品或一次性 RAG，就会再次把产品面、运行时面和治理面搅在一起。

这次重设计的目标不是照搬 `llm_wiki` 的全部功能，而是在 Nion 既有系统边界之上，建立一个真正可维护的 `compiled knowledge module`。

---

## 2. 参考原则：采纳 `llm_wiki` 的编译型工作流，不照搬全部产品

`llm_wiki` 值得借鉴的不是某个单页 UI，而是它对知识系统的基本判断：

- `raw sources` 不等于知识页
- 知识页必须是持久化、可追踪、可引用的编译产物
- query 依赖已编译 wiki，而不是每次直接回扫原始材料
- graph、lint、activity、synthesis 都属于知识系统，而不是临时工具调用副产物

Nion 的借鉴边界：

1. 借鉴它的 `Raw -> Wiki -> Query -> Graph -> Review` 主链。
2. 借鉴它对持久化 page、引用链、编译日志、图谱与 lint 的重视。
3. 不照搬它的仓库结构、CLI 形态和全部交互。
4. 不把 Nion 变成独立 wiki 产品。
5. 不打破 Nion 已批准的 `Notebook / Knowledge / Memory / Soul` 边界。

---

## 3. 已冻结的产品决策

以下决策已作为本设计的硬约束：

1. 产品方向采用 `Nion 原生增强型`，而不是外置 wiki 工作区或 1:1 复刻 `llm_wiki`。
2. `Notebook = raw / 原始内容 / 原料箱`。
3. `Knowledge = compiled wiki / graph / query / review`。
4. `Memory = runtime long-term context`，不作为 Knowledge 的假 UI。
5. `Knowledge` 同时服务用户查询和 Agent 查询，但 UI 保持简洁。
6. `Notebook -> Knowledge` 一期采用手动送入，不做自动发现和自动后台编译。
7. 知识页是 `Human read / Agent write`，用户不直接编辑编译页正文。
8. 原始内容修改后，相关知识状态变为 `stale`，不自动重编译。
9. 原始内容删除后，知识页进入 `archived / source missing` 语义，不立即彻底消失。
10. 彻底清理已删除来源的知识页，需要同时满足：
    - 无页面引用
    - 无最近查询命中
    - 用户确认清理
11. Notebook 中被送入知识库的内容只显示统一标签 `知识库`，详情通过 hover 或点击展开状态，而不是把 Notebook 列表变成状态面板。
12. `P0` 先做 Queue / Activity / Page Tree / Reader / Query；完整图谱工作台按阶段推进。

---

## 4. 边界模型

目标边界如下：

```text
Notebook = 用户可编辑的 raw
Knowledge = 从 raw 编译出的 wiki / graph / query 层
Memory = 运行时长期记忆层
Soul = 稳定人格与关系基调层
```

### 4.1 Notebook

职责：

- 保存 note、asset、inbox、history、trash、metadata
- 支持用户编辑原文
- 支持从聊天或工作区归档原料
- 提供 `转为知识库` 和 `查看知识状态`

不负责：

- 编辑知识页正文
- 展示全量知识页树
- 承担知识图谱工作台
- 承担知识查询页
- 代替 Agent 的 compiled query 能力

### 4.2 Knowledge

职责：

- 管理 source candidate、compile job、activity
- 维护 `sources / entities / concepts / syntheses / overview`
- 暴露 query、graph、lint、revision workflow
- 为用户提供真实可见的知识库页面、图谱与引用
- 为 Agent 提供正式的知识查询和引用合同

不负责：

- 作为原文编辑器
- 作为 Memory 的替代展示
- 接管 Soul 或人格设置

### 4.3 Memory

职责保持不变：

- 展示系统当前记住了什么
- 服务运行时长期上下文

Knowledge 可以为 Memory distillation 或 runtime bundle 提供来源，但二者不能合并。

---

## 5. 用户信息架构

### 5.1 Notebook：只做 raw 入口

Notebook 中只增加两类知识相关能力：

- 行级/详情级动作：`转为知识库`
- 行级/详情级动作：`查看知识状态`

这里的 `转为知识库` 是用户语言，不是内部执行语义。

它在系统内部只表示：

- 把当前 raw 注册为 Knowledge source candidate
- 进入 Knowledge queue
- 生成 enqueue activity

它不表示：

- 立即启动 compile job
- 同步生成知识页
- 绕过 Queue / Activity 审批与可见过程

也就是说，Notebook 负责 `enqueue`，Knowledge Queue / Activity 负责 `approve + compile + reveal progress`。

Notebook 内可显示一个轻量内联进度面板，但它只回答：

- 这个 raw 是否已进入知识库
- 最近一次编译进行到哪里
- 是否失败、是否可重试
- 是否可跳转到生成后的 Knowledge page

它不能承担完整知识库导航。

### 5.2 Knowledge Home

Knowledge 首页回答的问题是：

> 当前系统已经沉淀出了哪些知识，以及最近在编译什么。

首页组成：

- `Overview` 摘要
- `Queue / Activity` 摘要
- 最近更新的知识页
- 图谱状态摘要
- stale / contradiction / missing source 提示

### 5.3 Queue / Activity

Queue 和 Activity 共同构成“知识正在发生什么”的主视图。

Queue 展示：

- 待编译候选
- stale 候选
- failed 候选
- ignored 候选

Activity 展示：

- job 创建
- 编译启动
- source snapshot 完成
- page 创建/更新
- graph rebuild
- lint/contradiction 摘要
- 失败与重试

### 5.4 Knowledge Pages

Knowledge page 是阅读页，不是编辑器。

最少包含：

- 标题、类型、最后编译时间
- 正文 Markdown
- 引用来源
- 相关 pages
- 来自哪个 compile job
- 页面状态：`active / stale / archived`
- 修订请求入口

### 5.5 Query

Query 页是用户面向已编译知识库发问的正式入口。

要求：

- 只基于 compiled pages 查询
- 结果附稳定 citations / source badges
- 支持保存为 synthesis
- 支持展示命中的 Knowledge pages，而不是只显示工具消息
- 默认按 `page_state` 做过滤与降权，而不是把历史页与当前页混在一起

### 5.6 Graph Workbench

Graph 是 Knowledge 的一等页面，而不是页面旁边的小挂件。

长期目标：

- 真正布局而不是静态节点堆叠
- 拖拽
- 聚类
- 邻接高亮
- 布局持久化
- 节点筛选与搜索
- stale / archived / contradiction 状态显式标记

---

## 6. Agent Capability 与运行时策略

这一部分是本次设计的关键，因为知识库只有在 Agent 稳定使用时才成立。

### 6.1 Agent 什么时候必须优先调用 `query_knowledge_base`

以下场景应优先命中 Knowledge query，而不是先回扫 Notebook raw 或直接自由回答：

- 用户明确说“查知识库”“根据知识库回答”“知识图谱里有什么”
- 用户问题明显依赖已沉淀的个人知识、项目知识、研究摘要或已编译页面
- 用户刚刚把一批 raw 送入 Knowledge，随后追问相关问题
- 系统判断问题属于“用户私有知识域”而非公共常识域

以下场景不应强制命中：

- 纯公共常识问题
- 明确要求读取原始笔记原文进行编辑、改写或润色
- Knowledge 为空或没有相关 compiled pages，且系统已经检测到无可用命中

### 6.2 运行时偏置必须高于 prompt 提示

不能只靠系统 prompt 里写一句“记得使用 knowledge tool”。

必须有运行时偏置：

1. `intent router` 把知识库相关问题标成 Knowledge-eligible。
2. `tool planner` 在相关问题上优先给 `query_knowledge_base` 更高权重。
3. 如果已有 recent knowledge activity，进一步提高命中概率。
4. 如果 query 返回有价值页面，最终回答阶段必须消化其结果并附 citations。
5. 如果 query 无命中，明确告诉用户“当前 compiled knowledge 未覆盖该问题”，而不是装作已经查过。

### 6.3 Agent 不直接把 Notebook 当知识库

原则：

- `Notebook raw` 用于编辑、归档和送入队列
- `Knowledge query` 用于基于已编译知识回答问题

这保证：

- 用户看到的知识和 Agent 用来回答的知识是同一层
- “送入知识库”这个动作有真实含义
- 引用可以稳定落到 page，而不是落到某段不可追踪的原文扫描

### 6.4 普通聊天里如何更稳定触发 Knowledge

普通聊天中需要增加一个轻量但稳定的决策层：

```text
问题进入 -> 领域判断 -> 是否属于用户私有知识 -> 是否有 compiled pages -> 若是则优先 query_knowledge_base -> 合成最终答案
```

最少启发信号：

- 包含“我的知识库 / 我的笔记里 / 之前沉淀过 / 我喂给你的资料”
- 问题与最近新增 Knowledge activity 强相关
- 问题命中已有 Knowledge page 标题、实体名、概念名
- 问题属于已知 workspace / notebook 领域词

### 6.5 最终回答里的 citations / source badges 合同

Knowledge query 的结果不能只作为内部 tool message 悬挂在消息流里。

正式合同建议：

```ts
type KnowledgeCitation = {
  page_id: string;
  title: string;
  page_type: "source" | "entity" | "concept" | "synthesis" | "overview";
  page_state: "active" | "stale" | "archived";
  source_ids: string[];
  score: number;
};

type KnowledgeQueryResult = {
  answer_markdown: string;
  citations: KnowledgeCitation[];
  matched_page_ids: string[];
  retrieval_policy:
    | "active_only"
    | "active_with_stale_fallback"
    | "explicit_archived_lookup";
  warnings: string[];
};
```

默认 query 策略：

1. `active` 页面正常参与召回与回答。
2. `stale` 页面默认降权；仅在没有足够 `active` 命中，或用户明确接受“可能过期但仍可参考”的知识时才可进入回答。
3. `archived` 页面默认不参与普通回答；仅在用户明确查询历史、删除前内容、归档知识或审计轨迹时才可命中。
4. 一旦回答使用了 `stale` 或 `archived` 页面，最终回答必须带显式 warning，而不是静默混入正文。

assistant 最终消息合同：

```ts
type AssistantKnowledgeAttachment = {
  citations: KnowledgeCitation[];
  matched_page_ids: string[];
  retrieval_policy:
    | "active_only"
    | "active_with_stale_fallback"
    | "explicit_archived_lookup";
  warnings: string[];
  rendered_from_final_answer: true;
};
```

要求：

- 归一化后的 citation metadata 必须写入最终 assistant message 的 `additional_kwargs.knowledge`
- 前端优先从最终 assistant message 读取 citations
- tool message 里的 `page_ids` 只作为迁移期 fallback，不再作为长期主合同
- streaming 过程中允许暂存 tool result，但在最终回答落地时必须合并成稳定的 assistant-level metadata

前端展示要求：

- assistant 最终回答下方显示 `引用了这些 Knowledge pages`
- 使用稳定 badge，而不是仅依赖工具消息链接
- badge 点击直接打开对应 Knowledge page
- 如果回答同时混入公共知识与 Knowledge 知识，Knowledge 来源仍要独立展示
- `stale` 与 `archived` badge 需要可见状态样式，且回答区同步出现 warning

### 6.6 “今天又投喂了什么知识”如何让 Agent 知道

这部分不能用 Memory 伪装。

正确做法是新增 `knowledge activity digest`，作为运行时上下文的一部分：

- 记录最近编译成功/失败/变 stale 的 Knowledge 事件
- 让 Agent 在当轮对话中知道最近新增了哪些知识页
- 让用户在 Knowledge Activity 和 Notebook 轻量面板里可见

它是运行时操作上下文，不是长期 Memory 条目。

### 6.7 修订请求与 synthesis

用户不能直接编辑知识页正文，但可以做两件事：

1. 发起 revision request
2. 把查询结果保存为 synthesis

规则：

- revision 仍在 Knowledge 内闭环，不回退成 Notebook 编辑
- synthesis 是新的 Knowledge page，不写回 Notebook raw
- 后续若要把 synthesis 蒸馏进 Memory，应走独立 distillation 流程

---

## 7. 模块、存储与 API 合同

### 7.1 存储根

Knowledge 需要独立于 Notebook 和 Memory 的数据根：

```text
{NION_HOME}/knowledge/
  raw/
    snapshots/
  wiki/
    index.md
    overview.md
    log.md
    sources/
    entities/
    concepts/
    syntheses/
  graph/
    graph.json
    layout.json
  .nion/
    queue.sqlite3
    jobs.sqlite3
    revisions.sqlite3
    activity.sqlite3
```

约束：

- 不放进 `notebook/.nion`
- 不与 `memory` 目录共用状态存储
- graph layout 的持久化属于 Knowledge 自己，而不是浏览器临时缓存

### 7.2 Source Candidate

```ts
type KnowledgeSourceCandidate = {
  source_id: string;
  source_kind: "notebook_note" | "notebook_asset";
  notebook_ref: {
    note_id?: string;
    asset_id?: string;
    relative_path: string;
  };
  title: string;
  summary: string;
  content_hash: string;
  status:
    | "queued"
    | "running"
    | "compiled"
    | "failed"
    | "stale"
    | "ignored"
    | "source_missing";
  enqueued_at?: string;
  last_job_id?: string;
  last_compiled_at?: string;
  missing_detected_at?: string;
  compile_error?: string;
  created_at: string;
  updated_at: string;
};
```

补充约束：

- candidate store 必须保留“曾经进入过 Knowledge 的 source registry”，不能只反映当前仍存在的 Notebook 项
- `source_missing` 是 registry 上的持久状态，不因为原文消失就把 candidate 记录一并抹掉
- candidate 是 Notebook 与 Knowledge 的桥接主键，不允许靠页面扫描反推

### 7.3 Compile Job

```ts
type KnowledgeCompileJob = {
  job_id: string;
  source_ids: string[];
  trigger_mode: "manual";
  status: "pending" | "running" | "succeeded" | "failed" | "partially_succeeded";
  stage:
    | "queued"
    | "snapshotting"
    | "extracting"
    | "writing_pages"
    | "rebuilding_graph"
    | "finalizing";
  created_pages: string[];
  updated_pages: string[];
  stale_pages: string[];
  archived_pages: string[];
  error_summary?: string;
  started_at?: string;
  finished_at?: string;
};
```

### 7.4 Activity Event

```ts
type KnowledgeActivityEvent = {
  event_id: string;
  event_type:
    | "candidate_enqueued"
    | "job_started"
    | "snapshot_completed"
    | "page_created"
    | "page_updated"
    | "page_archived"
    | "graph_rebuilt"
    | "job_failed"
    | "job_succeeded"
    | "candidate_became_stale"
    | "source_missing_detected";
  source_id?: string;
  page_id?: string;
  job_id?: string;
  detail: string;
  created_at: string;
};
```

### 7.5 Source Reconciliation Contract

Knowledge 必须有正式的 `source reconciliation` 机制来处理 raw 删除、恢复和漂移，而不是只靠“重新扫描现存笔记”。

```ts
type KnowledgeSourceReconciliationResult = {
  checked_source_ids: string[];
  source_missing_ids: string[];
  restored_source_ids: string[];
  archived_page_ids: string[];
  reactivated_page_ids: string[];
  detected_at: string;
};
```

触发来源：

1. Notebook note / asset 的删除动作完成后，立即触发一次 reconciliation。
2. Notebook restore 动作完成后，立即触发一次 reconciliation。
3. Knowledge Queue / Activity 页提供显式 `reconcile now` 入口，作为修复与审计手段。
4. workspace 启动时可做一次轻量 drift check，但这不是自动后台编译。

处理规则：

- reconciliation 基于持久化 candidate registry 与当前 Notebook inventory 做对比
- 若 source 从 inventory 中消失，则 candidate 变 `source_missing`
- 若 source 重新出现，则 candidate 恢复为 `stale` 或 `compiled`，取决于 content hash 是否漂移
- 与该 source 关联的 page 在 source_missing 时标记 `archived`
- 恢复后若 hash 未变，可恢复为 `active`；若 hash 已变，恢复为 `stale`
- 每次 reconciliation 都必须写 activity event，保证用户与 Agent 都能看见生命周期变化

### 7.6 Knowledge Page Frontmatter

知识页必须是结构化 Markdown，而不是裸文件。

```md
---
title: "Memory Runtime Bundle"
page_type: "concept"
page_id: "concept:memory-runtime-bundle"
sources:
  - "source:notebook_note:note_123"
compiled_from:
  - source_id: "source:notebook_note:note_123"
    content_hash: "abc123"
page_state: "active"
last_compiled_at: "2026-04-15T12:00:00Z"
agent_owned: true
human_editable: false
---
```

硬约束：

- 必须有 `sources`
- 必须有 `compiled_from`
- 必须有 `page_state`
- 必须有 `agent_owned`
- 不允许直接人工改正文作为正式编辑路径

### 7.7 Graph Layout Contract

Graph 的交互布局需要持久化，而不是每次重开重新随机摆放。

```ts
type KnowledgeGraphLayout = {
  version: 1;
  node_positions: Record<string, { x: number; y: number }>;
  collapsed_clusters: string[];
  highlighted_node_ids: string[];
  updated_at: string;
};
```

### 7.8 Notebook 与 Knowledge 的桥接合同

Notebook 不暴露完整知识页数据，只暴露轻量状态：

```ts
type NotebookKnowledgeStatus = {
  has_knowledge: boolean;
  tag_label: "知识库";
  status: "queued" | "running" | "compiled" | "failed" | "stale" | "source_missing";
  enqueue_state: "not_enqueued" | "enqueued";
  compile_state: "idle" | "pending" | "running" | "succeeded" | "failed";
  last_job_id?: string;
  created_page_ids: string[];
  error_summary?: string;
};
```

Notebook UI 只消费这个摘要合同。

约束：

- Notebook `转为知识库` 只调用 enqueue 合同，不直接调用 compile/approve 合同
- Notebook 通过 source_id 查询轻量状态，不自行拼装 compile 进度
- Queue / Activity 是 compile job 的主视图，Notebook 只做 bridge

### 7.9 建议 API 面

后端建议形成以下正式面：

```text
GET    /api/knowledge/home
POST   /api/knowledge/sources/enqueue
GET    /api/knowledge/sources/{source_id}/status
GET    /api/knowledge/queue
POST   /api/knowledge/queue/approve
GET    /api/knowledge/jobs
GET    /api/knowledge/jobs/{job_id}
GET    /api/knowledge/activity
POST   /api/knowledge/reconcile
GET    /api/knowledge/pages
GET    /api/knowledge/pages/{page_id}
GET    /api/knowledge/query
POST   /api/knowledge/syntheses
GET    /api/knowledge/graph
POST   /api/knowledge/graph/rebuild
PUT    /api/knowledge/graph/layout
POST   /api/knowledge/revisions
POST   /api/knowledge/revisions/{request_id}/preview
POST   /api/knowledge/revisions/{request_id}/apply
POST   /api/knowledge/revisions/{request_id}/close
```

执行语义：

- `POST /api/knowledge/sources/enqueue`：只把 raw 注册进 queue，不启动 compile
- `POST /api/knowledge/queue/approve`：从 queue 中批准一个或多个 source 并创建 compile job
- `GET /api/knowledge/sources/{source_id}/status`：给 Notebook bridge 返回轻量状态
- `POST /api/knowledge/reconcile`：执行 source registry 与 Notebook inventory 的对账

### 7.10 生命周期规则

#### 原文修改

- 对应 candidate 变 `stale`
- 相关 page 标记 `page_state=stale`
- 不自动重编译
- 用户在 Queue 或 Notebook 面板中手动重试

#### 原文删除

- candidate 变 `source_missing`
- 相关 page 标记 `page_state=archived`
- 页面正文保留，但显示 `source missing` 横幅
- 仍可通过旧引用或查询历史追踪到它，直到满足清理条件
- 删除检测不是隐式推断，而是通过 `source reconciliation` 正式落账

#### 原文恢复

- reconciliation 检测到 source 重新出现
- 若 content hash 未变，candidate 与 page 可恢复为 `active`
- 若 content hash 已变，candidate 与 page 进入 `stale`
- 该恢复事件必须写入 activity，并让 Notebook/Knowledge 状态同步更新

#### 彻底清理

只有在以下条件同时成立时，才允许从主视图中移除：

- 无页面引用
- 无最近查询命中
- 用户确认 cleanup

---

## 8. 分阶段实施

### Phase 0：合同冻结与现状校准

目标：

- 冻结新的模块边界
- 校准已有 Knowledge 实现与设计的偏差
- 删除继续混淆 Notebook / Knowledge / Memory 的错误合同

必须完成：

- 新 spec 落盘
- 前后端合同测试冻结
- 明确 `query_knowledge_base` 的返回合同
- 明确 Notebook 标签与状态摘要合同
- 明确 assistant final message 的 citation metadata 合同

### Phase 1：编译主链与可见过程

目标：

- 让“转为知识库”成为真实可见的编译流程

必须完成：

- source enqueue API
- source status-by-source API
- source candidate store
- source reconciliation
- compile jobs
- activity feed
- Notebook 内联进度面板
- fail / retry / open generated page
- Knowledge Queue / Activity 页面

### Phase 2：Knowledge 页面、查询与引用

目标：

- 让用户真正看见知识库内容，并验证 Agent 是否在引用它

必须完成：

- page tree / reader
- query page
- active / stale / archived retrieval policy
- stable citations / source badges
- synthesis 保存链路
- archived / stale page 呈现

### Phase 3：Agent 稳定接入

目标：

- 让普通聊天中对私有知识问题的处理更稳定地触发 Knowledge query

必须完成：

- intent router 偏置
- tool planner 权重调整
- recent knowledge activity digest
- assistant final answer 中的 citations 展示
- final assistant message citation metadata 落地

### Phase 4：完整图谱工作台

目标：

- 把 Graph 从轻量浏览器升级成真正工作台

必须完成：

- 布局
- 聚类
- 拖拽
- 邻接高亮
- 布局持久化
- stale / archived / contradiction 可视层

### Phase 5：清理与治理闭环

目标：

- 让 Knowledge 模块长期可维护，而不是再沦为一组“看起来有”的页面

必须完成：

- stale / source missing cleanup 流程
- lint 与 data gap 入口
- 契约测试和回归测试
- 删除无用兼容壳和错误语义

---

## 9. 非目标

本设计明确不做：

- 自动把全部 Notebook 内容后台吸入 Knowledge
- 让用户直接编辑编译页正文
- 用 Memory 页面替代 Knowledge 页面
- 用一次性 RAG 搜索替代 compiled wiki
- 把所有聊天线程直接作为 Knowledge 输入
- 完整复刻 `llm_wiki` 的全部 UI 和 CLI

---

## 10. 决策边界

以下内容在不违反本 spec 的前提下，可由实施阶段自主决定，不需要重新上升为产品决策：

1. `Knowledge Home` 中 `Queue` 与 `Activity` 是分卡片还是分子标签。
2. Graph 具体使用哪种前端布局/聚类库，只要满足真正布局、拖拽、聚类和持久化合同；默认优先复用现有依赖或原生实现，若确需新增依赖，必须单独记录决策并审查。
3. Query ranking 的具体算法和权重，只要保持“compiled pages first”和稳定 citations。
4. Notebook 内联进度面板采用 badge、inline card 或 collapsible panel，只要不把 Notebook 变成 Knowledge 主页面。
5. `activity digest` 在运行时上下文中的注入格式，只要它不是 Memory 条目，并且能稳定提示最近知识变更。
6. `page tree` 的具体排序、分组与筛选 UI，只要能稳定呈现 `source / entity / concept / synthesis / overview`。

以下内容不得在实施阶段私自改变：

1. `Notebook = raw`
2. `Knowledge = compiled wiki`
3. `Memory != Knowledge`
4. 删除后的 `archived / source missing` 生命周期
5. 用户不直接编辑编译页正文
6. Agent 在相关问题上优先查询 Knowledge

---

## 11. 验收标准

当以下条件同时成立时，Knowledge 模块才算真正成立：

1. 用户能在 Notebook 中明确看到某条 raw 是否已进入 Knowledge。
2. Notebook 中的 `转为知识库` 只负责 enqueue，不会直接伪装成同步编译完成。
3. Queue / Activity 中存在真实、可见、可失败、可重试的编译过程。
4. 用户能在独立 Knowledge 页面里看到 page tree、page reader、query、activity 和 graph。
5. 原文修改后会变 `stale`，原文删除后会进入 `archived / source missing`，恢复后会经 reconciliation 正式更新，不会悄悄消失。
6. 普通聊天里的 Agent 在相关问题上能稳定优先调用 `query_knowledge_base`，且不会把 `archived` 页面静默当成当前知识。
7. assistant 最终回答里能稳定显示引用了哪些 Knowledge pages，并从最终 assistant message 读取 citation metadata，而不是依赖 tool-message 解析。
8. Knowledge、Notebook、Memory 三者职责不再混淆。

---

## 12. 推荐实施路线

从长远和产品级角度，推荐继续采用当前已批准的 `A/B/C` 组合：

- `A` 手动送入为主
- `B` Nion 原生增强型
- `C` 双优先但 UI 简化

原因：

- 它能保住 Nion 的边界，不会把 Knowledge 变成第二个 Notebook 或第二个 Memory。
- 它允许后续逐步增强，而不是一次性吞下 `llm_wiki` 全套系统。
- 它对现有模块的冲击最可控，最适合在当前代码基线上做长期演进。
