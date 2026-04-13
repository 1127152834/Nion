# Notebook To Knowledge Base Design

日期：2026-04-13  
状态：Draft for implementation planning  
范围：`Notebook / Knowledge Base / Agent capability / Wiki graph`

---

## 1. 问题定义

当前 `Notebook` 已经具备原始材料管理能力：用户可以手写 Markdown note、快速捕获内容、从聊天保存 thread/reply、归档 workspace artifact，并通过历史版本、trash、metadata 和 note assistant 维护这些材料。

但它还不是知识库。

当前 Notebook 的核心心智是：

- 我收集了什么
- 我把材料放在哪
- 我如何编辑一条笔记
- 我如何从笔记里抽取到 Memory

真正的知识库要回答的是另一组问题：

- 系统已经沉淀出哪些结构化知识
- 哪些来源支撑这些知识
- 概念、实体、来源之间如何连接
- 哪些知识存在矛盾、断链、陈旧或缺口
- Agent 如何稳定查询并生成上下文包

如果直接把这些职责塞进 Notebook，Notebook 会变成原料、知识页、图谱、运行时记忆的混合体。这个方向会重新制造本项目已经在 Memory / Soul 改造中明确要避免的问题：产品面、运行时面和内部治理面混在一起。

本设计的目标是把 Notebook 改造成知识库的原料入口，同时新增独立的 `Knowledge Base` 编译层，使它既能给人使用，也能给 Agent 稳定调用。

---

## 2. 外部参考：采纳 `llm-wiki-agent` 的工作流，不照搬产品形态

参考项目：

- `https://github.com/SamurAIGPT/llm-wiki-agent`
- 本地安装路径：`/Users/zhangtiancheng/.codex/vendor_imports/llm-wiki-agent`

`llm-wiki-agent` 的核心价值不是一个 UI，也不是一组 Python 脚本，而是下面四条 workflow：

1. `ingest`：把 source 编译成 source page、entity page、concept page、overview 和 log。
2. `query`：从已有 wiki pages 回答问题，并可沉淀成 synthesis。
3. `lint`：检查 orphan pages、broken links、contradictions、stale summaries 和 data gaps。
4. `graph`：从 wikilinks 和推断关系构建知识图谱。

Nion 应该吸收这四条 workflow，但不应该把外部 wiki 目录作为产品主链，也不应该把上游脚本硬塞进业务运行时。

最终取舍：

- 产品心智参考 `llm-wiki-agent` 的 persistent wiki。
- 编译流程参考 `ingest / query / lint / graph`。
- 存储、API、状态管理、UI 走 Nion 内部正式模块。
- 上游项目保留为设计参考和 prompt/workflow 参考，不作为一期运行时依赖。

---

## 3. 用户决策基线

本设计已按以下决策收敛：

1. 选择 `Notebook 继续做原始素材箱，新增 Knowledge Base 编译层`。
2. 选择 `Dual-first`：Knowledge Base 同时服务人和 Agent。
3. Phase 1 输入只支持 `Notebook notes + inbox assets`。
4. 聊天线程和 workspace artifact 先通过 Notebook 保存/归档进入原料箱，不直接接入 Knowledge Base。
5. 知识页采用 `Human read / Agent write`。
6. 用户可阅读、查询、批准编译、发起修订请求，但不直接手改知识页正文。
7. 一期采用半自动编译队列，不做全自动实时编译。

---

## 4. 总体边界模型

目标形态：

```text
Notebook = 原料箱
Knowledge Base = 编译层
Memory = 运行时长期记忆
Identity / Soul = 稳定上下文主档
```

四者必须分开。

### 4.1 Notebook

职责：

- 保存用户可编辑原料
- 管理 note / inbox / asset / history / trash / metadata
- 支持从聊天保存内容
- 支持归档 workspace artifact
- 支持 note assistant 辅助改写

不负责：

- 维护 concept/entity/source/synthesis 页面
- 维护全局 overview
- 维护知识图谱
- 生成 Agent 上下文包
- 回答“系统沉淀了什么知识”

### 4.2 Knowledge Base

职责：

- 从 Notebook 原料生成稳定知识资产
- 维护 sources / entities / concepts / syntheses / overview
- 维护 graph
- 维护 ingest/query/lint/graph/revision workflow
- 为人提供阅读、查询、图谱和修订入口
- 为 Agent 提供正式 capability contract

不负责：

- 作为用户原始笔记编辑器
- 替代 Memory
- 直接消费所有聊天线程
- 直接消费所有 workspace 文件

