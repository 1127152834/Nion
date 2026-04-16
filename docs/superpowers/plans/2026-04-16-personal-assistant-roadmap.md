# Nion Personal Assistant Product Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this roadmap stage-by-stage. This roadmap is the top-level execution spine; lower-level plans must not contradict it.

**Goal:** 把 Nion 从“强大的 agent runtime / platform 外加若干产品面”持续收敛为“成熟、稳定、安全、可长期依赖的个人办公生活助手”。

**Architecture:** 路线采用“先收口对象合同与信息路由，再收口 runtime 行为，再收口长期内容系统，再收口自动化与远程入口，最后收口产品信息架构”的顺序。原则是先修真相源与 owner，再修行为链，再修产品面；避免先做视觉/UI 大改导致后续 owner/routing 返工。

**Tech Stack:** FastAPI gateway/daemon, `nion.*` harness runtime, LangGraph-based agent runtime, notebook/knowledge services, automation service, bridge/guardian control plane, TypeScript workspace/settings surfaces, pytest, frontend contract tests.

---

## 1. Roadmap Purpose

这份 roadmap 不是单个功能计划，而是接下来一段时间内关于 Nion 个人助手化重构的唯一主线。

它用于回答：

1. 先做什么，后做什么
2. 哪些阶段不能越过
3. 哪些计划属于当前主线，哪些只能后置
4. 各阶段完成后，系统会获得什么能力
5. 哪些“很诱人的局部优化”必须压后

后续任何 implementation plan、专项计划、代码重构，都必须先回答：

> 它属于 roadmap 的哪一个阶段？
> 是否会破坏前置阶段的 owner / contract / routing 约束？

---

## 2. Roadmap Source Of Truth

当前 roadmap 以上游文档为输入：

### 审查与设计

- [docs/reviews/2026-04-15-nion-agent-application-architecture-strict-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-15-nion-agent-application-architecture-strict-audit.md)
- [docs/reviews/2026-04-15-personal-assistant-product-objects-design-review.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-15-personal-assistant-product-objects-design-review.md)
- [docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md)

### 已有专项设计

- [docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md)
- [docs/superpowers/specs/2026-04-15-nion-llm-wiki-knowledge-module-redesign.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-nion-llm-wiki-knowledge-module-redesign.md)
- [docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md)

### 已有实施计划

- [docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md)

如果未来有新的专项设计/计划与本 roadmap 冲突，以本 roadmap 为准，除非 roadmap 被明确更新。

---

## 3. Product Target State

Nion 最终应该让用户感觉自己拥有的是：

1. 一个长期认识自己的助手
2. 一个可靠的材料库
3. 一个可查询的知识库
4. 一组持续替自己办事的承诺
5. 一个随时可达的个人电脑入口

而不是让用户感觉自己在管理：

1. memory system
2. knowledge graph
3. agent runtime
4. bridge daemon
5. skill registry
6. automation scheduler

这个目标会决定本 roadmap 的每个阶段都优先服务“产品对象收口”，而不是继续放大平台能力暴露面。

---

## 4. Stage Model

本 roadmap 分为 6 个阶段。阶段之间有强依赖关系。

```text
Phase 0  Freeze product-object contract and truth ownership
   ↓
Phase 1  Information routing and owner closure
   ↓
Phase 2  File-native identity / soul / memory runtime
   ↓
Phase 3  Notebook -> Knowledge compile engine
   ↓
Phase 4  Assistant commitment / automation productization
   ↓
Phase 5  Runtime behavior closure and user-facing IA collapse
```

原则：

- **不得跳阶段**
- **不得在前置阶段 owner 未收口前大改 UI**
- **不得在 routing contract 未稳定前做大量自动化行为**

---

## 5. Phase 0 — Freeze Product Objects And Truth Ownership

### Goal

把产品对象、长期内容分层、用户/助手人格分层、Notebook→Knowledge、Automation 语义、以及 Information Routing Contract 冻结成唯一上位合同。

### Scope

- 冻结 `Notebook / Knowledge / Memory / USER.md / IDENTITY.md / SOUL.md / Automation`
- 冻结文档优先级与废弃声明
- 冻结写入路由、读取路由、precedence、revision request、permission matrix 的设计

### Inputs

- 已有严格审查文档
- `2026-04-15-personal-assistant-product-objects-and-information-routing-design.md`

### Deliverables

- 上位设计文档 stable
- review 闭环文档 stable
- roadmap stable

### Exit Criteria

- 团队不再把 `IDENTITY` 当用户身份
- 不再把 `Knowledge` 当独立用户资产空间
- 不再把 `Automation` 当纯 job scheduler
- 后续 implementation plan 可以引用固定术语，不再继续重命名

### Status

已完成。

---

## 6. Phase 1 — Information Routing And Owner Closure

### Goal

把“写哪里 / 读哪里 / 谁是 owner / 谁需要确认”从隐式规则变成显式 contract。

### Why First

