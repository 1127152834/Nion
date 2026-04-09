# Memory / Soul 共识计划

日期：2026-04-09

## Principles

1. 用户面只暴露“记住了什么”，不暴露治理流程。
2. `soul` 必须独立于 `memory growth`，不能继续作为其子功能。
3. `constitution / identity_narrative / relationship_stance` 是稳定层，`adaptive_overlay` 是唯一短期层。
4. canonical domain 优先，compat 仅作迁移桥。
5. 先切边界与合同，再删壳与旧实现。

## Drivers

1. 现有 `growth_orchestrator + soul_reflection` 将 repeated needs 直接推入 soul / learning / automation 主链，边界错误。
2. 现有 `memory.py / memory_growth.py / memory_soul.py` 与前端 memory pages 共同把 internal governance 暴露给普通用户。
3. `memory-growth-v2`、`memory-surface-tabs`、`memory-console-panel`、legacy contracts 正在固化补丁式结构。

## Options

### A. 渐进收口

先切后端边界，再重构用户面，最后退休 compat 与壳代码。

Pros：
- 风险更可控。
- 适合按合同测试分阶段迁移。

Cons：
- 过渡期会有双轨语义。

### B. 边界重置

一次性重做 memory/soul 的 API、前端路由和页面结构。

Pros：
- 目标架构最干净。

Cons：
- 改动面过大，容易同时击穿前后端与桌面端集成。

### 最强反案

继续把 `memory / soul / growth` 视为统一的 `agent self` 演化系统，强化 proposal / ledger / override 一体化控制台。

驳回原因：
- 与“memory 用户面无感”原则冲突
- 与“soul 独立模块”原则冲突
- 会继续把长期人格和近期行为模式混成同一治理面
- 会继续放大当前 contract tests 锁错产品面的技术债

## 推荐方案

采用 A+：先做主链解耦和层级修正，再做 surface split，最后清 compat 与壳代码。理由是它能优先解决 P1 结构错误，同时保留迁移节奏。

## 架构修正

1. `Soul` 不应收缩成“只读 soul summary page”，而应是独立的 `Soul Settings` 模块：允许稳定人格配置，但不暴露 revision / rollback / freeze auto evolution。
2. contract tests 的重写必须前置；否则当前合同会继续锁定错误的治理控制台结构。
3. 导航与入口也在 scope 内：`workspace nav / command palette / settings dialog / desktop routes` 必须一起收口。
4. `ledger/evidence` 当前属于断裂入口，不能继续维持“首页有链接、但无正式 route/page”的状态。

## 模块级 Work Items