### 4.3 Memory

职责保持不变：

- 展示系统当前记住了什么
- 服务运行时长期上下文

Knowledge Base 可以为 Memory distillation 或 runtime context pack 提供来源，但不能等同于 Memory。

正确关系：

```text
Notebook -> Knowledge Base -> Memory distillation/runtime bundle
```

错误关系：

```text
Notebook -> 直接当 Knowledge
Knowledge -> 混成 Memory 页面
Notebook -> 绕过编译直接写运行时 Memory
```

---

## 5. 存储模型

建议新增独立数据根：

```text
{NION_HOME}/knowledge/
  raw/
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
    graph.html
  .nion/
    queue.sqlite3
    index.sqlite3
    source-map.sqlite3
```

约束：

- 不放进 `notebook/.nion`，避免 Notebook 和 Knowledge 责任混住。
- `raw/` 是进入编译的 source snapshot 或 source reference 记录。
- `wiki/` 是 Agent-owned 编译产物层。
- `graph/` 是自动生成图谱产物。
- `.nion/` 存队列、索引、source mapping、job 状态和内部缓存。

### 5.1 Raw 层

对 `notebook_note`：

- 保存 `note_id`
- 保存 `relative_path`
- 保存 `content_hash`
- 保存编译时正文 snapshot

对 `notebook_asset`：

- 保存 `asset_id`
- 保存 `relative_path`
- 保存 `file_size / mime_type`
- 保存可提取文本 snapshot 或 source reference

关键要求：

- 每次编译输入必须可追溯。
- 原 Notebook 内容后续变化不能悄悄改写已编译知识页。
- 内容 hash drift 必须能标记 stale。

---

## 6. 核心数据模型

### 6.1 Knowledge Source Candidate

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
  status: "queued" | "approved" | "compiled" | "failed" | "stale" | "ignored";
  created_at: string;
  updated_at: string;
  last_compiled_at?: string;
  compile_error?: string;
};
```

语义：

- Notebook 内容不等于知识页。
- Notebook 内容只是 Knowledge source candidate。
- Candidate 状态决定它是否可进入编译 job。

### 6.2 Knowledge Compile Job

```ts
type KnowledgeCompileJob = {
  job_id: string;
  source_ids: string[];
  trigger_mode: "manual" | "queue_approval";
  status: "pending" | "running" | "succeeded" | "failed" | "partially_succeeded";
  started_at?: string;
  finished_at?: string;
  outputs: {
    created_pages: string[];
    updated_pages: string[];
    contradiction_pages: string[];
    graph_rebuilt: boolean;
  };
  error_summary?: string;
};
```

编译必须是 batch operation，而不是 UI 点一下直接写单页。这样失败重试、审计、日志、图谱更新和 Agent 诊断都有稳定落点。

### 6.3 Knowledge Page

知识页是 Markdown 文件，但不是无结构 Markdown。每页必须有 frontmatter：

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
last_compiled_at: "2026-04-13T12:00:00Z"
agent_owned: true
human_editable: false
---
```

硬约束：

- 必须有 `sources`
- 必须有 `compiled_from`
- 必须有 `agent_owned`
- 用户不能直接手改正文

### 6.4 Knowledge Revision Request

```ts
type KnowledgeRevisionRequest = {
  request_id: string;
  page_id: string;
  request_type: "fix_fact" | "add_context" | "merge_pages" | "split_page" | "rename_page";
  instruction: string;
  optional_source_refs: string[];
  status: "open" | "accepted" | "rejected" | "applied";
  created_by: "user";
  created_at: string;
  resolved_at?: string;
};
```

人通过 revision request 影响知识页，Agent 读取 page、sources 和 instruction 后生成 diff preview，用户确认后由 Agent 落盘。

---

## 7. 编译队列

一期采用半自动队列。

流程：

1. Notebook note 或 inbox asset 出现。
2. Knowledge candidate scanner 生成 `queued` candidate。
3. 用户在 Knowledge queue 页面批量批准。
4. 系统生成 compile job。
5. Agent 执行 ingest workflow。
6. 成功后 candidate 变 `compiled`。
7. 如果 Notebook 原料后续变化，candidate 变 `stale`。
8. 用户可批准 stale candidate 重新编译。

约束：

- 新内容不自动进入正式知识页。
- Notebook 原文变化不自动 patch 知识页。
- 编译失败必须保留错误摘要。
- 用户可以忽略 candidate。

