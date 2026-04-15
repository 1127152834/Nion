# Nion Knowledge Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于已批准的 2026-04-15 Knowledge 重设计 spec，把当前“部分存在但合同错误”的 Knowledge 主链重构成可见、可查询、可引用、可回溯的产品级知识模块。

**Architecture:** 这次实现不是从零新建 Knowledge，而是围绕现有 `backend/packages/harness/nion/knowledge/*`、`backend/app/gateway/routers/knowledge.py`、`frontend/src/core/knowledge/*` 和 `frontend/src/components/workspace/knowledge/*` 做边界修复型改造。顺序必须是：先冻结新合同测试，再拆掉 Notebook 直编译路径，补 source registry/reconciliation 与 activity/job 状态，再升级 query/citation/runtime message metadata，最后修正 UI 与 graph 工作台。

**Tech Stack:** Python 3.12, FastAPI, Pydantic, SQLite, Markdown file storage, React 19, Next.js App Router, TanStack Query, node:test, pytest, `@xyflow/react`

---

## Scope Guard

这份计划严格实现 [2026-04-15-nion-llm-wiki-knowledge-module-redesign.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-nion-llm-wiki-knowledge-module-redesign.md)。

必须满足：

- `Notebook = raw`
- `Knowledge = compiled wiki`
- `Memory != Knowledge`
- Notebook `转为知识库` 只负责 enqueue，不直接 approve/compile
- Query 必须区分 `active / stale / archived`
- assistant 最终回答必须承载稳定的 knowledge citation metadata
- raw 删除/恢复必须经过 reconciliation，而不是依赖“重新扫描当前存在的笔记”
- Graph 升级优先复用现有依赖或原生实现，不新增前端布局依赖

本计划不覆盖：

- 自动后台编译全部 Notebook 内容
- 用户直接编辑知识页正文
- 外置 `/Users/zhangtiancheng/Documents/wiki` 工作区
- 全量聊天线程直接进入 Knowledge
- 新增图布局第三方依赖

## Existing Delta

当前代码与新 spec 的关键偏差：

1. Notebook 仍直接调用 `/api/knowledge/queue/approve`，形成“点击即编译”。
2. `KnowledgeSourceCandidate` / `KnowledgeCompileJob` / `KnowledgeQueryResult` 类型仍是旧合同。
3. Query 只返回 `page_ids`，没有 `citations / retrieval_policy / warnings`。
4. assistant 最终回答目前只挂 `knowledge_sources`，前端仍从 tool message 解析 `page_ids`。
5. source candidate store 只扫描当前存在的 Notebook 项，无法发现删除/恢复。
6. Graph 页虽有轻量拖拽，但布局只存 `localStorage`，不是 Knowledge 持久化合同。

实现必须优先消除这些偏差，不能继续在旧合同上包兼容层。

## File Map

### Backend: knowledge domain

- Modify: `backend/packages/harness/nion/knowledge/models.py`
- Modify: `backend/packages/harness/nion/knowledge/source_candidates.py`
- Modify: `backend/packages/harness/nion/knowledge/compile_jobs.py`
- Modify: `backend/packages/harness/nion/knowledge/page_store.py`
- Modify: `backend/packages/harness/nion/knowledge/query_service.py`
- Modify: `backend/packages/harness/nion/knowledge/graph_service.py`
- Create: `backend/packages/harness/nion/knowledge/activity_store.py`
- Create: `backend/packages/harness/nion/knowledge/reconciliation_service.py`

### Backend: API and runtime integration

