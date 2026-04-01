# Object Layer Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地对象层第一阶段：建立 Project / Notebook / Memory 之间的 bridge domain contract、candidate persistence、bridge API 和最小 UI 接线，为后续 Notebook 2.0 / Projects 2.0 的产品化升级提供稳定、低返工的基础。

**Architecture:** 先补 object bridge domain model 与 repository，再补 service 和 `/api/notebook/bridge/*` / `/api/projects/{project_id}/bridge/*` 契约，最后接最小 UI 入口。整个阶段坚持 candidate-first、confirmation-aware、provenance-first，不允许页面直接跨对象写入。

**Tech Stack:** Python backend, FastAPI routers, SQLite repository layer, Pydantic, Next.js frontend, TanStack Query, pytest, node:test

---

## Scope Lock

这个计划只覆盖对象层第一阶段，不在本轮内实现：

- Notebook 2.0 全量检索与多视图
- Projects 2.0 全量 dashboard / lane / completion lane
- global Memory provider 演进
- SkillTool
- plugin / MCP

本轮只做：

- object bridge domain contract
- bridge candidate / reference persistence
- bridge API
- 最小的 Notebook / Projects UI 入口

## Source Specs

本计划严格基于下面 5 份设计稿执行：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-knowledge-work-object-model-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-project-bridge-actions-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-2.0-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-projects-2.0-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-project-notebook-memory-bridge-api-contract-design.md`

## Architecture Invariants

- Notebook 是用户资产，不允许自动偷偷写入
- Project 不能自动写 Notebook 正文
- global Memory 不能直接吃长文档正文
- 所有跨对象动作必须 candidate-first 或 draft-first
- 所有跨对象动作必须带 provenance
- UI 不能绕开 bridge API 直接跨对象写入
- 必须优先减少返工、保证产品化和天然兼容，不走补丁式塞功能路线

## File Structure

### Create

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/repository.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_repository.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_api.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/types.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/api.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/hooks.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/api.test.ts`

### Modify

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/notebook.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/projects.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/projects/service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/api.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/hooks.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/projects/api.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/projects/hooks.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/projects/project-dashboard-page.tsx`

---

## Task 1: 建立 object bridge 核心模型

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/models.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_models.py`

- [ ] **Step 1: 写失败测试，锁定 candidate / provenance / reference link 最小模型**

测试至少覆盖：
- `NotebookDraftCandidate`
- `ProjectDraftCandidate`
- `MemoryEntryCandidate`
- `SkillCandidateDraft`
- `BridgeActionProvenance`
- `ProjectReferenceLink`
- `NotebookReferenceLink`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_models.py -q
```

Expected:
- FAIL with missing module or missing symbols

- [ ] **Step 3: 实现最小模型**

要求：
- 只定义 domain model
- 不掺入 API / service 逻辑

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_models.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/object_bridges/models.py \
  backend/tests/test_object_bridge_models.py
git commit -m "feat(object-bridge): add bridge candidate models"
```

## Task 2: 建立 bridge repository 持久化

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/repository.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_repository.py`

- [ ] **Step 1: 写失败测试，锁定 candidate 与 reference link 的持久化语义**

测试至少覆盖：
- create / get / list candidate
- candidate status flow
- create reference link
- provenance 存取

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_repository.py -q
```

- [ ] **Step 3: 实现 repository**

要求：
- 不改 `projects.sqlite3` 既有对象结构
- bridge 数据独立存储
- candidate-first 生命周期可持久化

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_repository.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/object_bridges/repository.py \
  backend/tests/test_object_bridge_repository.py
git commit -m "feat(object-bridge): add repository for bridge candidates"
```

## Task 3: 建立 bridge service

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_api.py`

- [ ] **Step 1: 写失败测试，锁定 service 层动作**

测试至少覆盖：
- `create_project_from_notebook`
- `create_plan_from_notebook`
- `extract_constraints_from_notebook`
- `export_project_summary_to_notebook`
- `extract_long_term_memory_from_project`
- `extract_memory_from_notebook`
- `extract_skill_candidate_from_project`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_api.py -q
```

- [ ] **Step 3: 实现最小 service**

要求：
- 先生成 candidate
- 不直接把高风险动作写入目标对象
- 所有返回都带 provenance

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_api.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/object_bridges/service.py \
  backend/tests/test_object_bridge_api.py
git commit -m "feat(object-bridge): add bridge service candidates"
```

## Task 4: 扩展 notebook router 接入 bridge API

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/notebook.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/hooks.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/api.test.ts`

- [ ] **Step 1: 写失败测试，锁定 notebook bridge endpoints**

测试至少覆盖：
- `POST /api/notebook/bridge/project-drafts`
- `POST /api/notebook/bridge/project-plan-drafts`
- `POST /api/notebook/bridge/project-constraint-candidates`
- `POST /api/notebook/bridge/memory-candidates`

- [ ] **Step 2: 运行前端 contract 测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/object-bridges/api.test.ts
```

