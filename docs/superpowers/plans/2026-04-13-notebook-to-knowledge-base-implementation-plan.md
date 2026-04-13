# Notebook To Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Nion 内部新增一个正式的 Knowledge Base 模块，把 Notebook 维持为原料箱，并建立 candidate queue、wiki pages、query、graph、revision 和 capability contract 的完整闭环。

**Architecture:** 先冻结合同，明确 `Notebook != Knowledge != Memory`，再新增独立 `knowledge/` 后端模块与 `/api/knowledge/*` 路由，随后接上前端 `workspace/knowledge` 产品面和 Notebook 桥接，最后把 Knowledge 纳入 capability catalog 与 system object 路由。实现严格按 TDD 推进，先写失败测试，再写最小实现，再回归并提交。

**Tech Stack:** Python 3.12, FastAPI, Pydantic, SQLite, Markdown file storage, React 19, Next.js App Router, TanStack Query, node:test, pytest

---

## Scope Guard

这份计划只实现刚批准的产品内 Knowledge Base 模块，不执行外部 `/Users/zhangtiancheng/Documents/wiki` 方案。

必须满足：

- `Notebook` 继续作为原料箱
- `Knowledge Base` 是独立产品模块与独立存储根
- Phase 1 source 只支持 `notebook_note` 和 `notebook_asset`
- 用户不能直接编辑知识页正文
- Agent 通过正式能力接口执行 ingest/query/lint/graph/revision

本计划不覆盖：

- 全量聊天线程直连 Knowledge Base
- 全量 workspace artifact 直连 Knowledge Base
- 多人协作权限
- 实时自动编译
- 完整图数据库
- 把 Knowledge 直接注入 runtime memory 主链

## Pre-Execution Fix

Approved spec currently contained forbidden proposal-style status names (`accepted/rejected`) in the revision request model. Before implementing, normalize the spec wording to non-proposal states (`open/previewed/applied/closed`) and commit that doc-only correction.

## File Map

### Backend: pathing, models, storage, services

- Modify: `backend/packages/harness/nion/config/paths.py`
- Create: `backend/packages/harness/nion/knowledge/__init__.py`
- Create: `backend/packages/harness/nion/knowledge/models.py`
- Create: `backend/packages/harness/nion/knowledge/frontmatter.py`
- Create: `backend/packages/harness/nion/knowledge/paths.py`
- Create: `backend/packages/harness/nion/knowledge/source_candidates.py`
- Create: `backend/packages/harness/nion/knowledge/page_store.py`
- Create: `backend/packages/harness/nion/knowledge/compile_jobs.py`
- Create: `backend/packages/harness/nion/knowledge/ingest_service.py`
- Create: `backend/packages/harness/nion/knowledge/query_service.py`
- Create: `backend/packages/harness/nion/knowledge/lint_service.py`
- Create: `backend/packages/harness/nion/knowledge/graph_service.py`
- Create: `backend/packages/harness/nion/knowledge/revision_service.py`

### Backend: routers and capability surfaces

- Modify: `backend/app/runtime/app_factory.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Create: `backend/app/gateway/routers/knowledge.py`
- Modify: `backend/packages/harness/nion/capability_objects.py`
- Modify: `backend/packages/harness/nion/system_capability_catalog.py`
- Modify: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- Modify: `backend/packages/harness/nion/capability_backbone/intent_router.py`

### Frontend: route helpers, navigation, data clients

- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Create: `frontend/src/core/knowledge/types.ts`
- Create: `frontend/src/core/knowledge/api.ts`
- Create: `frontend/src/core/knowledge/hooks.ts`
- Create: `frontend/src/core/knowledge/index.ts`

### Frontend: knowledge surfaces

- Create: `frontend/src/app/workspace/knowledge/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/queue/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/query/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/graph/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/pages/[pageId]/page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-query-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-graph-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-page-reader.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-revision-dialog.tsx`
- Create: `frontend/src/components/workspace/knowledge/index.ts`

### Frontend: notebook bridge

- Modify: `frontend/src/core/notebook/api.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-inbox-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`

### Frontend: copy / i18n

- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

### Tests

- Modify: `backend/tests/test_capability_objects.py`
- Modify: `backend/tests/test_capability_intent_router.py`
- Modify: `backend/tests/test_notebook_api.py`
- Create: `backend/tests/test_knowledge_source_candidates.py`
- Create: `backend/tests/test_knowledge_page_store.py`
- Create: `backend/tests/test_knowledge_compile_jobs.py`
- Create: `backend/tests/test_knowledge_ingest_service.py`
- Create: `backend/tests/test_knowledge_query_service.py`
- Create: `backend/tests/test_knowledge_lint_service.py`
- Create: `backend/tests/test_knowledge_graph_service.py`
- Create: `backend/tests/test_knowledge_revision_service.py`
- Create: `backend/tests/test_knowledge_router.py`
- Modify: `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook-routes.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-routes.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-page-reader.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-query-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-revision-dialog.contract.test.ts`
- Create: `frontend/src/core/knowledge/api.test.ts`

## Task 0: Correct The Approved Spec Wording Before Implementing

**Files:**
- Modify: `docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md`

- [ ] **Step 1: Rewrite the forbidden revision status names in the spec**

Replace the revision request model block so it reads:

```md
```ts
type KnowledgeRevisionRequest = {
  request_id: string;
  page_id: string;
  request_type: "fix_fact" | "add_context" | "merge_pages" | "split_page" | "rename_page";
  instruction: string;
  optional_source_refs: string[];
  status: "open" | "previewed" | "applied" | "closed";
  created_by: "user";
  created_at: string;
  resolved_at?: string;
};
```
```

- [ ] **Step 2: Rewrite the explanatory paragraph to remove accept/reject language**

Set the paragraph below the code block to:

```md
人通过 revision request 影响知识页，Agent 读取 page、sources 和 instruction 后生成 diff preview。用户确认后由 Agent 落盘；用户放弃或 Agent 判定无法安全执行时将请求关闭，不引入 accept/reject 产品语义。
```

- [ ] **Step 3: Verify the spec no longer contains forbidden proposal semantics**

Run:

```bash
rg -n "accept|reject|proposal" docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md
```

Expected: no matches.

- [ ] **Step 4: Commit the spec correction**

```bash
git add docs/superpowers/specs/2026-04-13-notebook-to-knowledge-base-design.md
git commit -m "Clarify Knowledge revision states without proposal semantics"
```

## Task 1: Freeze Knowledge Route And Navigation Contracts

**Files:**
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook-routes.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-routes.contract.test.ts`