- Modify: `backend/app/gateway/routers/knowledge.py`
- Modify: `backend/packages/harness/nion/tools/builtins/knowledge_tools.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Modify: `backend/packages/harness/nion/prompt_sections/extensions.py`

### Frontend: knowledge data contracts

- Modify: `frontend/src/core/knowledge/types.ts`
- Modify: `frontend/src/core/knowledge/api.ts`
- Modify: `frontend/src/core/knowledge/hooks.ts`
- Modify: `frontend/src/core/messages/utils.ts`

### Frontend: notebook bridge and knowledge UI

- Modify: `frontend/src/core/notebook/api.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-query-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-graph-page.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list-item.tsx`

### Tests

- Modify: `backend/tests/test_knowledge_router.py`
- Modify: `backend/tests/test_knowledge_source_candidates.py`
- Modify: `backend/tests/test_knowledge_query_service.py`
- Modify: `backend/tests/test_knowledge_query_tool_contract.py`
- Modify: `backend/tests/test_client.py`
- Create: `backend/tests/test_knowledge_reconciliation_service.py`
- Create: `backend/tests/test_knowledge_activity_store.py`
- Modify: `frontend/src/core/knowledge/api.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/messages/message-list-item.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts`

---

### Task 1: Freeze the new source enqueue and status contracts

**Files:**
- Modify: `backend/tests/test_knowledge_router.py`
- Modify: `frontend/src/core/knowledge/api.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`
- Modify: `backend/app/gateway/routers/knowledge.py`
- Modify: `frontend/src/core/knowledge/types.ts`
- Modify: `frontend/src/core/knowledge/api.ts`
- Modify: `frontend/src/core/notebook/api.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`

- [ ] **Step 1: Add failing backend router tests for enqueue and status-by-source**

Add these tests to `backend/tests/test_knowledge_router.py`:

```python
def test_knowledge_enqueue_endpoint_only_registers_candidate(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    note = NotebookService(base_dir=tmp_path).create_note(directory="", title="Inbox Note", body="body")

    with TestClient(create_app()) as client:
        response = client.post(
            "/api/knowledge/sources/enqueue",
            json={"source_id": f"source:notebook_note:{note.note_id}"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["enqueue_state"] == "enqueued"
    assert payload["compile_state"] == "idle"
    assert payload["status"] == "queued"
```

```python
def test_knowledge_source_status_endpoint_returns_bridge_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    note = NotebookService(base_dir=tmp_path).create_note(directory="", title="Roadmap", body="body")

    with TestClient(create_app()) as client:
        client.post(
            "/api/knowledge/sources/enqueue",
            json={"source_id": f"source:notebook_note:{note.note_id}"},
        )
        response = client.get(f"/api/knowledge/sources/source:notebook_note:{note.note_id}/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["tag_label"] == "知识库"
    assert payload["enqueue_state"] == "enqueued"
```

- [ ] **Step 2: Add failing frontend API tests for the new endpoints**

Append these tests to `frontend/src/core/knowledge/api.test.ts`:

```ts
void test("enqueueKnowledgeSource posts to the enqueue endpoint", async () => {
  let seenUrl = "";
  let seenBody = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        has_knowledge: true,
        tag_label: "知识库",
        status: "queued",
        enqueue_state: "enqueued",
        compile_state: "idle",
        created_page_ids: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const mod = await import("./api.ts");
  const payload = await mod.enqueueKnowledgeSource("source:notebook_note:note_1");

  assert.match(seenUrl, /\/api\/knowledge\/sources\/enqueue$/);
  assert.match(seenBody, /source:notebook_note:note_1/);
  assert.equal(payload.enqueue_state, "enqueued");
});
```

```ts
void test("loadNotebookKnowledgeStatus reads status-by-source", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        has_knowledge: true,
        tag_label: "知识库",
        status: "running",
        enqueue_state: "enqueued",
        compile_state: "running",
        created_page_ids: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const mod = await import("./api.ts");
  const payload = await mod.loadKnowledgeSourceStatus("source:notebook_note:note_1");

  assert.match(seenUrl, /\/api\/knowledge\/sources\/source:notebook_note:note_1\/status$/);
  assert.equal(payload.compile_state, "running");
});
```

- [ ] **Step 3: Tighten the notebook bridge contract test**

Replace the expectations in `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts` with:

```ts
assert.match(pageSource, /enqueue|入队|queue/);
assert.match(pageSource, /查看知识状态/);
assert.doesNotMatch(pageSource, /queue\/approve/);
assert.doesNotMatch(pageSource, /点击即编译|同步编译完成/);
```

- [ ] **Step 4: Run the failing subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
node --test frontend/src/core/knowledge/api.test.ts frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts
```

Expected: FAIL because the enqueue/status endpoints and frontend helpers do not exist yet.

- [ ] **Step 5: Implement the new bridge contract**

Add these shapes to `frontend/src/core/knowledge/types.ts`:

```ts
export interface NotebookKnowledgeStatus {
  has_knowledge: boolean;
  tag_label: "知识库";
  status: "queued" | "running" | "compiled" | "failed" | "stale" | "source_missing";
  enqueue_state: "not_enqueued" | "enqueued";
  compile_state: "idle" | "pending" | "running" | "succeeded" | "failed";
  last_job_id?: string;
  created_page_ids: string[];
  error_summary?: string;
}
```

Add these functions to `frontend/src/core/knowledge/api.ts`:

```ts
export async function enqueueKnowledgeSource(sourceId: string): Promise<NotebookKnowledgeStatus> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/sources/enqueue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id: sourceId }),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(await response.text(), `Failed to enqueue knowledge source (${response.status})`),
    );
  }
  return readJson(response);
}

export async function loadKnowledgeSourceStatus(sourceId: string): Promise<NotebookKnowledgeStatus> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/sources/${encodeURIComponent(sourceId)}/status`,
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(await response.text(), `Failed to load knowledge source status (${response.status})`),
    );
  }
  return readJson(response);
}
```

Update `frontend/src/core/notebook/api.ts`:

```ts
export { enqueueKnowledgeSource as enqueueNotebookSourceToKnowledge } from "../knowledge/api.ts";
export { loadKnowledgeSourceStatus as loadNotebookKnowledgeSourceStatus } from "../knowledge/api.ts";
```

Update `frontend/src/core/notebook/hooks.ts`:

```ts
export function useEnqueueNotebookSourceToKnowledge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sourceId: string) => enqueueNotebookSourceToKnowledge(sourceId),
    onSuccess: async (_payload, sourceId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["knowledge", "queue"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge", "source-status", sourceId] }),
      ]);
    },
  });
}
```

Update `backend/app/gateway/routers/knowledge.py` to add:

```python
class KnowledgeSourceEnqueueRequest(BaseModel):
    source_id: str