---

## 8. 产品信息架构

新增一级入口：`Knowledge` 或 `Knowledge Base`。

新增路由：

```text
/workspace/knowledge
/workspace/knowledge/queue
/workspace/knowledge/pages/[pageId]
/workspace/knowledge/graph
/workspace/knowledge/query
```

主导航分工：

- `Notebook`：收集、编辑、整理原料
- `Knowledge`：阅读、查询、编译、修订知识
- `Memory`：查看系统当前记住了什么
- `Automation`：定时与任务执行

### 8.1 Knowledge Home

首页展示：

- 待编译队列摘要
- `overview.md` 阅读版
- 最近更新的 source/concept/entity/synthesis 页面
- 图谱状态
- lint/矛盾/缺口摘要

首页回答的是：

> 当前知识库已经沉淀出什么？

### 8.2 Queue Page

展示 candidate 列表。

单项展示：

- 标题
- source kind
- relative path
- summary
- content hash 状态
- candidate status
- last compiled time
- error summary

操作：

- 批准编译
- 标记忽略
- 重新编译 stale 项
- 查看原料

### 8.3 Knowledge Page Reader

知识页不是编辑器，而是阅读器。

结构：

- 标题区：title、page type、last compiled at
- 正文区：Markdown 渲染内容
- 右栏：sources、related pages、compile job、contradictions、revision request

### 8.4 Query Page

功能：

- 输入问题
- 选择 scope：all / concepts / entities / sources
- 从 wiki pages 合成答案
- 使用 page links 作为引用
- 可保存为 synthesis

约束：

- query 不回扫 Notebook 原料。
- query 只基于已编译 wiki pages。

### 8.5 Graph Page

一期只读。

功能：

- 展示 graph nodes/edges
- 按 page type 过滤
- 搜索节点
- 点击跳转 page
- 区分 `EXTRACTED` 和 `INFERRED` edge
- 显示 orphan/broken/stale/contradiction 热点

### 8.6 Notebook Bridge

Notebook 页面只增加两个动作：

- `送入知识队列`
- `查看知识状态`

不要把 Knowledge page editor、graph 或 query 面塞进 Notebook 右栏。

---

## 9. Agent Capability Contract

Knowledge Base 必须成为 capability backbone 的一等对象。

建议对象：

- `knowledge_queue`
- `knowledge_pages`
- `knowledge_graph`
- `knowledge_query`
- `knowledge_revision_requests`

建议最小接口：

```ts
type KnowledgeCapabilities = {
  queueCandidates(): Promise<KnowledgeSourceCandidate[]>;
  approveCandidates(input: { source_ids: string[] }): Promise<KnowledgeCompileJob>;
  compileJob(input: { job_id: string }): Promise<KnowledgeCompileJob>;
  getPage(input: { page_id: string }): Promise<KnowledgePage>;
  query(input: { question: string; scope?: string }): Promise<KnowledgeQueryResult>;
  saveSynthesis(input: { question: string; answer: string }): Promise<KnowledgePage>;
  lint(): Promise<KnowledgeLintReport>;
  buildGraph(): Promise<KnowledgeGraphBuildResult>;
  createRevisionRequest(input: KnowledgeRevisionRequestInput): Promise<KnowledgeRevisionRequest>;
  previewRevision(input: { request_id: string }): Promise<KnowledgePageDiffPreview>;
  applyRevision(input: { request_id: string }): Promise<KnowledgeCompileJob>;
};
```

主智能体遇到以下意图时应先命中 Knowledge capability，而不是泛化澄清：

- “查一下知识库”
- “把这篇笔记送入知识库”
- “重建知识图谱”
- “检查知识库有没有断链”
- “把这个答案存成知识页”
- “修正这个知识页”

---

## 10. Workflow 设计

### 10.1 Ingest Workflow

顺序：

1. 读取 source candidate。
2. 解析正文或可提取文本。
3. 读取当前 `wiki/index.md`、`wiki/overview.md` 和相关 pages。
4. 生成或更新 `wiki/sources/<slug>.md`。
5. 更新或创建 `wiki/entities/*.md`。
6. 更新或创建 `wiki/concepts/*.md`。
7. 视情况更新 `wiki/overview.md`。
8. 标记 contradictions 或 data gaps。
9. 更新 `wiki/index.md`。
10. 追加 `wiki/log.md`。
11. 更新 compile job outputs。
12. 触发 graph rebuild 或增量 graph update。