- [ ] **Step 1: Write the failing route helper contract**

Create `frontend/src/components/workspace/knowledge/knowledge-routes.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  pathOfKnowledge,
  pathOfKnowledgeQueue,
  pathOfKnowledgeGraph,
  pathOfKnowledgeQuery,
} from "../../core/navigation/desktop-routes.ts";

void test("workspace route helpers expose dedicated knowledge routes", () => {
  assert.equal(pathOfKnowledge(), "/workspace/knowledge");
  assert.equal(pathOfKnowledgeQueue(), "/workspace/knowledge/queue");
  assert.equal(pathOfKnowledgeGraph(), "/workspace/knowledge/graph");
  assert.equal(pathOfKnowledgeQuery(), "/workspace/knowledge/query");
});

void test("workspace navigation exposes notebook knowledge and memory as separate surfaces", async () => {
  const navMenuSource = await readFile(new URL("../workspace-nav-menu.tsx", import.meta.url), "utf8");
  const commandPaletteSource = await readFile(new URL("../command-palette.tsx", import.meta.url), "utf8");

  for (const source of [navMenuSource, commandPaletteSource]) {
    assert.match(source, /t\.sidebar\.notebook/);
    assert.match(source, /t\.sidebar\.knowledge/);
    assert.match(source, /t\.sidebar\.memory/);
    assert.match(source, /pathOfNotebook/);
    assert.match(source, /pathOfKnowledge/);
    assert.match(source, /pathOfMemory/);
  }
});

void test("desktop renderer registers all knowledge routes", async () => {
  const source = await readFile(new URL("../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url), "utf8");

  assert.match(source, /"\/workspace\/knowledge"/);
  assert.match(source, /"\/workspace\/knowledge\/queue"/);
  assert.match(source, /"\/workspace\/knowledge\/graph"/);
  assert.match(source, /"\/workspace\/knowledge\/query"/);
  assert.match(source, /"\/workspace\/knowledge\/pages\/:pageId"/);
});
```

- [ ] **Step 2: Tighten the existing workspace nav contract around role separation**

Append this test to `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`:

```ts
void test("workspace product copy keeps notebook knowledge and memory roles distinct", () => {
  assert.match(enUS.workspaceSurfaces.knowledge.description, /knowledge/i);
  assert.doesNotMatch(enUS.workspaceSurfaces.knowledge.description, /notebook/i);
  assert.doesNotMatch(enUS.workspaceSurfaces.knowledge.description, /memory/i);
  assert.match(zhCN.workspaceSurfaces.knowledge.description, /知识/);
  assert.doesNotMatch(zhCN.workspaceSurfaces.knowledge.description, /笔记/);
  assert.doesNotMatch(zhCN.workspaceSurfaces.knowledge.description, /记忆/);
});
```

- [ ] **Step 3: Run the failing contract subset**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  src/components/workspace/notebook-routes.test.ts \
  src/components/workspace/knowledge/knowledge-routes.contract.test.ts
```

Expected: FAIL because knowledge routes and labels do not exist yet.

- [ ] **Step 4: Implement the route helpers and navigation entries**

Update `frontend/src/core/navigation/desktop-routes.ts` to add:

```ts
export function pathOfKnowledge(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/knowledge", extra);
}

export function pathOfKnowledgeQueue(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/knowledge/queue", extra);
}

export function pathOfKnowledgeGraph(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/knowledge/graph", extra);
}

export function pathOfKnowledgeQuery(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/knowledge/query", extra);
}

export function pathOfKnowledgePage(
  pageId: string,
  extra: Record<string, string | undefined> = {},
) {
  return withQuery(`/workspace/knowledge/pages/${pageId}`, extra);
}
```

Update `workspace-nav-menu.tsx` and `command-palette.tsx` so they import `pathOfKnowledge()` and render a `t.sidebar.knowledge` entry beside notebook and memory.

Update `desktop/src/renderer/renderer-app.tsx` so it includes the five new `/workspace/knowledge*` routes.

- [ ] **Step 5: Run the contract subset to green**

Run the same command from Step 3.
Expected: PASS.

- [ ] **Step 6: Commit the route and navigation baseline**

```bash
git add \
  frontend/src/core/navigation/desktop-routes.ts \
  frontend/src/components/workspace/workspace-nav-menu.tsx \
  frontend/src/components/workspace/command-palette.tsx \
  desktop/src/renderer/renderer-app.tsx \
  frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  frontend/src/components/workspace/notebook-routes.test.ts \
  frontend/src/components/workspace/knowledge/knowledge-routes.contract.test.ts