```

```python
@router.post("/sources/enqueue", response_model=NotebookKnowledgeStatus)
async def enqueue_knowledge_source(payload: KnowledgeSourceEnqueueRequest) -> NotebookKnowledgeStatus:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    store.refresh_from_notebook(notebook)
    return store.enqueue(payload.source_id)
```

```python
@router.get("/sources/{source_id}/status", response_model=NotebookKnowledgeStatus)
async def get_knowledge_source_status(source_id: str) -> NotebookKnowledgeStatus:
    return KnowledgeSourceCandidateStore().get_bridge_status(source_id)
```

- [ ] **Step 6: Re-run the subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
node --test frontend/src/core/knowledge/api.test.ts frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/gateway/routers/knowledge.py \
  backend/tests/test_knowledge_router.py \
  frontend/src/core/knowledge/types.ts \
  frontend/src/core/knowledge/api.ts \
  frontend/src/core/notebook/api.ts \
  frontend/src/core/notebook/hooks.ts \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts
git commit -m "Separate knowledge enqueue from compile approval"
```

---

### Task 2: Rebuild the candidate registry and source reconciliation chain

**Files:**
- Modify: `backend/packages/harness/nion/knowledge/models.py`
- Modify: `backend/packages/harness/nion/knowledge/source_candidates.py`
- Create: `backend/packages/harness/nion/knowledge/reconciliation_service.py`
- Create: `backend/packages/harness/nion/knowledge/activity_store.py`
- Modify: `backend/app/gateway/routers/knowledge.py`
- Create: `backend/tests/test_knowledge_reconciliation_service.py`
- Create: `backend/tests/test_knowledge_activity_store.py`
- Modify: `backend/tests/test_knowledge_source_candidates.py`
- Modify: `backend/tests/test_knowledge_router.py`

- [ ] **Step 1: Add failing model/store tests for `source_missing`, `enqueued_at`, and reconciliation**

Append to `backend/tests/test_knowledge_source_candidates.py`:

```python
def test_candidate_registry_keeps_missing_sources_instead_of_deleting_rows(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    notebook = NotebookService(base_dir=tmp_path)
    history = NotebookHistoryService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Roadmap", body="body")
    store = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    store.refresh_from_notebook(notebook)

    history.delete_note(note.note_id, actor_type="user")
    result = store.reconcile_with_notebook(notebook)
    candidate = store.get_candidate(f"source:notebook_note:{note.note_id}")

    assert f"source:notebook_note:{note.note_id}" in result.source_missing_ids
    assert candidate.status == "source_missing"
    assert candidate.missing_detected_at is not None
```

Create `backend/tests/test_knowledge_reconciliation_service.py`:

```python
def test_reconciliation_restores_source_as_stale_when_hash_changes(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    notebook = NotebookService(base_dir=tmp_path)
    history = NotebookHistoryService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Roadmap", body="v1")
    store = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    store.refresh_from_notebook(notebook)
    store.mark_compiled(f"source:notebook_note:{note.note_id}", compiled_at="2026-04-15T00:00:00Z")

    history.delete_note(note.note_id, actor_type="user")
    ReconciliationService(base_dir=tmp_path).run(notebook)
    history.restore_deleted_note(note.note_id, actor_type="user")
    notebook.update_note(note_id=note.note_id, body="v2", expected_content_hash=notebook.read_note(note.note_id).content_hash)
    result = ReconciliationService(base_dir=tmp_path).run(notebook)
    candidate = store.get_candidate(f"source:notebook_note:{note.note_id}")

    assert result.restored_source_ids
    assert candidate.status == "stale"
```

- [ ] **Step 2: Add failing router test for explicit reconcile**

Append to `backend/tests/test_knowledge_router.py`:

```python
def test_knowledge_reconcile_endpoint_marks_deleted_source_missing(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    notebook = NotebookService(base_dir=tmp_path)
    history = NotebookHistoryService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Roadmap", body="body")

    with TestClient(create_app()) as client:
      client.post("/api/knowledge/sources/enqueue", json={"source_id": f"source:notebook_note:{note.note_id}"})
      history.delete_note(note.note_id, actor_type="user")
      response = client.post("/api/knowledge/reconcile")

    assert response.status_code == 200
    assert f"source:notebook_note:{note.note_id}" in response.json()["source_missing_ids"]
```

- [ ] **Step 3: Run the failing subset**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_reconciliation_service.py \
  backend/tests/test_knowledge_router.py -q
```

Expected: FAIL because the registry metadata and reconciliation flow do not exist.

- [ ] **Step 4: Implement the candidate registry and reconciliation**

Replace `KnowledgeSourceCandidate` in `backend/packages/harness/nion/knowledge/models.py` with:

```python
class KnowledgeSourceCandidate(BaseModel):
    source_id: str
    source_kind: Literal["notebook_note", "notebook_asset"]
    notebook_ref: dict[str, str] = Field(default_factory=dict)
    title: str
    summary: str
    content_hash: str
    status: Literal["queued", "running", "compiled", "failed", "stale", "ignored", "source_missing"]
    enqueued_at: str | None = None
    last_job_id: str | None = None
    last_compiled_at: str | None = None
    missing_detected_at: str | None = None
    compile_error: str | None = None
    created_at: str
    updated_at: str
```

Create `backend/packages/harness/nion/knowledge/reconciliation_service.py`:

```python
class ReconciliationService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._store = KnowledgeSourceCandidateStore(base_dir=base_dir)
        self._activity = KnowledgeActivityStore(base_dir=base_dir)

    def run(self, notebook: NotebookService) -> KnowledgeSourceReconciliationResult:
        return self._store.reconcile_with_notebook(notebook, activity_store=self._activity)
```

Add to `backend/app/gateway/routers/knowledge.py`:

```python
@router.post("/reconcile", response_model=KnowledgeSourceReconciliationResult)
async def reconcile_knowledge_sources() -> KnowledgeSourceReconciliationResult:
    notebook = NotebookService()
    return ReconciliationService().run(notebook)
```

- [ ] **Step 5: Re-run the subset**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_reconciliation_service.py \
  backend/tests/test_knowledge_router.py -q
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/knowledge/models.py \
  backend/packages/harness/nion/knowledge/source_candidates.py \
  backend/packages/harness/nion/knowledge/reconciliation_service.py \
  backend/packages/harness/nion/knowledge/activity_store.py \
  backend/app/gateway/routers/knowledge.py \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_reconciliation_service.py \
  backend/tests/test_knowledge_activity_store.py \
  backend/tests/test_knowledge_router.py
git commit -m "Add knowledge source reconciliation and registry state"
```

---

### Task 3: Replace the compile job and activity contracts with visible staged progress

**Files:**
- Modify: `backend/packages/harness/nion/knowledge/compile_jobs.py`
- Modify: `backend/packages/harness/nion/knowledge/ingest_service.py`
- Modify: `backend/app/gateway/routers/knowledge.py`
- Modify: `backend/tests/test_knowledge_router.py`
- Modify: `frontend/src/core/knowledge/types.ts`
- Modify: `frontend/src/core/knowledge/api.ts`
- Modify: `frontend/src/core/knowledge/hooks.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts`

- [ ] **Step 1: Add failing tests for staged job progress and activity feed**