- [ ] **Step 3: 接入 notebook bridge router**

要求：
- notebook 仍保留现有 CRUD / assist / import 接口
- bridge 作为增量 `/bridge/*` 子资源

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/object-bridges/api.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/notebook.py \
  frontend/src/core/notebook/api.ts \
  frontend/src/core/notebook/hooks.ts \
  frontend/src/core/object-bridges/types.ts \
  frontend/src/core/object-bridges/api.ts \
  frontend/src/core/object-bridges/hooks.ts \
  frontend/src/core/object-bridges/api.test.ts
git commit -m "feat(object-bridge): add notebook bridge api"
```

## Task 5: 扩展 projects router 接入 bridge API

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/projects.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/projects/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/projects/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/projects/hooks.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_bridge_api.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/api.test.ts`

- [ ] **Step 1: 写失败测试，锁定 projects bridge endpoints**

测试至少覆盖：
- `POST /api/projects/{project_id}/bridge/notebook-drafts`
- `POST /api/projects/{project_id}/bridge/memory-candidates`
- `POST /api/projects/{project_id}/bridge/skill-candidates`
- `POST /api/projects/{project_id}/references/notebook-notes`

- [ ] **Step 2: 运行后端/前端测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_api.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/object-bridges/api.test.ts
```

- [ ] **Step 3: 接入 projects bridge router**

要求：
- 与现有 project decisions 保持兼容
- completion 提炼类动作后续可复用 bridge service

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_bridge_api.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/object-bridges/api.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/projects.py \
  backend/packages/harness/nion/projects/service.py \
  frontend/src/core/projects/api.ts \
  frontend/src/core/projects/hooks.ts \
  backend/tests/test_object_bridge_api.py \
  frontend/src/core/object-bridges/api.test.ts
git commit -m "feat(object-bridge): add project bridge api"
```

## Task 6: 最小 UI 接线

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/projects/project-dashboard-page.tsx`

- [ ] **Step 1: 写失败 contract 测试，锁定最小 bridge 入口存在**

要求：
- Notebook context panel 有最小 bridge action 入口
- Project dashboard 有最小导出/提炼入口
- 不要求完整 UI，只要求 contract 级入口

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/projects/project-pages.contract.test.ts
```

- [ ] **Step 3: 接入最小 UI 入口**

要求：
- 不一次性做完整 Notebook 2.0 / Projects 2.0
- 只提供进入 bridge action 的最小入口
- 默认都走 candidate-first

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/projects/project-pages.contract.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/projects/project-dashboard-page.tsx
git commit -m "feat(object-bridge): add minimal bridge action entrypoints"
```

## Task 7: Phase 1 整体验收与补丁式实现自检

**Files:**
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-knowledge-work-object-model-design.md`
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-project-bridge-actions-design.md`
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-2.0-design.md`
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-projects-2.0-design.md`
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-project-notebook-memory-bridge-api-contract-design.md`

- [ ] **Step 1: 运行对象层相关测试**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest \
  tests/test_object_bridge_models.py \
  tests/test_object_bridge_repository.py \
  tests/test_object_bridge_api.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/core/object-bridges/api.test.ts \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/projects/project-pages.contract.test.ts
```

- [ ] **Step 2: 做补丁式实现自检**

检查项：

- 是否仍然通过页面组件直接跨对象写入
- 是否仍然让 completion / import / assist 各自维持一套私有 bridge 逻辑
- 是否把 candidate-first 退化成直接写入
- 是否遗漏 provenance

如果任一项成立，继续重构后再进入最终提交。

- [ ] **Step 3: 提交最终 Object Layer Phase 1 落地结果**

```bash
git add backend/packages/harness/nion/object_bridges \
  backend/app/gateway/routers/notebook.py \
  backend/app/gateway/routers/projects.py \
  backend/packages/harness/nion/projects/service.py \
  backend/tests/test_object_bridge_models.py \
  backend/tests/test_object_bridge_repository.py \
  backend/tests/test_object_bridge_api.py \
  frontend/src/core/object-bridges \
  frontend/src/core/notebook/api.ts \
  frontend/src/core/notebook/hooks.ts \
  frontend/src/core/projects/api.ts \
  frontend/src/core/projects/hooks.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/projects/project-dashboard-page.tsx \
  docs/superpowers/plans/2026-04-01-object-layer-phase-1-implementation-plan.md
git commit -m "feat(object-layer): implement phase 1 bridge contracts"
```

## Self-Review

在开始执行前，先检查这份计划是否满足：

1. 覆盖了对象层 5 份设计稿的关键要求
2. 没有 placeholder 式步骤
3. 不要求 UI 先行定义跨对象行为
4. candidate-first、confirmation-aware、provenance-first 都被落实到步骤里
5. 没有把 Notebook 2.0 / Projects 2.0 全量 UI 一次塞进本轮

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-01-object-layer-phase-1-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
