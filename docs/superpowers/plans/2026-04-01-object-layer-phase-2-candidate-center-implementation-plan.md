# Object Layer Phase 2 Candidate Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地对象层第二阶段：建立 Candidate Center contract、candidate lifecycle、review/apply/dismiss/defer 治理链，以及候选中心抽屉/详情页最小产品面，让 object bridge candidate 从“可生成”升级到“可治理”。

**Architecture:** 保留 Phase 1 的 `/api/notebook/bridge/*` 和 `/api/projects/{project_id}/bridge/*` 生成入口，在其上新增统一 `/api/object-candidates/*` review/apply contract。后端通过 candidate registry + apply handler registry 管理生命周期与类型化落地，前端通过全局候选中心抽屉和详情页消费统一 candidate center API。第一版范围严格限制在 object bridge candidates，不收编 rewrite pending、permission request、completion lane。

**Tech Stack:** Python backend, FastAPI routers, SQLite repository layer, Pydantic, Next.js frontend, TanStack Query, pytest, node:test

---

## Scope Lock

本计划只覆盖 `Object Layer Phase 2`，不在本轮内实现：

- Notebook 2.0 全量检索 / 多视图
- Projects 2.0 completion lane 的完整产品面
- SkillTool 真正 authoring/publish flow
- 候选中心内编辑 candidate
- permission request center
- Notebook rewrite pending flow 收编进候选中心
- agent runtime 自动投递 candidate

本轮只做：

- candidate lifecycle contract
- `/api/object-candidates/*` 统一 review/apply/dismiss/defer API
- candidate action history / guard / last_error 基础结构
- apply handler registry
- frontend 候选中心抽屉 + 详情页最小产品面
- Notebook / Projects 入口跳转候选中心

## Source Specs

本计划严格基于下面这些设计稿执行：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-object-layer-phase-2-candidate-center-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-project-notebook-memory-bridge-api-contract-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-knowledge-work-object-model-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-2.0-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-projects-2.0-design.md`

## Architecture Invariants

- Notebook 是用户资产，不允许自动偷偷写入
- Project 不能自动写 Notebook 正文
- global Memory 不能直接吃长文档正文
- 所有跨对象动作保持 candidate-first 或 draft-first
- 候选中心本身就是确认面；点击 `apply` 即最终确认
- 第一版不允许在候选中心编辑 candidate
- `defer` 不是生命周期状态，只是队列属性
- 候选中心第一版只接 object bridge candidates
- UI 不能绕开 Candidate Center contract 直接自行 apply
- 必须优先减少返工、保证产品化和天然兼容，不走补丁式塞功能路线

## File Structure

### Create

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/object_candidates.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/candidate_handlers.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_lifecycle.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_apply.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_guards.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_audit.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/types.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/api.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/hooks.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/api.test.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/candidates/candidate-center-drawer.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/candidates/candidate-detail-page.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/candidates/candidate-center.contract.test.ts`

### Modify

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/app.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/repository.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/__init__.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/projects/project-dashboard-page.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/layout.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/candidates/[candidate_id]/page.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/types.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/navigation/desktop-routes.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/README.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/README.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/06-notebook/README.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/10-projects/README.md`

---

## Task 1: 扩展 candidate domain model 与 repository

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/repository.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_lifecycle.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_audit.py`

- [ ] **Step 1: 写失败测试，锁定 lifecycle / defer / action history / last_error 最小语义**

测试至少覆盖：
- `draft -> ready`
- `ready -> dismissed`
- `ready -> expired`
- `defer` 只更新队列属性，不改变 `status`
- action history 可持久化
- `last_error` 和 `terminal_reason` 可持久化