Append to `backend/tests/test_knowledge_router.py`:

```python
def test_knowledge_jobs_expose_stage_and_page_deltas(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    note = NotebookService(base_dir=tmp_path).create_note(directory="", title="Roadmap", body="body")

    with TestClient(create_app()) as client:
        client.post("/api/knowledge/sources/enqueue", json={"source_id": f"source:notebook_note:{note.note_id}"})
        client.post("/api/knowledge/queue/approve", json={"source_ids": [f"source:notebook_note:{note.note_id}"]})
        jobs = client.get("/api/knowledge/jobs")

    assert jobs.status_code == 200
    assert jobs.json()["jobs"][0]["stage"] == "finalizing"
    assert "created_page_ids" in jobs.json()["jobs"][0]
```

Append to `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`:

```ts
assert.match(source, /activity/i);
assert.match(source, /job_started|page_created|source_missing_detected|activity feed/i);
assert.match(source, /compile_state|stage|running|failed/);
```

- [ ] **Step 2: Run the failing subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
node --test \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts
```

Expected: FAIL because jobs do not have `stage` and the UI does not render activity feed.

- [ ] **Step 3: Implement staged jobs and activity surface**

Update `backend/packages/harness/nion/knowledge/compile_jobs.py` outputs to:

```python
outputs = {
    "created_pages": [],
    "created_page_ids": [],
    "updated_pages": [],
    "stale_pages": [],
    "archived_pages": [],
}
```

Add `stage` to `KnowledgeCompileJob` and persist it in SQLite:

```python
stage: Literal["queued", "snapshotting", "extracting", "writing_pages", "rebuilding_graph", "finalizing"]
```

Update `backend/app/gateway/routers/knowledge.py` approval path so it sets:

```python
job_store.update_job(job.job_id, status="running", stage="snapshotting", outputs=job.outputs, started_at=started_at)
```

then advances through:

```python
stage="extracting"
stage="writing_pages"
stage="rebuilding_graph"
stage="finalizing"
```

before returning `status="succeeded"`.

- [ ] **Step 4: Re-run the subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
node --test \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/knowledge/compile_jobs.py \
  backend/packages/harness/nion/knowledge/ingest_service.py \
  backend/app/gateway/routers/knowledge.py \
  backend/tests/test_knowledge_router.py \
  frontend/src/core/knowledge/types.ts \
  frontend/src/core/knowledge/api.ts \
  frontend/src/core/knowledge/hooks.ts \
  frontend/src/components/workspace/knowledge/knowledge-home-page.tsx \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts
git commit -m "Make knowledge compile progress and activity visible"
```

---

### Task 4: Enforce `active / stale / archived` retrieval policy in query and tool contracts

**Files:**
- Modify: `backend/packages/harness/nion/knowledge/page_store.py`
- Modify: `backend/packages/harness/nion/knowledge/query_service.py`
- Modify: `backend/packages/harness/nion/tools/builtins/knowledge_tools.py`
- Modify: `backend/tests/test_knowledge_query_service.py`
- Modify: `backend/tests/test_knowledge_query_tool_contract.py`
- Modify: `backend/tests/test_knowledge_router.py`
- Modify: `frontend/src/core/knowledge/types.ts`
- Modify: `frontend/src/core/knowledge/api.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-query-page.tsx`

- [ ] **Step 1: Add failing retrieval policy tests**

Replace `backend/tests/test_knowledge_query_service.py` with:

```python
def test_query_prefers_active_pages_and_downgrades_stale(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap-active",
        page_type="concept",
        title="Roadmap Active",
        body="current roadmap",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-15T10:00:00Z",
        page_state="active",
    )
    store.write_page(
        page_id="concept:roadmap-stale",
        page_type="concept",
        title="Roadmap Stale",
        body="old roadmap",
        sources=["source:notebook_note:note_2"],
        compiled_from=[{"source_id": "source:notebook_note:note_2", "content_hash": "def456"}],
        last_compiled_at="2026-04-15T09:00:00Z",
        page_state="stale",
    )

    result = KnowledgeQueryService(base_dir=tmp_path).answer("roadmap")

    assert result.retrieval_policy == "active_only"
    assert result.citations[0]["page_state"] == "active"
    assert "old roadmap" not in result.answer_markdown
```

Append to `backend/tests/test_knowledge_query_tool_contract.py`:

```python
def test_query_knowledge_tool_returns_citations_and_policy(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    KnowledgePageStore(base_dir=tmp_path).write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="Roadmap summary",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-15T10:00:00Z",
        page_state="active",
    )

    payload = json.loads(query_knowledge_base_tool.invoke({"question": "roadmap"}))

    assert payload["citations"][0]["page_state"] == "active"
    assert payload["retrieval_policy"] == "active_only"
```

- [ ] **Step 2: Run the failing subset**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_query_tool_contract.py \
  backend/tests/test_knowledge_router.py -q
```

Expected: FAIL because page state and query policy are not implemented.

- [ ] **Step 3: Implement page-state-aware query**

Update `KnowledgePage` in `backend/packages/harness/nion/knowledge/models.py`:

```python
page_state: Literal["active", "stale", "archived"] = "active"
```

Update `backend/packages/harness/nion/knowledge/page_store.py`:

```python
frontmatter = {
    ...
    "page_state": page_state,
}
```

Update `backend/packages/harness/nion/knowledge/query_service.py` to return:

```python
@dataclass
class KnowledgeQueryResult:
    answer_markdown: str
    citations: list[dict[str, object]]
    matched_page_ids: list[str]
    retrieval_policy: str
    warnings: list[str]
```

Implement this policy:

```python
if page.page_state == "archived" and not include_archived:
    continue
if page.page_state == "stale":
    score -= 10
```

and set:

```python
warnings.append("Knowledge includes stale pages.") if any_stale else None
```

- [ ] **Step 4: Re-run the subset**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_query_tool_contract.py \
  backend/tests/test_knowledge_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/knowledge/page_store.py \
  backend/packages/harness/nion/knowledge/query_service.py \
  backend/packages/harness/nion/tools/builtins/knowledge_tools.py \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_query_tool_contract.py \
  backend/tests/test_knowledge_router.py \
  frontend/src/core/knowledge/types.ts \
  frontend/src/core/knowledge/api.ts \
  frontend/src/components/workspace/knowledge/knowledge-query-page.tsx
git commit -m "Make knowledge query honor page state and citations"
```

---

### Task 5: Move citations from tool-message parsing to final assistant metadata

**Files:**
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/packages/harness/nion/tools/builtins/knowledge_tools.py`
- Modify: `backend/tests/test_client.py`
- Modify: `frontend/src/core/messages/utils.ts`
- Modify: `frontend/src/components/workspace/messages/message-list-item.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list-item.contract.test.ts`

- [ ] **Step 1: Add failing tests for final assistant metadata**

Replace the knowledge assertion in `backend/tests/test_client.py` with:

```python
assert final_events[-1].data["additional_kwargs"]["knowledge"]["matched_page_ids"] == [
    "concept:roadmap"
]
assert final_events[-1].data["additional_kwargs"]["knowledge"]["citations"][0]["page_id"] == "concept:roadmap"
```

Append to `frontend/src/components/workspace/messages/message-list-item.contract.test.ts`:

```ts
assert.match(source, /additional_kwargs\\?\\.knowledge/);
assert.doesNotMatch(source, /JSON\\.parse\\(content\\).*page_ids/);
```

- [ ] **Step 2: Run the failing subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_client.py -q
node --test frontend/src/components/workspace/messages/message-list-item.contract.test.ts
```

Expected: FAIL because the client still writes `knowledge_sources` and the frontend still parses tool-message `page_ids`.

- [ ] **Step 3: Implement assistant-level metadata**

Update `backend/packages/harness/nion/client.py` so that when it sees `query_knowledge_base` results it stores:

```python
latest_knowledge_attachment = {
    "citations": tool_payload.get("citations", []),
    "matched_page_ids": tool_payload.get("matched_page_ids", []),
    "retrieval_policy": tool_payload.get("retrieval_policy"),
    "warnings": tool_payload.get("warnings", []),
    "rendered_from_final_answer": True,
}
```

and then emits:

```python
event_data["additional_kwargs"] = {
    **event_data.get("additional_kwargs", {}),
    "knowledge": latest_knowledge_attachment,
}
```

Update `frontend/src/core/messages/utils.ts` to replace `extractKnowledgePageIdsFromToolMessage` with:

```ts
export function extractKnowledgeAttachment(message: Message) {
  const attachment = message.additional_kwargs?.knowledge;
  return attachment && typeof attachment === "object" ? attachment : null;
}
```