1. `backend/packages/harness/nion/memory_os/growth_orchestrator.py`：切断 soul proposal 到 learning/procedure/automation 的自动投影。
2. `backend/packages/harness/nion/memory_os/soul_reflection.py`：移除 repeated-needs 直驱 soul proposal。
3. `backend/packages/harness/nion/memory/soul/service.py`：取消 `identity_narrative` freshness。
4. 同文件：明确 `relationship_stance` 与 `adaptive_overlay` 的边界。
5. `backend/packages/harness/nion/memory_os/soul_governance.py`：修正 side-effect 路径，避免侧链继续漂移 stable layers。
6. `backend/packages/harness/nion/memory_os/relationship_soul.py`：明确 `relationship_stance` 的生成与刷新规则。
7. `backend/packages/harness/nion/memory_os/soul_runtime.py`：重排 stable/active layer 输出。
8. `backend/packages/harness/nion/memory/runtime_engine/service.py`：校准与 soul runtime 的职责边界。
9. `backend/packages/harness/nion/agents/lead_agent/prompt.py`、`backend/packages/harness/nion/prompt_sections/core.py`：确保 runtime 注入和 soul onboarding 遵守新边界。
10. `backend/app/gateway/routers/memory.py`：改为 canonical user-facing memory payload。
11. `backend/app/gateway/routers/memory_growth.py`：迁为 internal surface。
12. `backend/app/gateway/routers/memory_soul.py`：改为独立 soul summary/settings API。
13. `backend/packages/harness/nion/memory/soul/console_service.py`：拆 summary 与 governance。
14. `backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py`：修正硬编码时间与初始化 provenance。
15. `backend/packages/harness/nion/memory_os/compat.py`：降为迁移桥。
16. 先重写 `memory user-facing / soul summary / internal governance` 三套 API 和 contract tests，再动页面 affordance。
17. `frontend/src/components/workspace/memory/memory-home-page.tsx`：移除 growth/ledger/evidence/runtime trace 入口。
18. `frontend/src/components/workspace/memory/memory-user-page.tsx`：移除 freeze/forget/reject/correct 直接操作。
19. `frontend/src/components/workspace/memory/memory-growth-panel.tsx`：转 internal 或退役。
20. `frontend/src/components/workspace/memory/soul-console-page.tsx`：改为独立 `Soul Settings` 页面，保留稳定人格配置，不保留治理元数据。
21. `frontend/src/core/soul-console/*` 与 `frontend/src/core/soul/*`：收敛到独立 soul API/client，不再借壳 growth 子路由。
22. `frontend/src/core/memory-growth-v2/*`、`memory-surface-tabs.tsx`、`memory-console-panel.tsx`：删除壳代码与空壳测试。
23. `frontend/src/components/workspace/workspace-nav-menu.tsx`、`command-palette.tsx`、`settings-dialog.tsx`：同步调整 memory/soul 入口。
24. `frontend/src/core/navigation/desktop-routes.ts`、`desktop/src/renderer/renderer-app.tsx`：把 soul route 从 memory 子树独立出去，并处理 ledger/evidence 断链。
25. `backend/packages/harness/nion/agents/memory/updater.py`、`queue.py`：明确 compatibility-only owner 或退休。
26. 为 growth / ledger / evidence / runtime-trace 增加 developer-mode gating 机制与测试。

## 建议阶段顺序

1. `Phase 0`：先定义 `memory user-facing / soul summary / internal governance` 三套合同，再重写 contract tests 和行为题库。
2. `Phase 1`：修正 backend 边界与 soul runtime 语义。
3. `Phase 2`：重做 memory user-facing surface 与独立 soul module。
4. `Phase 3`：把 growth / ledger / evidence / runtime-trace 下沉到 internal/developer mode。
5. `Phase 4`：删除 compat 壳、V2 壳、空壳与未接主链代码。

## 验收标准

1. 普通用户进入 memory 时，只看到记忆总览与必要配置，不看到治理动作。
2. Soul 有独立模块与独立入口，不再作为 memory 子功能暴露。
3. `identity_narrative` 不会因 freshness 自动失效。
4. repeated needs 不会再直接驱动 soul proposal 进入主链。
5. `ledger / evidence / runtime-trace / growth` 不再作为普通首页一级入口。
6. `memory-growth-v2`、`MemorySurfaceTabs`、`MemoryConsolePanel` 不再被生产代码引用。
7. `prompt.py / prompt_sections/core.py / soul_runtime / runtime_engine` 在运行时注入上遵守 stable/active 分层。
8. `memory updater/queue` 已明确退出主链，internal surface 有真实 gating，而不是仅靠文案区分。

## PRD 提纲

1. 问题定义与现状证据
2. 目标用户、非目标用户
3. Memory user-facing surface
4. Soul 独立模块定义
5. Internal governance surface 定义
6. 领域模型与路由边界
7. 迁移阶段与删除清单
8. 验收标准

## Test-Spec 提纲

1. Unit：growth/soul/service/onboarding
2. Integration：memory router / soul router / internal growth router
3. Contract：memory home / user page / soul page / routes
4. Behavioral：基于 `docs/test/10-memory-soul`
5. Runtime verification：prompt 注入与 runtime context 一致性

## Pre-mortem

1. 只改 UI 不改主链，错误逻辑继续污染 runtime。
2. 只切主链不改合同，前端与桌面端仍会被旧语义牵制。
3. 把 soul 过度静态化，误伤 `adaptive_overlay` 的场景调节能力。