### 10.2 Query Workflow

顺序：

1. 读取 `wiki/index.md`。
2. 选择 relevant pages。
3. 读取 pages。
4. 合成答案。
5. 使用 page links 标注引用。
6. 用户可保存为 synthesis。

禁止：

- query 阶段直接扫描 Notebook 全量文件树。
- query 阶段把未编译原料当知识引用。

### 10.3 Lint Workflow

最少检查：

- orphan pages
- broken links
- stale pages caused by source hash drift
- contradictions
- high-frequency entities without entity page
- data gaps

### 10.4 Graph Workflow

最少输出：

- `graph.json`
- `graph.html`

边类型：

- `EXTRACTED`：来自明确 wikilinks
- `INFERRED`：来自 Agent 推断
- `AMBIGUOUS`：低置信或待确认关系

`INFERRED` 和 `AMBIGUOUS` 必须带 confidence。

---

## 11. 实施阶段

### Phase 0：合同冻结

先写测试，冻结：

- Notebook 不承担知识页职责。
- Knowledge 有独立路由和导航入口。
- Candidate 只支持 `notebook_note` / `notebook_asset`。
- 知识页 frontmatter 必须包含 `sources / compiled_from / agent_owned`。
- 用户不能直接编辑知识页正文。
- Query 只基于 wiki pages。
- Graph 区分 `EXTRACTED / INFERRED / AMBIGUOUS`。

### Phase 1：后端核心

新增模块：

```text
backend/packages/harness/nion/knowledge/
  models.py
  paths.py
  source_candidates.py
  page_store.py
  compile_jobs.py
  ingest_service.py
  query_service.py
  lint_service.py
  graph_service.py
  revision_service.py
```

新增 API：

```text
/api/knowledge/queue
/api/knowledge/queue/approve
/api/knowledge/jobs/{job_id}
/api/knowledge/pages
/api/knowledge/pages/{page_id}
/api/knowledge/query
/api/knowledge/syntheses
/api/knowledge/lint
/api/knowledge/graph
/api/knowledge/revisions
```

### Phase 2：前端产品面

新增：

```text
frontend/src/app/workspace/knowledge/page.tsx
frontend/src/app/workspace/knowledge/queue/page.tsx
frontend/src/app/workspace/knowledge/graph/page.tsx
frontend/src/app/workspace/knowledge/query/page.tsx
frontend/src/app/workspace/knowledge/pages/[pageId]/page.tsx
frontend/src/components/workspace/knowledge/
frontend/src/core/knowledge/
```

### Phase 3：Notebook 桥接

Notebook 增加：

- `送入知识队列`
- `查看知识状态`

不在 Notebook 里新增知识页编辑器。

### Phase 4：Agent 能力接入

将 Knowledge 纳入：

- capability catalog
- control plane query surface
- typed agent tools
- system object intent routing
- runtime context pack builder

### Phase 5：质量闭环

覆盖：

- backend unit tests
- backend router tests
- frontend contract tests
- graph/lint tests
- Notebook -> candidate -> approve -> compile -> page -> query -> synthesis integration tests

---

## 12. 非目标

一期不做：

- 直接导入所有聊天线程
- 直接导入全部 workspace artifact
- 多人协作权限
- 实时自动编译
- 知识页多人共编
- 完整图数据库
- 让 Knowledge 替代 Memory
- 让用户直接手改知识页正文

---

## 13. 成功标准

第一阶段完成后，应该能完成这条闭环：

```text
Notebook note
-> Knowledge candidate
-> user approval
-> compile job
-> source/concept/entity pages
-> overview update
-> graph update
-> query answer
-> saved synthesis
```

同时满足：

- Notebook 和 Knowledge 在导航、API、文案和测试中保持边界清晰。
- 所有知识页可追溯到 source candidate 和 content hash。
- 修改 Notebook 原料后，相关 candidate/page 能标记 stale。
- 用户只能通过 revision request 影响知识页。
- Agent 可通过正式 capability 查询和维护知识库。

---

## 14. 设计结论

Notebook 不应该被改造成一个混合大模块。它应该成为 Knowledge Base 的原料箱。

Knowledge Base 应该成为 Nion 的正式产品与 Agent capability：人用它阅读、查询、批准和修订，Agent 用它 ingest、query、lint、build graph 和生成上下文包。

这条路线保留了 `llm-wiki-agent` 的核心优势，同时避免把 Nion 的产品主链割裂成外部 wiki 工作区。