Update `frontend/src/components/workspace/messages/message-list-item.tsx` to render badges from:

```ts
const knowledgeAttachment = extractKnowledgeAttachment(message);
```

- [ ] **Step 4: Re-run the subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_client.py -q
node --test frontend/src/components/workspace/messages/message-list-item.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/client.py \
  backend/packages/harness/nion/tools/builtins/knowledge_tools.py \
  backend/tests/test_client.py \
  frontend/src/core/messages/utils.ts \
  frontend/src/components/workspace/messages/message-list-item.tsx \
  frontend/src/components/workspace/messages/message-list-item.contract.test.ts
git commit -m "Attach knowledge citations to final assistant messages"
```

---

### Task 6: Repair Notebook inline progress and Knowledge home/queue UI around the new contracts

**Files:**
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts`

- [ ] **Step 1: Add failing contract tests for inline progress and Activity**

Append to `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`:

```ts
assert.match(pageSource, /enqueue_state|compile_state|last_job_id/);
assert.match(pageSource, /Queue|Activity|查看知识状态/);
assert.doesNotMatch(pageSource, /同步生成|瞬间完成/);
```

Append to `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`:

```ts
assert.match(source, /Activity|activity/i);
assert.match(source, /source_missing|stale|archived/);
assert.match(source, /reconcile|对账/);
```

- [ ] **Step 2: Run the failing subset**

Run:

```bash
node --test \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts
```

Expected: FAIL because the UI still centers old compile status fields.

- [ ] **Step 3: Update the UI to the new contract**

In `frontend/src/components/workspace/notebook/notebook-page.tsx`, replace the bridge state shape with:

```ts
const [knowledgeBridgeStatus, setKnowledgeBridgeStatus] = useState<NotebookKnowledgeStatus | null>(null);
```

and render:

```tsx
<div className="rounded-lg border bg-background/70 p-4">
  <div className="text-sm font-medium">知识库</div>
  <div className="mt-1 text-xs text-muted-foreground">
    enqueue={knowledgeBridgeStatus?.enqueue_state ?? "not_enqueued"} · compile={knowledgeBridgeStatus?.compile_state ?? "idle"}
  </div>
</div>
```

In `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`, add an Activity card and a Reconcile button:

```tsx
<button className="rounded-md border px-3 py-2 text-sm">reconcile now</button>
```

and render counts for:

```tsx
{queue.filter((item) => item.status === "source_missing").length} source missing
```

- [ ] **Step 4: Re-run the subset**

Run:

```bash
node --test \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/notebook/types.ts \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/knowledge/knowledge-home-page.tsx \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts
git commit -m "Show staged knowledge progress in notebook and knowledge home"
```

---

### Task 7: Persist Graph layout in Knowledge storage and upgrade the canvas without new dependencies

**Files:**
- Modify: `backend/packages/harness/nion/knowledge/graph_service.py`
- Modify: `backend/app/gateway/routers/knowledge.py`
- Modify: `frontend/src/core/knowledge/types.ts`
- Modify: `frontend/src/core/knowledge/api.ts`
- Modify: `frontend/src/core/knowledge/hooks.ts`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-graph-page.tsx`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts`

- [ ] **Step 1: Add failing contract tests for persisted graph layout**

Append to `frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts`:

```ts
assert.match(source, /@xyflow\\/react|ReactFlow/);
assert.match(source, /loadKnowledgeGraphLayout|saveKnowledgeGraphLayout|graph\\/layout/);
assert.doesNotMatch(source, /localStorage\\.getItem\\(\"knowledge-graph-layout\"\\)/);
```

Append to `backend/tests/test_knowledge_router.py`:

```python
def test_graph_layout_endpoint_persists_layout(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.put(
            "/api/knowledge/graph/layout",
            json={"version": 1, "node_positions": {"concept:roadmap": {"x": 10, "y": 20}}, "collapsed_clusters": [], "highlighted_node_ids": [], "updated_at": "2026-04-15T00:00:00Z"},
        )

    assert response.status_code == 200
    assert response.json()["node_positions"]["concept:roadmap"]["x"] == 10
```