git commit -m "feat: add first-class knowledge workspace routes"
```

## Task 2: Freeze Backend Knowledge Contracts And Storage Root

**Files:**
- Modify: `backend/packages/harness/nion/config/paths.py`
- Create: `backend/packages/harness/nion/knowledge/models.py`
- Create: `backend/packages/harness/nion/knowledge/frontmatter.py`
- Create: `backend/packages/harness/nion/knowledge/paths.py`
- Create: `backend/tests/test_knowledge_source_candidates.py`
- Create: `backend/tests/test_knowledge_page_store.py`
- Create: `backend/tests/test_knowledge_compile_jobs.py`

- [ ] **Step 1: Write the failing path and candidate tests**

Create `backend/tests/test_knowledge_source_candidates.py`:

```python
from nion.config.paths import Paths
from nion.knowledge.models import KnowledgeSourceCandidate


def test_paths_expose_dedicated_knowledge_root(tmp_path):
    paths = Paths(base_dir=tmp_path)

    assert paths.knowledge_root_dir == tmp_path / "knowledge"
    assert paths.knowledge_raw_dir == tmp_path / "knowledge" / "raw"
    assert paths.knowledge_wiki_dir == tmp_path / "knowledge" / "wiki"
    assert paths.knowledge_graph_dir == tmp_path / "knowledge" / "graph"
    assert paths.knowledge_meta_dir == tmp_path / "knowledge" / ".nion"


def test_source_candidate_allows_only_phase_one_notebook_inputs():
    candidate = KnowledgeSourceCandidate(
        source_id="source:notebook_note:note_1",
        source_kind="notebook_note",
        notebook_ref={"note_id": "note_1", "relative_path": "收件箱/roadmap.md"},
        title="Roadmap",
        summary="First draft",
        content_hash="abc123",
        status="queued",
        created_at="2026-04-13T00:00:00Z",
        updated_at="2026-04-13T00:00:00Z",
    )

    assert candidate.source_kind == "notebook_note"
```

Create `backend/tests/test_knowledge_page_store.py`:

```python
from pathlib import Path

from nion.knowledge.frontmatter import split_knowledge_frontmatter
from nion.knowledge.page_store import KnowledgePageStore


