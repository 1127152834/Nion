# Memory / Soul 共识计划骨架

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

## 推荐方案

采用 A+：先做主链解耦和层级修正，再做 surface split，最后清 compat 与壳代码。理由是它能优先解决 P1 结构错误，同时保留迁移节奏。

## 模块级 Work Items

1. `backend/packages/harness/nion/memory_os/growth_orchestrator.py`：切断 soul proposal 到 learning/procedure/automation 的自动投影。
2. `backend/packages/harness/nion/memory_os/soul_reflection.py`：移除 repeated-needs 直驱 soul proposal。
3. `backend/packages/harness/nion/memory/soul/service.py`：取消 `identity_narrative` freshness。
4. 同文件：明确 `relationship_stance` 与 `adaptive_overlay` 的边界。
5. `backend/packages/harness/nion/memory_os/soul_runtime.py`：重排 stable/active layer 输出。
6. `backend/packages/harness/nion/memory/runtime_engine/service.py`：消除与 soul runtime 的重复职责。
7. `backend/app/gateway/routers/memory.py`：改为 canonical user-facing memory payload。
8. `backend/app/gateway/routers/memory_growth.py`：迁为 internal surface。
9. `backend/app/gateway/routers/memory_soul.py`：改为独立 soul summary API。
10. `backend/packages/harness/nion/memory/soul/console_service.py`：拆 summary 与 governance。
11. `backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py`：修正硬编码时间与初始化 provenance。
12. `backend/packages/harness/nion/memory_os/compat.py`：降为迁移桥。
13. `frontend/src/components/workspace/memory/memory-home-page.tsx`：移除 growth/ledger/evidence/runtime trace 入口。
14. `frontend/src/components/workspace/memory/memory-user-page.tsx`：移除 freeze/forget/reject/correct 直接操作。
15. `frontend/src/components/workspace/memory/memory-growth-panel.tsx`：转 internal 或退役。
16. `frontend/src/components/workspace/memory/soul-console-page.tsx`：改为只读 soul summary page。
17. `frontend/src/core/soul/api.ts`：从 growth 子路由迁移到独立 soul API。
18. `frontend/src/core/memory-growth-v2/*`、`memory-surface-tabs.tsx`、`memory-console-panel.tsx`：删除壳代码与空壳测试。

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