如果没有这一步：

- Notebook / Knowledge / Memory 会继续局部正确整体分裂
- USER / IDENTITY / SOUL 会继续双写、误写或读错
- 后续 UI、automation、knowledge compile 会全部返工

### Scope

- `InformationRouteDecision` typed contract
- deterministic `route_information()`
- `Read Routing Contract`
- `Compatibility / Migration Contract`
- `KnowledgeRevisionRequest`
- `Assistant Commitment` permission matrix
- docs / tests 同步

### Existing Plan

- [docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md)

### Exit Criteria

- 所有长期写入都可通过 route decision 审计
- USER / IDENTITY / SOUL / MEMORY / Notebook / Knowledge / Automation 的写入 owner 明确
- read routing 有默认优先级
- `KnowledgeRevisionRequest` 存在
- `Automation` permission matrix 存在

### Forbidden Shortcuts

- 不允许直接在现有 middleware 中继续塞 ad-hoc 路由判断而不落 typed decision
- 不允许先改前端页面名称而不改后端 owner/contract
- 不允许先让 agent 自动沉淀 Knowledge 而没有 candidate/compile contract

---

## 7. Phase 2 — File-Native Identity / Soul / Memory Runtime

### Goal

真正把 `USER.md / IDENTITY.md / SOUL.md / MEMORY.md` 作为长期上下文主档，而不是继续由散乱的结构化写接口和兼容投影支配 runtime。

### Scope

- `USER.md` owner 落地
- `IDENTITY.md` 助手身份 owner 落地
- `SOUL.md` 助手行为 owner 落地
- `MEMORY.md` active durable memory layer 落地
- compat adapter / migration script / deprecation timeline
- runtime 注入顺序固定
- settings/document routes 对齐

### Why Second

如果 Phase 1 解决的是“路由判断”，Phase 2 解决的就是“真正写到哪里、读自哪里”。
没有这个阶段，路由结果还是会落到旧 owner 上。

### Exit Criteria

- `USER / IDENTITY / SOUL / MEMORY` 文件主档在 runtime 中有稳定 owner
- `/api/user-identity`、`/api/identity/document`、`/api/soul/document` 语义对齐
- runtime 注入顺序明确：`USER -> IDENTITY -> SOUL -> MEMORY`
- old identity semantics 不再继续扩散

### Need Separate Plan

需要新增专项实施计划：

- `docs/superpowers/plans/2026-04-16-user-identity-soul-memory-file-native-runtime-implementation-plan.md`

### Forbidden Shortcuts

- 不允许只改文案不改 runtime 注入
- 不允许只改 document routes 不改结构化兼容层
- 不允许让 `USER` 和 `IDENTITY` 继续共享旧语义

---

## 8. Phase 3 — Notebook -> Knowledge Compile Engine

### Goal

把 Knowledge 真正做成 Notebook 的编译层，而不是“看起来像知识库的若干页面”。

### Scope

- `KnowledgeSourceCandidate`
- compile queue
- compile job
- raw snapshot
- page generation
- graph rebuild
- citations / query binding
- stale / source_missing lifecycle
- revision request resolution
- reconciliation / archive cleanup

### Why Third

Knowledge 依赖 Phase 1 的 routing contract 和 Phase 2 的长期内容 owner。
如果前两者没收口，Knowledge 仍会不断被误当成：

- Notebook 的替代品
- Memory 的替代品
- RAG 数据库

### Exit Criteria

- Knowledge 无法脱离 Notebook source 单独创建
- 每个 page 都有 provenance
- Notebook 修改后 page 进入 `stale`
- query 返回 compiled pages + citations，而不是原文扫描结果
- 用户对 page 的纠错通过 revision request 闭环，而不是直接编辑

### Need Separate Plan

需要新增专项实施计划：

- `docs/superpowers/plans/2026-04-16-notebook-to-knowledge-compile-engine-implementation-plan.md`

### Forbidden Shortcuts

- 不允许把向量检索当成 Knowledge 本体
- 不允许绕过 compile queue 直接生成 page
- 不允许用户直接编辑 compiled page 正文

---

## 9. Phase 4 — Assistant Commitment / Automation Productization

### Goal

把 Automation 从技术上正确的 scheduler substrate 收口成用户可理解、可信任的助手持续承诺系统。

### Scope

- `Assistant Commitment` 产品模型
- user-created / agent-suggested / agent-maintenance 三类任务
- 权限矩阵真正接入 runtime
- delivery success vs execution success 分离
- 可见性 / pause / resume / explainability
- product copy 重写

### Why Fourth

Automation 一旦开始真正“持续替用户办事”，风险就会变大。
所以必须先有：

- 路由 contract
- owner contract
- file-native persona/identity contract
- notebook/knowledge data scopes

### Exit Criteria

- 用户看到的是“助手会持续替我做什么”
- 每个 commitment 都有输入范围、写入范围、投递范围和失败策略
- agent-owned tasks 不再像后台黑箱一样运行