- [ ] **Step 2: Run the failing subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
node --test frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts
```

Expected: FAIL because graph layout is only in `localStorage` and there is no API.

- [ ] **Step 3: Implement the persisted layout path using existing deps**

In `frontend/src/components/workspace/knowledge/knowledge-graph-page.tsx`, replace manual `<div draggable>` rendering with:

```tsx
import ReactFlow, { Background, Controls, MiniMap } from "@xyflow/react";
```

and map nodes/edges into:

```tsx
const flowNodes = nodes.map((node) => ({
  id: String(node.id),
  position: layout.node_positions[String(node.id)] ?? { x: 120, y: 80 },
  data: { label: String(node.label ?? node.id ?? "") },
}));
```

Persist changes through:

```ts
onNodesChange={(changes) => saveLayout(nextLayout)}
```

Add `GET /api/knowledge/graph` to return:

```python
{
    "nodes": nodes,
    "edges": edges,
    "layout": layout,
}
```

and `PUT /api/knowledge/graph/layout` to write `graph/layout.json`.

- [ ] **Step 4: Re-run the subset**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
node --test frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/knowledge/graph_service.py \
  backend/app/gateway/routers/knowledge.py \
  frontend/src/core/knowledge/types.ts \
  frontend/src/core/knowledge/api.ts \
  frontend/src/core/knowledge/hooks.ts \
  frontend/src/components/workspace/knowledge/knowledge-graph-page.tsx \
  frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts \
  backend/tests/test_knowledge_router.py
git commit -m "Persist knowledge graph layout with existing graph dependencies"
```

---

### Task 8: Run final regression checks and remove old contract assumptions

**Files:**
- Modify: `frontend/src/core/knowledge/api.test.ts`
- Modify: `backend/tests/test_knowledge_router.py`
- Modify: `backend/tests/test_knowledge_query_tool_contract.py`
- Modify: `backend/tests/test_client.py`
- Modify: `frontend/src/components/workspace/messages/message-list-item.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`

- [ ] **Step 1: Search for obsolete contract tokens**

Run:

```bash
rg -n "\"approved\"|queue_approval|knowledge_sources|page_ids|localStorage\\.getItem\\(\"knowledge-graph-layout\"\\)|/api/knowledge/queue/approve" \
  backend frontend/src -g '!**/node_modules/**'
```

Expected: matches only where the new implementation intentionally keeps compatibility comments/tests; no live Notebook bridge should call `queue/approve`, and no UI should still depend on `knowledge_sources` or tool-message `page_ids`.

- [ ] **Step 2: Update the remaining tests to the new contract**

In `frontend/src/core/knowledge/api.test.ts`, replace:

```ts
page_ids: ["concept:roadmap"]
```

with:

```ts
citations: [
  {
    page_id: "concept:roadmap",
    title: "Roadmap",
    page_type: "concept",
    page_state: "active",
    source_ids: ["source:notebook_note:note_1"],
    score: 1,
  },
],
matched_page_ids: ["concept:roadmap"],
retrieval_policy: "active_only",
warnings: [],
```

- [ ] **Step 3: Run the full targeted regression suite**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_router.py \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_reconciliation_service.py \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_query_tool_contract.py \
  backend/tests/test_client.py -q
pnpm --dir frontend check
node --test \
  frontend/src/core/knowledge/api.test.ts \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts \
  frontend/src/components/workspace/messages/message-list-item.contract.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit the regression cleanup**

```bash
git add backend/tests/test_knowledge_router.py \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_reconciliation_service.py \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_query_tool_contract.py \
  backend/tests/test_client.py \
  frontend/src/core/knowledge/api.test.ts \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts \
  frontend/src/components/workspace/messages/message-list-item.contract.test.ts
git commit -m "Remove obsolete knowledge contract assumptions"
```

---

## Self-Review

### Spec coverage

- `enqueue` vs `approve + compile`: Task 1, Task 3, Task 6
- `source reconciliation` / delete + restore lifecycle: Task 2
- staged `compile job` + `activity`: Task 3
- `active / stale / archived` retrieval policy: Task 4
- assistant final message citations: Task 5
- Notebook inline progress and Knowledge page visibility: Task 6
- persisted graph layout with no new dependency: Task 7
- regression sweep and old-contract removal: Task 8

### Placeholder scan

- No `TBD` / `TODO`
- Every task has exact files, commands, and concrete code snippets
- No “similar to Task N” shorthand

### Type consistency

- `NotebookKnowledgeStatus` is introduced in Task 1 and reused in Task 6
- `KnowledgeQueryResult` expands in Task 4 and is reused in Task 5 and Task 8
- `KnowledgeSourceReconciliationResult` is introduced in Task 2 and reused in Task 8