def test_page_store_writes_required_frontmatter(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    page = store.write_page(
        page_id="concept:memory-runtime-bundle",
        page_type="concept",
        title="Memory Runtime Bundle",
        body="## Summary\ncompiled body\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    text = Path(page.absolute_path).read_text(encoding="utf-8")
    frontmatter, body = split_knowledge_frontmatter(text)

    assert frontmatter["sources"] == ["source:notebook_note:note_1"]
    assert frontmatter["compiled_from"][0]["content_hash"] == "abc123"
    assert frontmatter["agent_owned"] is True
    assert frontmatter["human_editable"] is False
    assert body.strip().startswith("## Summary")
```

Create `backend/tests/test_knowledge_compile_jobs.py`:

```python
from nion.knowledge.compile_jobs import KnowledgeCompileJobStore


def test_compile_job_round_trips_outputs(tmp_path):
    store = KnowledgeCompileJobStore(base_dir=tmp_path)
    job = store.create_job(
        source_ids=["source:notebook_note:note_1"],
        trigger_mode="queue_approval",
    )
    updated = store.update_job(
        job.job_id,
        status="succeeded",
        outputs={
            "created_pages": ["sources/roadmap.md"],
            "updated_pages": ["overview.md"],
            "contradiction_pages": [],
            "graph_rebuilt": True,
        },
    )

    assert updated.status == "succeeded"
    assert updated.outputs["graph_rebuilt"] is True
```

- [ ] **Step 2: Run the failing backend tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_page_store.py \
  backend/tests/test_knowledge_compile_jobs.py -q
```

Expected: FAIL because the knowledge module does not exist yet.

- [ ] **Step 3: Implement the dedicated paths and models**

Extend `backend/packages/harness/nion/config/paths.py` with:

```python
    @property
    def knowledge_root_dir(self) -> Path:
        return self.base_dir / "knowledge"

    @property
    def knowledge_raw_dir(self) -> Path:
        return self.knowledge_root_dir / "raw"

    @property
    def knowledge_wiki_dir(self) -> Path:
        return self.knowledge_root_dir / "wiki"

    @property
    def knowledge_graph_dir(self) -> Path:
        return self.knowledge_root_dir / "graph"

    @property
    def knowledge_meta_dir(self) -> Path:
        return self.knowledge_root_dir / ".nion"
```

Add `KnowledgeSourceCandidate`, `KnowledgeCompileJob`, and `KnowledgePage` pydantic models in `backend/packages/harness/nion/knowledge/models.py`. Restrict `source_kind` to `Literal["notebook_note", "notebook_asset"]`.

- [ ] **Step 4: Implement frontmatter and minimal page/job stores**

Create `knowledge/frontmatter.py` with `split_knowledge_frontmatter()` and `render_knowledge_frontmatter()` mirroring notebook frontmatter helpers.

Create `knowledge/page_store.py` with a `KnowledgePageStore.write_page()` that writes:

```python
frontmatter = {
    "title": title,
    "page_type": page_type,
    "page_id": page_id,
    "sources": sources,
    "compiled_from": compiled_from,
    "last_compiled_at": last_compiled_at,
    "agent_owned": True,
    "human_editable": False,
}
```

Create `knowledge/compile_jobs.py` with a SQLite-backed `KnowledgeCompileJobStore` stored under `knowledge/.nion/compile_jobs.sqlite3`.

- [ ] **Step 5: Run the backend subset to green**

Run the command from Step 2.
Expected: PASS.

- [ ] **Step 6: Commit the storage contract layer**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/knowledge/models.py \
  backend/packages/harness/nion/knowledge/frontmatter.py \
  backend/packages/harness/nion/knowledge/paths.py \
  backend/packages/harness/nion/knowledge/page_store.py \
  backend/packages/harness/nion/knowledge/compile_jobs.py \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_page_store.py \
  backend/tests/test_knowledge_compile_jobs.py
git commit -m "feat: add knowledge storage contracts and job store"
```

## Task 3: Build Source Candidate Scanning From Notebook Notes And Assets

**Files:**
- Create: `backend/packages/harness/nion/knowledge/source_candidates.py`
- Modify: `backend/packages/harness/nion/notebook/service.py`
- Modify: `backend/tests/test_notebook_api.py`
- Modify: `backend/tests/test_knowledge_source_candidates.py`

- [ ] **Step 1: Add failing tests for notebook note and asset scanning**

Append to `backend/tests/test_knowledge_source_candidates.py`:

```python
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.service import NotebookService


def test_candidate_store_scans_notebook_note_and_asset(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Inbox Note", body="body")
    asset_source = tmp_path / "threads" / "thread-1" / "user-data" / "outputs" / "report.html"
    asset_source.parent.mkdir(parents=True, exist_ok=True)
    asset_source.write_text("<h1>Report</h1>", encoding="utf-8")
    asset = notebook.archive_asset(source_path=str(asset_source), directory="")

    store = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    candidates = store.refresh_from_notebook(notebook)

    assert {item.source_kind for item in candidates} == {"notebook_note", "notebook_asset"}
    assert any(item.notebook_ref.get("note_id") == note.note_id for item in candidates)
    assert any(item.notebook_ref.get("asset_id") == asset.asset_id for item in candidates)
```

```python
def test_candidate_refresh_marks_existing_compiled_entry_stale_when_hash_changes(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Inbox Note", body="v1")
    store = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    first = store.refresh_from_notebook(notebook)
    candidate = next(item for item in first if item.notebook_ref.get("note_id") == note.note_id)
    store.mark_compiled(candidate.source_id, compiled_at="2026-04-13T09:00:00Z")

    notebook.update_note(note_id=note.note_id, body="v2", expected_content_hash=note.content_hash)
    second = store.refresh_from_notebook(notebook)
    updated = next(item for item in second if item.source_id == candidate.source_id)

    assert updated.status == "stale"
```

- [ ] **Step 2: Run the failing source candidate tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_source_candidates.py -q
```

Expected: FAIL because scanner and state transitions are missing.

- [ ] **Step 3: Implement `KnowledgeSourceCandidateStore`**

Create a SQLite-backed store with methods:

```python
class KnowledgeSourceCandidateStore:
    def refresh_from_notebook(self, notebook: NotebookService) -> list[KnowledgeSourceCandidate]: ...
    def list_candidates(self) -> list[KnowledgeSourceCandidate]: ...
    def mark_compiled(self, source_id: str, *, compiled_at: str) -> KnowledgeSourceCandidate: ...
    def set_status(self, source_id: str, *, status: str, compile_error: str | None = None) -> KnowledgeSourceCandidate: ...
```

`refresh_from_notebook()` should upsert candidates from `notebook.list_note_summaries()` and `notebook.list_assets()`, using the current note/asset content hash or file metadata hash. If an already compiled candidate changes hash, set it to `stale`.

- [ ] **Step 4: Add one notebook API regression around source eligibility**

Append to `backend/tests/test_notebook_api.py`:

```python
def test_notebook_routes_do_not_expose_direct_knowledge_page_mutation(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        routes = {route.path for route in client.app.routes}

    assert "/api/notebook/knowledge-pages" not in routes
```

- [ ] **Step 5: Run the targeted backend subset to green**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_notebook_api.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit the candidate scanning layer**

```bash
git add \
  backend/packages/harness/nion/knowledge/source_candidates.py \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_notebook_api.py
git commit -m "feat: derive knowledge candidates from notebook sources"
```

## Task 4: Add Knowledge Router And Minimal Queue/Page APIs

**Files:**
- Create: `backend/app/gateway/routers/knowledge.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/runtime/app_factory.py`
- Create: `backend/tests/test_knowledge_router.py`

- [ ] **Step 1: Write the failing router contract tests**

Create `backend/tests/test_knowledge_router.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths
from nion.notebook.service import NotebookService


def test_knowledge_queue_endpoint_returns_notebook_candidates(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    NotebookService(base_dir=tmp_path).create_note(directory="", title="Inbox Note", body="body")

    with TestClient(create_app()) as client:
        response = client.get("/api/knowledge/queue")

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["source_kind"] == "notebook_note"


def test_knowledge_page_endpoint_returns_agent_owned_frontmatter_page(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/knowledge/pages/concept:missing")

    assert response.status_code == 404
```

- [ ] **Step 2: Run the router tests to see them fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
```

Expected: FAIL because router is unregistered.

- [ ] **Step 3: Implement the minimal router**

Create `backend/app/gateway/routers/knowledge.py` with:

```python
router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

@router.get("/queue", response_model=list[KnowledgeSourceCandidate])
async def get_knowledge_queue() -> list[KnowledgeSourceCandidate]:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    return store.refresh_from_notebook(notebook)

@router.get("/pages/{page_id}", response_model=KnowledgePage)
async def get_knowledge_page(page_id: str) -> KnowledgePage:
    store = KnowledgePageStore()
    try:
        return store.read_page(page_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
```

Register the router in `backend/app/gateway/routers/__init__.py` and `backend/app/runtime/app_factory.py`.

- [ ] **Step 4: Run the router tests to green**

Run the command from Step 2.
Expected: PASS.

- [ ] **Step 5: Commit the minimal backend route surface**

```bash
git add \
  backend/app/gateway/routers/knowledge.py \
  backend/app/gateway/routers/__init__.py \
  backend/app/runtime/app_factory.py \
  backend/tests/test_knowledge_router.py
git commit -m "feat: expose minimal knowledge queue and page routes"
```

## Task 5: Add Frontend Knowledge Client And Skeleton Pages

**Files:**
- Create: `frontend/src/core/knowledge/types.ts`
- Create: `frontend/src/core/knowledge/api.ts`
- Create: `frontend/src/core/knowledge/hooks.ts`
- Create: `frontend/src/core/knowledge/index.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-queue-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-page-reader.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-query-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-graph-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-revision-dialog.tsx`
- Create: `frontend/src/components/workspace/knowledge/index.ts`
- Create: `frontend/src/app/workspace/knowledge/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/queue/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/query/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/graph/page.tsx`
- Create: `frontend/src/app/workspace/knowledge/pages/[pageId]/page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-page-reader.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-query-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts`
- Create: `frontend/src/components/workspace/knowledge/knowledge-revision-dialog.contract.test.ts`
- Create: `frontend/src/core/knowledge/api.test.ts`

- [ ] **Step 1: Write the failing frontend contracts for the new surfaces**

Create `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge home page centers overview queue and graph status instead of notebook editing", async () => {
  const source = await readFile(new URL("./knowledge-home-page.tsx", import.meta.url), "utf8");

  assert.match(source, /overview/i);
  assert.match(source, /queue/i);
  assert.match(source, /graph/i);
  assert.doesNotMatch(source, /Textarea|draftBody|onDraftBodyChange/);
});
```

Create `frontend/src/components/workspace/knowledge/knowledge-page-reader.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge page reader is read-only and source-traceable", async () => {
  const source = await readFile(new URL("./knowledge-page-reader.tsx", import.meta.url), "utf8");

  assert.match(source, /sources/i);
  assert.match(source, /compiled/i);
  assert.match(source, /revision/i);
  assert.doesNotMatch(source, /Textarea|contentEditable|onChange=\{/);
});
```

Create `frontend/src/core/knowledge/api.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { loadKnowledgeQueue } from "./api.ts";

void test("loadKnowledgeQueue calls the knowledge queue endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(JSON.stringify([{ source_id: "source:notebook_note:note_1", source_kind: "notebook_note", notebook_ref: { note_id: "note_1", relative_path: "收件箱/roadmap.md" }, title: "Roadmap", summary: "body", content_hash: "abc123", status: "queued", created_at: "2026-04-13T00:00:00Z", updated_at: "2026-04-13T00:00:00Z" }]), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  const payload = await loadKnowledgeQueue();

  assert.match(seenUrl, /\/api\/knowledge\/queue$/);
  assert.equal(payload[0]?.source_kind, "notebook_note");
});
```

- [ ] **Step 2: Run the failing frontend subset**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-page-reader.contract.test.ts && \
pnpm --dir frontend test -- src/core/knowledge/api.test.ts
```

Expected: FAIL because the files do not exist.

- [ ] **Step 3: Implement minimal types, API and page skeletons**

Define `KnowledgeSourceCandidate`, `KnowledgePage`, and `KnowledgeCompileJob` in `frontend/src/core/knowledge/types.ts` matching backend names exactly.

Implement `loadKnowledgeQueue()` and `loadKnowledgePage(pageId)` in `frontend/src/core/knowledge/api.ts`, mirroring the error handling style already used in `frontend/src/core/notebook/api.ts`.

Create page skeleton components with clear read-only placeholders:

```tsx
export function KnowledgeHomePage() {
  return (
    <div>
      <section>Overview</section>
      <section>Queue</section>
      <section>Graph</section>
    </div>
  );
}
```

`KnowledgePageReader` must render metadata, markdown content, sources, and a revision trigger without exposing direct editing controls.

- [ ] **Step 4: Wire App Router page files to the new components**

Each `frontend/src/app/workspace/knowledge/*.tsx` file should simply export the matching workspace component.

- [ ] **Step 5: Run the frontend subset to green**

Run the command from Step 2.
Expected: PASS.

- [ ] **Step 6: Commit the frontend knowledge skeleton**

```bash
git add \
  frontend/src/core/knowledge/types.ts \
  frontend/src/core/knowledge/api.ts \
  frontend/src/core/knowledge/hooks.ts \
  frontend/src/core/knowledge/index.ts \
  frontend/src/components/workspace/knowledge \
  frontend/src/app/workspace/knowledge \
  frontend/src/core/knowledge/api.test.ts
git commit -m "feat: add knowledge workspace skeleton"
```

## Task 6: Add Notebook Bridge Actions And Queue Status Surfacing

**Files:**
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/core/notebook/api.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-inbox-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`
- Modify: `backend/tests/test_knowledge_router.py`
- Modify: `backend/app/gateway/routers/knowledge.py`

- [ ] **Step 1: Freeze the notebook bridge contract in tests**

Create `frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("notebook surfaces expose send-to-knowledge and knowledge-status actions without embedding a knowledge editor", async () => {
  const inboxSource = await readFile(new URL("./notebook-inbox-panel.tsx", import.meta.url), "utf8");
  const editorSource = await readFile(new URL("./notebook-editor-pane.tsx", import.meta.url), "utf8");

  for (const source of [inboxSource, editorSource]) {
    assert.match(source, /知识队列|Knowledge/);
    assert.doesNotMatch(source, /overview\.md|graph\.json|sources\//);
  }
});
```

Append to `backend/tests/test_knowledge_router.py`:

```python
def test_knowledge_queue_approval_creates_compile_job(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    NotebookService(base_dir=tmp_path).create_note(directory="", title="Inbox Note", body="body")

    with TestClient(create_app()) as client:
        queue = client.get("/api/knowledge/queue").json()
        response = client.post("/api/knowledge/queue/approve", json={"source_ids": [queue[0]["source_id"]]})

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
```

- [ ] **Step 2: Run the failing notebook bridge subset**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts && \
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
```

Expected: FAIL because bridge UI and approval API are missing.

- [ ] **Step 3: Extend the backend knowledge router for approval**

Add request model and route:

```python
class KnowledgeQueueApprovalRequest(BaseModel):
    source_ids: list[str]

@router.post("/queue/approve", response_model=KnowledgeCompileJob)
async def approve_knowledge_queue(payload: KnowledgeQueueApprovalRequest) -> KnowledgeCompileJob:
    store = KnowledgeSourceCandidateStore()
    for source_id in payload.source_ids:
        store.set_status(source_id, status="approved")
    job_store = KnowledgeCompileJobStore()
    return job_store.create_job(source_ids=payload.source_ids, trigger_mode="queue_approval")
```

- [ ] **Step 4: Add notebook API helpers for knowledge queue actions**

Add to `frontend/src/core/notebook/api.ts`:

```ts
export async function enqueueNotebookSourceToKnowledge(sourceId: string) {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/queue/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_ids: [sourceId] }),
  });
  return readJson(response);
}
```

Extend notebook types with optional `knowledge_source_id` and `knowledge_status` fields for note summaries / inbox items once candidates exist.

- [ ] **Step 5: Render send-to-knowledge actions in notebook surfaces**

Add a secondary button in inbox rows and note action menus labeled from i18n copy:

- `送入知识队列` / `Send to Knowledge Queue`
- `查看知识状态` / `View Knowledge Status`

These actions must call the queue approval helper or navigate to `pathOfKnowledgeQueue()` with the relevant source selected.

- [ ] **Step 6: Run the subset to green**

Run the command from Step 2.
Expected: PASS.

- [ ] **Step 7: Commit the notebook bridge**

```bash
git add \
  frontend/src/core/notebook/types.ts \
  frontend/src/core/notebook/api.ts \
  frontend/src/core/notebook/hooks.ts \
  frontend/src/components/workspace/notebook/notebook-inbox-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-editor-pane.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  backend/app/gateway/routers/knowledge.py \
  backend/tests/test_knowledge_router.py
git commit -m "feat: bridge notebook sources into knowledge queue"
```

## Task 7: Implement Query, Lint, Graph, And Revision Service Contracts

**Files:**
- Create: `backend/packages/harness/nion/knowledge/ingest_service.py`
- Create: `backend/packages/harness/nion/knowledge/query_service.py`
- Create: `backend/packages/harness/nion/knowledge/lint_service.py`
- Create: `backend/packages/harness/nion/knowledge/graph_service.py`
- Create: `backend/packages/harness/nion/knowledge/revision_service.py`
- Create: `backend/tests/test_knowledge_ingest_service.py`
- Create: `backend/tests/test_knowledge_query_service.py`
- Create: `backend/tests/test_knowledge_lint_service.py`
- Create: `backend/tests/test_knowledge_graph_service.py`
- Create: `backend/tests/test_knowledge_revision_service.py`
- Modify: `backend/app/gateway/routers/knowledge.py`

- [ ] **Step 1: Write the failing service tests**

Create `backend/tests/test_knowledge_query_service.py`:

```python
from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.query_service import KnowledgeQueryService


def test_query_service_reads_pages_not_notebook_sources(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="## Summary\nRoadmap summary\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    service = KnowledgeQueryService(base_dir=tmp_path)
    result = service.answer("What does the knowledge base say about roadmap?")

    assert "Roadmap summary" in result.answer_markdown
    assert "concept:roadmap" in result.page_ids
```

Create `backend/tests/test_knowledge_revision_service.py`:

```python
from nion.knowledge.revision_service import KnowledgeRevisionService


def test_revision_service_uses_non_proposal_statuses(tmp_path):
    service = KnowledgeRevisionService(base_dir=tmp_path)
    request = service.create_request(
        page_id="concept:roadmap",
        request_type="fix_fact",
        instruction="Fix the owner name",
        optional_source_refs=[],
    )

    assert request.status == "open"
    previewed = service.mark_previewed(request.request_id)
    assert previewed.status == "previewed"
    closed = service.close_request(request.request_id)
    assert closed.status == "closed"
```

Create `backend/tests/test_knowledge_graph_service.py`:

```python
from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.graph_service import KnowledgeGraphService


def test_graph_service_outputs_extracted_and_inferred_edge_types(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="See [[Entity:AlphaTeam]] for owners.",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )
    store.write_page(
        page_id="entity:alpha-team",
        page_type="entity",
        title="Alpha Team",
        body="Owner team",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    service = KnowledgeGraphService(base_dir=tmp_path)
    graph = service.build_graph()

    assert any(edge["edge_type"] == "EXTRACTED" for edge in graph["edges"])
```

- [ ] **Step 2: Run the failing service subset**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_revision_service.py \
  backend/tests/test_knowledge_graph_service.py -q
```

Expected: FAIL because services do not exist.

- [ ] **Step 3: Implement minimal services with file-native behavior**

Requirements:

- `KnowledgeQueryService.answer()` reads page files only.
- `KnowledgeRevisionService` uses statuses `open`, `previewed`, `applied`, `closed` only.
- `KnowledgeGraphService.build_graph()` parses `[[wikilinks]]` and emits `EXTRACTED` edges now; leave explicit `INFERRED` support stubbed but typed.
- `KnowledgeLintService.run()` returns orphan/broken/stale/data-gap buckets.
- `KnowledgeIngestService.ingest_sources()` writes source pages and updates `overview.md`, `index.md`, and `log.md` using the current page store and frontmatter helpers.

- [ ] **Step 4: Extend the knowledge router for query/lint/graph/revision**

Add minimal endpoints:

```text
GET  /api/knowledge/query?question=...
GET  /api/knowledge/lint
POST /api/knowledge/graph/rebuild
POST /api/knowledge/revisions
POST /api/knowledge/revisions/{request_id}/preview
POST /api/knowledge/revisions/{request_id}/close
```

- [ ] **Step 5: Run the backend service subset to green**

Run the command from Step 2, then:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_knowledge_router.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit the advanced knowledge services**

```bash
git add \
  backend/packages/harness/nion/knowledge/ingest_service.py \
  backend/packages/harness/nion/knowledge/query_service.py \
  backend/packages/harness/nion/knowledge/lint_service.py \
  backend/packages/harness/nion/knowledge/graph_service.py \
  backend/packages/harness/nion/knowledge/revision_service.py \
  backend/app/gateway/routers/knowledge.py \
  backend/tests/test_knowledge_ingest_service.py \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_lint_service.py \
  backend/tests/test_knowledge_graph_service.py \
  backend/tests/test_knowledge_revision_service.py
git commit -m "feat: add knowledge query graph lint and revision services"
```

## Task 8: Register Knowledge In Capability Catalog And Intent Routing

**Files:**
- Modify: `backend/packages/harness/nion/capability_objects.py`
- Modify: `backend/packages/harness/nion/system_capability_catalog.py`
- Modify: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- Modify: `backend/packages/harness/nion/capability_backbone/intent_router.py`
- Modify: `backend/tests/test_capability_objects.py`
- Modify: `backend/tests/test_capability_intent_router.py`
- Create: `backend/tests/test_knowledge_capability_catalog.py`

- [ ] **Step 1: Write failing tests for the new capability object**

Create `backend/tests/test_knowledge_capability_catalog.py`:

```python
import json

from nion.tools.builtins.control_plane_tools import get_capability_catalog_tool


def test_capability_catalog_reports_knowledge_descriptor(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    payload = json.loads(get_capability_catalog_tool.invoke({}))
    objects = payload["objects"]
    knowledge = next(item for item in objects if item["kind"] == "knowledge")

    assert knowledge["label"] == "Knowledge Base"
    assert knowledge["actions"][0]["id"] == "bridge:notebook-to-knowledge"
```

Append to `backend/tests/test_capability_intent_router.py`:

```python
    assert route_system_object_intent("查一下知识库") == "knowledge_pages"
    assert route_system_object_intent("重建知识图谱") == "knowledge_graph"
```

- [ ] **Step 2: Run the failing capability tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_capability_objects.py \
  backend/tests/test_capability_intent_router.py \
  backend/tests/test_knowledge_capability_catalog.py -q
```

Expected: FAIL because no knowledge object is emitted yet.

- [ ] **Step 3: Add a `knowledge` capability object**

In `backend/packages/harness/nion/capability_objects.py`, append:

```python
        {
            "id": "capability:knowledge",
            "kind": "knowledge",
            "ownership": "agent",
            "label": "Knowledge Base",
            "description": "Compiled knowledge pages, query, graph, and revision workflows",
            "surface": "runtime",
            "summary": "Agent-owned compiled knowledge distinct from notebook sources and runtime memory.",
            "availability": _availability(),
            "discoverability": _discoverability(),
            "actions": [
                _action("bridge:notebook-to-knowledge", "Send notebook content into the knowledge queue"),
            ],
            "details": knowledge_descriptor or {},
            "usage": {
                "use_when": "Use when the task is about compiled wiki knowledge, graph relationships, or knowledge-base query.",
                "avoid_when": "Avoid treating notebook source material or runtime memory as the same surface.",
                "boundary": "Knowledge Base is compiled, agent-owned knowledge. It is not Notebook source material and it is not runtime Memory.",
            },
        }
```

Update `build_system_capability_catalog()` and `get_capability_catalog_tool()` to pass a `knowledge_descriptor` that includes queue size, page count, and graph presence.

- [ ] **Step 4: Extend intent routing aliases**

In `backend/packages/harness/nion/capability_backbone/intent_router.py`, add aliases mapping:

- `知识库` / `knowledge base` -> `knowledge_pages`
- `知识图谱` / `graph` -> `knowledge_graph`
- `知识查询` / `query knowledge` -> `knowledge_query`

- [ ] **Step 5: Run the capability subset to green**

Run the command from Step 2.
Expected: PASS.

- [ ] **Step 6: Commit capability registration**

```bash
git add \
  backend/packages/harness/nion/capability_objects.py \
  backend/packages/harness/nion/system_capability_catalog.py \
  backend/packages/harness/nion/tools/builtins/control_plane_tools.py \
  backend/packages/harness/nion/capability_backbone/intent_router.py \
  backend/tests/test_capability_objects.py \
  backend/tests/test_capability_intent_router.py \
  backend/tests/test_knowledge_capability_catalog.py
git commit -m "feat: register knowledge base in capability catalog"
```

## Task 9: Final Frontend Productization And i18n

**Files:**
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/components/workspace/knowledge/*.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`
- Modify: `frontend/src/components/workspace/knowledge/*.contract.test.ts`

- [ ] **Step 1: Freeze i18n and role-separation copy contracts**

Append to `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`:

```ts
void test("knowledge copy is first-class in locales and stays distinct from notebook and memory", () => {
  assert.ok(zhCN.sidebar.knowledge);
  assert.ok(enUS.sidebar.knowledge);
  assert.match(zhCN.workspaceSurfaces.knowledge.description, /知识/);
  assert.match(enUS.workspaceSurfaces.knowledge.description, /knowledge/i);
  assert.doesNotMatch(String(zhCN.workspaceSurfaces.knowledge.description), /笔记|记忆/);
});
```

- [ ] **Step 2: Add the locale keys**

Extend `frontend/src/core/i18n/locales/types.ts`, `zh-CN.ts`, and `en-US.ts` with:

- `sidebar.knowledge`
- `workspaceSurfaces.knowledge`
- `shortcuts.openKnowledge`
- `knowledgePage.*`

- [ ] **Step 3: Replace skeleton placeholders with product copy and page-level wiring**

Requirements:

- `KnowledgeHomePage` must render overview summary, queue summary, and graph status cards.
- `KnowledgeQueuePage` must render candidate status badges and batch-approve affordance.
- `KnowledgeQueryPage` must render input, result area, and save-synthesis action.
- `KnowledgeGraphPage` must render graph rebuild action and graph state summary.
- `KnowledgeRevisionDialog` must only emit revision requests and preview/apply flows, never a freeform content editor.

- [ ] **Step 4: Run the frontend contract and API suite**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-page-reader.contract.test.ts \
  src/components/workspace/knowledge/knowledge-query-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-revision-dialog.contract.test.ts && \
pnpm --dir frontend test -- src/core/knowledge/api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the productized knowledge UI**

```bash
git add \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  frontend/src/components/workspace/knowledge \
  frontend/src/app/workspace/knowledge
git commit -m "feat: productize knowledge workspace surfaces"
```

## Task 10: Full Verification Pass

**Files:**
- No code changes expected

- [ ] **Step 1: Run the backend knowledge suite**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_knowledge_source_candidates.py \
  backend/tests/test_knowledge_page_store.py \
  backend/tests/test_knowledge_compile_jobs.py \
  backend/tests/test_knowledge_ingest_service.py \
  backend/tests/test_knowledge_query_service.py \
  backend/tests/test_knowledge_lint_service.py \
  backend/tests/test_knowledge_graph_service.py \
  backend/tests/test_knowledge_revision_service.py \
  backend/tests/test_knowledge_router.py \
  backend/tests/test_capability_objects.py \
  backend/tests/test_capability_intent_router.py \
  backend/tests/test_knowledge_capability_catalog.py \
  backend/tests/test_notebook_api.py -q
```

Expected: PASS.

- [ ] **Step 2: Run the frontend knowledge and nav suite**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/workspace-nav-memory-links.contract.test.ts \
  src/components/workspace/notebook-routes.test.ts \
  src/components/workspace/notebook/notebook-knowledge-bridge.contract.test.ts \
  src/components/workspace/knowledge/knowledge-routes.contract.test.ts \
  src/components/workspace/knowledge/knowledge-home-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-queue-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-page-reader.contract.test.ts \
  src/components/workspace/knowledge/knowledge-query-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-graph-page.contract.test.ts \
  src/components/workspace/knowledge/knowledge-revision-dialog.contract.test.ts && \
pnpm --dir frontend test -- src/core/knowledge/api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run a focused integration sanity pass**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_notebook_api.py::test_notebook_api_round_trips_note_lifecycle \
  backend/tests/test_knowledge_router.py::test_knowledge_queue_endpoint_returns_notebook_candidates -q
```

Expected: PASS.

- [ ] **Step 4: Record remaining risks before handoff**

Document in the final report:

- asset text extraction quality is still basic if only raw file content hashing exists
- inferred graph edges are typed but may remain minimal in phase one
- query quality is page-based and intentionally does not scan raw notebook content

- [ ] **Step 5: Commit final verification notes if any docs changed**

Only if files changed:

```bash
git add <changed-files>
git commit -m "docs: record knowledge base verification notes"
```

## Self-Review

Spec coverage check:

- Section 3 decision baseline maps to Task 2/3/6/9.
- Section 4 boundary model maps to Task 1, Task 3, Task 6, Task 8.
- Section 5 storage model maps to Task 2.
- Section 6 data models maps to Task 2 and Task 7.
- Section 8 product IA maps to Task 1, Task 5, Task 6, Task 9.
- Section 9 capability contract maps to Task 8.
- Section 10 workflows map to Task 7.
- Section 11 phases map to the task ordering itself.
- Section 12 non-goals are enforced by Scope Guard and by source-kind restrictions in Task 2/3.
- Section 13 success criteria are checked in Task 10.

Placeholder scan:

- No `TODO`, `TBD`, or vague “appropriate error handling” steps remain.
- All code-changing steps include explicit code or exact behavior requirements.

Type consistency:

- `KnowledgeSourceCandidate`, `KnowledgeCompileJob`, `KnowledgePage`, and revision status names are consistent across tasks.
- Revision flow uses `open/previewed/applied/closed` everywhere to respect repository rules.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-notebook-to-knowledge-base-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