```python
def test_candidate_repository_defer_updates_queue_fields_without_status_change(tmp_path):
    repo = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    candidate = BridgeCandidateRecord(
        id="cand_1",
        candidate_type="project_draft",
        status="ready",
        title="Project Draft",
        summary="summary",
        requires_confirmation=True,
        payload={},
        provenance=[],
        available_actions=["apply", "dismiss", "defer"],
    )
    repo.save_candidate(candidate)

    updated = repo.defer_candidate(
        "cand_1",
        deferred_until="2026-04-02T09:00:00Z",
        deferred_reason="wait",
        actor_type="user",
    )

    assert updated.status == "ready"
    assert updated.deferred_until == "2026-04-02T09:00:00Z"
    assert updated.deferred_reason == "wait"
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_candidate_lifecycle.py tests/test_object_candidate_audit.py -q
```

Expected:
- FAIL with missing fields / missing repository methods

- [ ] **Step 3: 扩展模型**

要求：
- 在 `BridgeCandidateRecord` 上补 `risk_level / available_actions / deferred_* / reviewed_* / applied_* / terminal_reason / guard_state / last_error`
- 新增 `CandidateActionEvent`
- 保持第一版只服务 object bridge candidates，不引入更广义 candidate type

- [ ] **Step 4: 扩展 repository**

要求：
- 新增 candidate action history 存储表
- 新增 `list_candidates()` 的基础过滤能力
- 新增：
  - `mark_candidate_ready(...)`
  - `dismiss_candidate(...)`
  - `expire_candidate(...)`
  - `defer_candidate(...)`
  - `record_candidate_error(...)`
  - `list_candidate_events(...)`
- 不改 `projects.sqlite3` 既有结构，仍使用独立 `object_bridges.sqlite3`

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_candidate_lifecycle.py tests/test_object_candidate_audit.py -q
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/object_bridges/models.py \
  backend/packages/harness/nion/object_bridges/repository.py \
  backend/tests/test_object_candidate_lifecycle.py \
  backend/tests/test_object_candidate_audit.py
git commit -m "feat(object-candidates): add lifecycle and audit models"
```

## Task 2: 建立 apply handler registry 与 guard 语义

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/candidate_handlers.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/object_bridges/__init__.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_apply.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_guards.py`

- [ ] **Step 1: 写失败测试，锁定 apply contract 与 guard 行为**

测试至少覆盖：
- `project_draft` 可 apply
- `notebook_draft` 可 apply
- `memory_entry` 可 apply
- `project_constraint` 可 apply
- `skill_candidate` 第一版不可 apply
- 结构性 guard 失败进入 `expired`
- 执行性失败保留 `ready + last_error`

```python
def test_apply_skill_candidate_is_rejected_in_phase2(tmp_path):
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_skill_candidate_from_project(
        project_id="proj-1",
        scope="whole_project",
    )
    service.mark_candidate_ready(candidate.id)

    with pytest.raises(ValueError):
        service.apply_candidate(candidate.id, actor_type="user")
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_candidate_apply.py tests/test_object_candidate_guards.py -q
```

Expected:
- FAIL with missing handler registry / missing apply API

- [ ] **Step 3: 实现 handler registry**

要求：
- 定义 type-specific apply handler registry
- 第一期只注册：
  - `project_draft`
  - `notebook_draft`
  - `memory_entry`
  - `project_constraint`
- `skill_candidate` 不注册 apply handler

- [ ] **Step 4: 在 service 中补统一 apply / dismiss / defer / detail 逻辑**

要求：
- 新增：
  - `apply_candidate(...)`
  - `dismiss_candidate(...)`
  - `defer_candidate(...)`
  - `list_candidates(...)`
  - `get_candidate_detail(...)`
- 生成后应尽快把 candidate 推到 `ready`
- 详情返回应包含：
  - candidate
  - provenance
  - action_history
  - guard_state
  - target/source summaries

- [ ] **Step 5: 实现最小 guard 语义**