### Need Separate Plan

需要新增专项实施计划：

- `docs/superpowers/plans/2026-04-16-assistant-commitment-automation-productization-implementation-plan.md`

### Forbidden Shortcuts

- 不允许继续以 job id / schedule kind / owner_type 作为主要产品叙事
- 不允许 agent-owned automation 默认具备高权限外发行为

---

## 10. Phase 5 — Runtime Behavior Closure

### Goal

把前四个阶段定义好的合同真正接进 agent runtime 的行为链。

### Scope

- middleware 接线
- read routing 接线
- Notebook 读取限制 enforcement
- Knowledge query 触发偏置
- `temporary_chat / memory_read / memory_write` 真正统一
- child-run / delegated path 的长期层写入限制
- bridge / guardian / automation run 的行为一致性

### Why Fifth

前面四个阶段定义的是对象、owner、contract、权限。
这一阶段要解决的是：

> agent 运行时是否真的按这些合同行动。

### Exit Criteria

- 一句用户输入落到哪个层不再靠各 middleware 临场判断
- runtime 读上下文的顺序稳定
- Notebook 不会在无授权情况下被全局搜索
- child-runs 不会继续污染长期层
- maintenance task 的行为受到限制

### Need Separate Plan

需要新增专项实施计划：

- `docs/superpowers/plans/2026-04-16-personal-assistant-runtime-behavior-closure-implementation-plan.md`

### Forbidden Shortcuts

- 不允许先靠 prompt 约束“记住去这么做”替代 runtime enforcement
- 不允许把运行时错误归咎于模型，而跳过 owner/routing 行为收口

---

## 11. Phase 6 — Product IA Collapse And User-Facing Simplification

### Goal

把用户面对的对象压缩成稳定、低复杂度的个人助手产品心智，而不是继续并列暴露 subsystem。

### Scope

- 主导航收口
- Settings 高级项下沉
- Memory / Identity / Soul / Notebook / Knowledge / Automation 的产品层级重排
- Bridge / Guardian 文案重写
- Capability / MCP / CLI / Skills 在普通用户面的降级
- onboarding / empty states / product copy 重写

### Why Last

如果先做 UI collapse，再回头改 owner/routing/runtime，一定返工。
所以这一阶段必须压后。

### Exit Criteria

- 用户面对的一级对象显著减少
- 产品更像个人助手，而不是 agent platform 控制台
- 高级面转入 developer mode / advanced settings

### Need Separate Plan

需要新增专项实施计划：

- `docs/superpowers/plans/2026-04-16-product-ia-collapse-user-facing-simplification-implementation-plan.md`

### Forbidden Shortcuts

- 不允许在 owner/routing 未稳时只改页面文案
- 不允许先把高级入口藏起来，却仍保留旧行为链与真相源分裂

---

## 12. Roadmap Dependency Rules

必须遵守：

1. 没有 Phase 1，不进入 Phase 2-6
2. 没有 Phase 2，不进入 Phase 3-5
3. 没有 Phase 3，不进入以 Knowledge 为核心的长期行为闭环
4. 没有 Phase 4，不把 Automation 当个人助手主卖点
5. 没有 Phase 5，不对外声称“行为链已经稳定收口”
6. 没有 Phase 6，不对普通用户做全面产品推广

---

## 13. What To Defer Deliberately

为防止 roadmap 失焦，以下内容应明确后置：

- 更花哨的 Knowledge graph workbench 视觉设计
- 更复杂的多智能体产品化 archetype
- 更全面的 skill marketplace / plugin ecosystem 产品化
- 更激进的自进化 / self-improvement productization
- 大规模平台能力扩展（新的 tool category、新的 bridge 平台）若它们不能服务个人助手主线

---

## 14. Completion Standard

只有满足下面四条，才可以说这条 roadmap 基本完成：

1. 用户能清楚区分 Notebook / Knowledge / Memory / USER / IDENTITY / SOUL / Automation 的职责
2. agent 对“写哪里 / 读哪里 / 何时确认 / 何时持续做”有稳定可审计的行为链
3. 系统默认体验像个人助手，而不是平台控制台
4. 高级 runtime 能力仍然保留，但已被压到普通用户心智模型之后

---

## 15. Current Execution Order

从现在开始，后续开发应按以下顺序推进：

1. 执行已存在的：
   - [docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md)
2. 然后补并执行：
   - `2026-04-16-user-identity-soul-memory-file-native-runtime-implementation-plan.md`
   - `2026-04-16-notebook-to-knowledge-compile-engine-implementation-plan.md`
   - `2026-04-16-assistant-commitment-automation-productization-implementation-plan.md`
   - `2026-04-16-personal-assistant-runtime-behavior-closure-implementation-plan.md`
   - `2026-04-16-product-ia-collapse-user-facing-simplification-implementation-plan.md`

任何新的大功能、平台扩展或产品叙事调整，如果不能映射到上述阶段，都不应优先进入主线。