要求：
- `guard_state` 至少包含 `is_applicable / reasons / checked_at`
- 结构性失效时可推进 `expired`
- 执行性失败写 `last_error`，不自动 `expired`

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_candidate_apply.py tests/test_object_candidate_guards.py -q
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```bash
git add backend/packages/harness/nion/object_bridges/candidate_handlers.py \
  backend/packages/harness/nion/object_bridges/service.py \
  backend/packages/harness/nion/object_bridges/__init__.py \
  backend/tests/test_object_candidate_apply.py \
  backend/tests/test_object_candidate_guards.py
git commit -m "feat(object-candidates): add apply handlers and guards"
```

## Task 3: 接入统一 `/api/object-candidates/*` contract

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/object_candidates.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/app.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_object_candidate_api.py`

- [ ] **Step 1: 写失败测试，锁定 object-candidates API surface**

测试至少覆盖：
- `GET /api/object-candidates`
- `GET /api/object-candidates/{candidate_id}`
- `POST /api/object-candidates/{candidate_id}/apply`
- `POST /api/object-candidates/{candidate_id}/dismiss`
- `POST /api/object-candidates/{candidate_id}/defer`

```python
def test_object_candidates_list_returns_ready_candidates(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        created = client.post(
            "/api/notebook/bridge/project-drafts",
            json={"note_ids": ["note-1"], "fragment_ids": [], "mode": "project_draft"},
        )
        assert created.status_code == 200

        listed = client.get("/api/object-candidates")
        assert listed.status_code == 200
        assert listed.json()["items"]
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_candidate_api.py -q
```

Expected:
- FAIL with missing router or missing routes

- [ ] **Step 3: 实现 router**

要求：
- 使用统一 `ObjectBridgeService`
- response shape 区分 list item 与 detail payload
- `apply / dismiss / defer` 都通过统一 service，不绕过 service 直接调 repository

- [ ] **Step 4: 注册到 gateway / daemon**

要求：
- `backend/app/gateway/app.py` 挂入 router
- `backend/app/daemon/app.py` 同步挂入，保证 desktop shell 不会 404

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_object_candidate_api.py -q
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/gateway/routers/object_candidates.py \
  backend/app/gateway/app.py \
  backend/app/daemon/app.py \
  backend/tests/test_object_candidate_api.py
git commit -m "feat(object-candidates): add candidate center api"
```

## Task 4: 建立前端 `object-candidates` client contract

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-candidates/api.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/navigation/desktop-routes.ts`

- [ ] **Step 1: 写失败测试，锁定 client contract**

测试至少覆盖：
- list 请求
- detail 请求
- apply 请求
- dismiss 请求
- defer 请求
- candidate detail 路由 helper

```ts
test("object candidate APIs hit expected endpoints", async () => {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(`${init?.method ?? "GET"} ${String(input)}`);
    return new Response(JSON.stringify({ items: [], next_cursor: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await listObjectCandidates();
    await getObjectCandidate("cand_1");
    await applyObjectCandidate("cand_1");
    await dismissObjectCandidate("cand_1", { reason: "no" });
    await deferObjectCandidate("cand_1", {
      deferred_until: "2026-04-02T09:00:00Z",
      reason: "later",
    });

    assert.deepEqual(requests, [
      "GET /api/object-candidates",
      "GET /api/object-candidates/cand_1",
      "POST /api/object-candidates/cand_1/apply",
      "POST /api/object-candidates/cand_1/dismiss",
      "POST /api/object-candidates/cand_1/defer",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/object-candidates/api.test.ts
```

Expected:
- FAIL with missing module or missing exports

- [ ] **Step 3: 实现 types / api / hooks**

要求：
- list item 与 detail type 分开
- `apply / dismiss / defer` 统一挂到 `object-candidates`
- hook 保持和 `object-bridges` 相同的 TanStack Query 模式

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/object-candidates/api.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/object-candidates/types.ts \
  frontend/src/core/object-candidates/api.ts \
  frontend/src/core/object-candidates/hooks.ts \
  frontend/src/core/object-candidates/api.test.ts \
  frontend/src/core/navigation/desktop-routes.ts
git commit -m "feat(object-candidates): add frontend candidate client"
```

## Task 5: 实现候选中心抽屉与详情页

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/candidates/candidate-center-drawer.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/candidates/candidate-detail-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/candidates/candidate-center.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/layout.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/candidates/[candidate_id]/page.tsx`

- [ ] **Step 1: 写失败测试，锁定最小候选中心产品面**

测试至少覆盖：
- layout 中挂了全局抽屉
- 详情页路由存在
- 抽屉展示候选列表关键信息
- 抽屉具备 `apply / dismiss / defer / 查看详情`
- 详情页具备 `provenance / payload / action history`

```ts
void test("candidate center drawer exposes ready candidates and actions", async () => {
  const source = await readFile(
    new URL("./candidate-center-drawer.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /候选中心/);
  assert.match(source, /apply|应用/);
  assert.match(source, /dismiss|拒绝/);
  assert.match(source, /defer|稍后处理/);
  assert.match(source, /source_summary/);
  assert.match(source, /target_summary/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/candidates/candidate-center.contract.test.ts
```

Expected:
- FAIL with missing files or missing render contract

- [ ] **Step 3: 实现全局抽屉**

要求：
- 只展示 `ready` 队列
- 支持轻量 `apply / dismiss / defer`
- 不允许编辑 candidate
- 列表项展示：
  - 类型
  - 标题
  - 摘要
  - 来源
  - 目标
  - 创建时间

- [ ] **Step 4: 实现详情页**

要求：
- 路由 `/workspace/candidates/[candidate_id]`
- 展示：
  - candidate 摘要
  - provenance
  - side effect summary
  - payload 预览
  - action history
- 保持“查看/治理页面”，不加入编辑器

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/candidates/candidate-center.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/workspace/candidates/candidate-center-drawer.tsx \
  frontend/src/components/workspace/candidates/candidate-detail-page.tsx \
  frontend/src/components/workspace/candidates/candidate-center.contract.test.ts \
  frontend/src/app/workspace/layout.tsx \
  frontend/src/app/workspace/candidates/[candidate_id]/page.tsx
git commit -m "feat(object-candidates): add candidate center surfaces"
```

## Task 6: 接通对象页面与候选中心跳转

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/projects/project-dashboard-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/object-bridges/types.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/projects/project-pages.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定“生成后去候选中心查看”语义**

测试至少覆盖：
- Notebook 面板中仍保留生成入口
- Project dashboard 中仍保留生成入口
- 成功后存在候选中心导向文案或路由
- 页面不直接调用 `applyObjectCandidate`

```ts
void test("NotebookContextPanel keeps generation-only bridge actions", async () => {
  const source = await readFile(new URL("./notebook-context-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /生成项目草案|提炼长期记忆/);
  assert.doesNotMatch(source, /applyObjectCandidate/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/projects/project-pages.contract.test.ts
```

Expected:
- FAIL with missing candidate center guidance

- [ ] **Step 3: 修改对象页面**

要求：
- 生成 candidate 成功后，toast 或 CTA 明确指向候选中心
- 仍不在页面内直接 `apply`
- 不把对象页面变成第二套 review surface

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/projects/project-pages.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/projects/project-dashboard-page.tsx \
  frontend/src/core/object-bridges/types.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  frontend/src/components/workspace/projects/project-pages.contract.test.ts
git commit -m "feat(object-candidates): connect object pages to candidate center"
```

## Task 7: 文档同步、全量回归与收尾自检

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/06-notebook/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/10-projects/README.md`

- [ ] **Step 1: 更新文档**

要求：
- README 说明候选中心与 object bridge candidate review flow
- backend/CLAUDE.md 说明 `/api/object-candidates/*` surface
- docs/test 更新 Notebook / Projects 的候选中心测试建议

- [ ] **Step 2: 跑后端回归**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest \
  tests/test_object_bridge_models.py \
  tests/test_object_bridge_repository.py \
  tests/test_object_bridge_api.py \
  tests/test_object_candidate_lifecycle.py \
  tests/test_object_candidate_apply.py \
  tests/test_object_candidate_guards.py \
  tests/test_object_candidate_audit.py \
  tests/test_object_candidate_api.py -q
```

Expected:
- PASS

- [ ] **Step 3: 跑前端回归**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/core/object-bridges/api.test.ts \
  src/core/object-candidates/api.test.ts \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/projects/project-pages.contract.test.ts \
  src/components/workspace/candidates/candidate-center.contract.test.ts
pnpm exec tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 4: 做补丁式实现自检**

检查点：
- 是否把 apply/dismiss/defer 散落到 Notebook / Projects 页面
- 是否把候选中心做成第二套编辑器
- 是否让 `defer` 演化成新的生命周期状态
- 是否让非 object bridge flows 混入第一版

- [ ] **Step 5: Commit**

```bash
git add README.md \
  backend/CLAUDE.md \
  docs/test/README.md \
  docs/test/06-notebook/README.md \
  docs/test/10-projects/README.md
git commit -m "docs(object-candidates): document candidate center"
```

## 测试方案总览

### 后端

- `tests/test_object_candidate_lifecycle.py`
- `tests/test_object_candidate_apply.py`
- `tests/test_object_candidate_guards.py`
- `tests/test_object_candidate_audit.py`
- `tests/test_object_candidate_api.py`

重点验证：
- 生命周期状态机
- `defer` 只是队列属性
- apply handler registry 行为
- guard / expired / last_error 语义
- `/api/object-candidates/*` contract 稳定

### 前端

- `src/core/object-candidates/api.test.ts`
- `src/components/workspace/candidates/candidate-center.contract.test.ts`
- `src/components/workspace/notebook/notebook-context-panel.contract.test.ts`
- `src/components/workspace/projects/project-pages.contract.test.ts`
- `pnpm exec tsc --noEmit`

重点验证：
- 抽屉 / 详情页 surface 稳定
- 对象页面仍然只是 generation surface
- 不存在页面级 apply 旁路

## 验收标准

### A. 生命周期验收

1. candidate 已正式支持 `draft / ready / applied / dismissed / expired`
2. `defer` 只更新队列属性，不成为新的生命周期状态

### B. Contract 验收

3. `/api/object-candidates/*` 统一提供 list/detail/apply/dismiss/defer
4. apply handler registry 存在且只承载第一版允许 apply 的 candidate 类型

### C. 产品面验收

5. 存在全局候选中心抽屉
6. 存在独立候选详情页
7. 第一版候选中心不允许编辑 candidate

### D. 边界验收

8. Notebook / Projects 页面生成 candidate 后不直接 apply
9. 第一版候选中心只处理 object bridge candidates
10. `skill_candidate` 不会在第一版直接落成真实 skill

### E. 可扩展性验收

11. 后续 completion lane 可复用相同 Candidate Center contract
12. 后续 runtime / agent-generated candidate 可在不推翻 Phase 2 的前提下接入

## 提交节奏

建议提交节奏固定为 7 个原子提交：

1. `feat(object-candidates): add lifecycle and audit models`
2. `feat(object-candidates): add apply handlers and guards`
3. `feat(object-candidates): add candidate center api`
4. `feat(object-candidates): add frontend candidate client`
5. `feat(object-candidates): add candidate center surfaces`
6. `feat(object-candidates): connect object pages to candidate center`
7. `docs(object-candidates): document candidate center`

## 风险提醒

- 不要把候选中心演化成第二套对象编辑器
- 不要在对象页面复制 review/apply 逻辑
- 不要把 completion lane / rewrite pending / permission request 一起塞进第一版
- 不要让 `defer` 污染生命周期模型
- 不要绕过 service 直接让 router 或页面操作 repository
