# Memory / Identity / Soul File-Native And Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Memory / Identity / Soul 重构为文件原生主档模型，并让多智能体协同与新的 runtime speaking contract 对齐。

**Architecture:** 本计划把这轮工作收成一个完整垂直切片：`IDENTITY.md`、`SOUL.md`、`MEMORY.md` 成为正式主档；产品面切到 Memory 结构化只读、Identity/Soul Markdown 预览与整文编辑双态；runtime bundle 统一消费文件编译产物；多智能体协同只产出 child work products，由主智能体统一对外发声。整个实施按 TDD 分任务推进，先冻结合同，再切存储，再切 UI 和 runtime，最后切协同 speaking contract。

**Tech Stack:** Python 3.12, FastAPI, Pydantic, SQLite, Memory OS, TypeScript, React 19, Next.js, TanStack Query, node:test, pytest

---

## Scope Check

这份计划覆盖四个强耦合子系统：

1. 文件原生主档层
2. Memory / Identity / Soul 产品面
3. runtime bundle
4. 多智能体协同 speaking contract

它们不能被拆成完全独立的几个计划，否则会出现这些不可接受的中间态：

- UI 做完了，但还在读旧字段存储
- 文件主档建好了，但 runtime 仍不消费
- 主智能体主档切好了，协同链路却继续绕开主智能体说话

所以本计划保留为一个总计划，但任务内部按边界分段，确保每一段都能单独回归。

---

## Read This First

- [2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md)
- [README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/prototypes/memory-identity-soul-file-native/README.md)
- [index.html](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/prototypes/memory-identity-soul-file-native/index.html)
- [memory.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py)
- [user_identity.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/user_identity.py)
- [memory_soul.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_soul.py)
- [user_identity_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py)
- [service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/service.py)
- [soul_bundle.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py)
- [delegated_agent_executor.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/orchestration/delegated_agent_executor.py)
- [graph.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/orchestration/graph.py)
- [threads/service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py)
- [memory-home-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx)
- [identity-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/identity-settings-page.tsx)
- [user-identity-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/user-identity-panel.tsx)
- [soul-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/soul-settings-page.tsx)

---

## File Map

### Backend: file-native context layer

- Create: `backend/packages/harness/nion/runtime_context/files/__init__.py`
- Create: `backend/packages/harness/nion/runtime_context/files/models.py`
- Create: `backend/packages/harness/nion/runtime_context/files/identity_file.py`
- Create: `backend/packages/harness/nion/runtime_context/files/soul_file.py`
- Create: `backend/packages/harness/nion/runtime_context/files/memory_file.py`
- Create: `backend/packages/harness/nion/runtime_context/files/compiler.py`

### Backend: services and routers

- Modify: `backend/packages/harness/nion/user_identity/service.py`
- Modify: `backend/packages/harness/nion/user_identity/repository.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/app/gateway/routers/memory.py`
- Create: `backend/app/gateway/routers/identity_document.py`
- Create: `backend/app/gateway/routers/soul_document.py`

### Backend: orchestration alignment

- Modify: `backend/packages/harness/nion/orchestration/delegated_agent_executor.py`
- Modify: `backend/packages/harness/nion/orchestration/graph.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Modify: `backend/packages/harness/nion/orchestration/remote_transports/a2a.py`

### Frontend: shared document UI

- Create: `frontend/src/components/workspace/documents/markdown-document-view.tsx`
- Create: `frontend/src/components/workspace/documents/markdown-document-editor.tsx`
- Create: `frontend/src/components/workspace/documents/document-mode-toggle.tsx`
- Create: `frontend/src/components/workspace/documents/index.ts`

### Frontend: product pages

- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/settings/identity-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/core/user-identity/api.ts`
- Modify: `frontend/src/core/soul-settings/api.ts`
- Create: `frontend/src/core/user-identity/document-types.ts`
- Create: `frontend/src/core/soul-settings/document-types.ts`

### Tests

- Modify: `backend/tests/test_memory_router.py`
- Modify: `backend/tests/test_memory_soul_router.py`
- Modify: `backend/tests/test_soul_chat_write_path.py`
- Modify: `backend/tests/test_delegated_agent_executor.py`
- Modify: `backend/tests/test_orchestrator_graph.py`
- Modify: `backend/tests/test_remote_agent_transport.py`
- Create: `backend/tests/test_identity_document_router.py`
- Create: `backend/tests/test_soul_document_router.py`
- Create: `backend/tests/test_runtime_context_files.py`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`
- Create: `frontend/src/components/workspace/settings/identity-settings-page.contract.test.ts`
- Create: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`

---

## Task 1: Freeze the new contracts in tests

**Files:**
- Modify: `backend/tests/test_memory_router.py`
- Modify: `backend/tests/test_memory_soul_router.py`
- Create: `backend/tests/test_identity_document_router.py`
- Create: `backend/tests/test_soul_document_router.py`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`
- Create: `frontend/src/components/workspace/settings/identity-settings-page.contract.test.ts`
- Create: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`

- [ ] **Step 1: Rewrite the Memory contract to enforce structured read-only product semantics**

```python
def test_memory_route_is_product_read_only_surface(client):
    response = client.get("/api/memory")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"user_profile", "long_term_background", "fact_memories"}


def test_memory_route_does_not_expose_fact_mutation_on_product_surface(app):
    routes = {route.path for route in app.routes}
    assert "/api/memory/facts" not in routes
    assert "/api/memory/import" not in routes
    assert "/api/memory/export" not in routes
```

- [ ] **Step 2: Add failing router tests for whole-document identity and soul APIs**

```python
def test_identity_document_route_returns_markdown_payload(client):
    response = client.get("/api/identity/document")
    assert response.status_code == 200
    assert response.json()["document"].startswith("# Identity")


def test_soul_document_route_returns_markdown_payload(client):
    response = client.get("/api/soul/document")
    assert response.status_code == 200
    assert response.json()["document"].startswith("# Soul")
```

- [ ] **Step 3: Add failing frontend contract tests for markdown preview/edit dual-mode**

```ts
void test("identity settings page uses markdown preview plus whole-document edit", async () => {
  const source = await readFile(new URL("./identity-settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /IDENTITY\.md/);
  assert.match(source, /预览/);
  assert.match(source, /编辑/);
  assert.doesNotMatch(source, /常用别名[\s\S]*保存[\s\S]*用户角色[\s\S]*保存/);
});

void test("soul settings page uses markdown preview plus whole-document edit", async () => {
  const source = await readFile(new URL("./soul-settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /SOUL\.md/);
  assert.match(source, /保存并生效/);
  assert.doesNotMatch(source, /每块一个保存按钮/);
});
```

- [ ] **Step 4: Run the targeted tests and verify they fail for the right reasons**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_router.py \
  backend/tests/test_identity_document_router.py \
  backend/tests/test_soul_document_router.py -q

pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/settings/identity-settings-page.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts
```

Expected:

- backend: FAIL because whole-document routes do not exist and product Memory surface still leaks legacy maintenance actions
- frontend: FAIL because Identity / Soul still render field editors instead of whole-document preview/edit

- [ ] **Step 5: Commit the contract baseline**

```bash
git add \
  backend/tests/test_memory_router.py \
  backend/tests/test_identity_document_router.py \
  backend/tests/test_soul_document_router.py \
  frontend/src/components/workspace/memory/memory-home-page.contract.test.ts \
  frontend/src/components/workspace/settings/identity-settings-page.contract.test.ts \
  frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts
git commit -m "test: freeze file-native memory identity and soul contracts"
```

---

## Task 2: Introduce file-native context artifacts

**Files:**
- Create: `backend/packages/harness/nion/runtime_context/files/__init__.py`
- Create: `backend/packages/harness/nion/runtime_context/files/models.py`
- Create: `backend/packages/harness/nion/runtime_context/files/identity_file.py`
- Create: `backend/packages/harness/nion/runtime_context/files/soul_file.py`
- Create: `backend/packages/harness/nion/runtime_context/files/memory_file.py`
- Create: `backend/packages/harness/nion/runtime_context/files/compiler.py`
- Create: `backend/tests/test_runtime_context_files.py`

- [ ] **Step 1: Write failing tests for reading/writing IDENTITY.md, SOUL.md, and MEMORY.md**

```python
def test_identity_file_round_trips_markdown(tmp_path):
    from nion.runtime_context.files.identity_file import IdentityDocumentStore

    store = IdentityDocumentStore(base_dir=tmp_path)
    content = "# Identity\n\n## Core\n- User name: 张天成\n"
    store.write(content)

    assert store.read() == content


def test_soul_file_round_trips_markdown(tmp_path):
    from nion.runtime_context.files.soul_file import SoulDocumentStore

    store = SoulDocumentStore(base_dir=tmp_path)
    content = "# Soul\n\n## Core Identity\n长期陪伴、克制稳定、结论先行。\n"
    store.write(content)

    assert store.read() == content
```

- [ ] **Step 2: Add compiler tests for structured projections**

```python
def test_compile_identity_markdown_to_profile():
    from nion.runtime_context.files.compiler import compile_identity_document

    result = compile_identity_document(
        "# Identity\n\n## Core\n- User name: 张天成\n- Preferred address: 大哥\n"
    )

    assert result.user_name == "张天成"
    assert result.preferred_address_for_user == "大哥"
```

- [ ] **Step 3: Implement minimal file stores and compiler**

```python
class IdentityDocumentStore:
    def __init__(self, base_dir: str | Path) -> None:
        self._path = Path(base_dir) / "runtime-context" / "identity" / "IDENTITY.md"

    def read(self) -> str:
        if not self._path.exists():
            return "# Identity\n"
        return self._path.read_text(encoding="utf-8")

    def write(self, content: str) -> str:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(content, encoding="utf-8")
        return content
```

- [ ] **Step 4: Run the new tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_runtime_context_files.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/runtime_context/files \
  backend/tests/test_runtime_context_files.py
git commit -m "feat: add file-native context artifact layer"
```

---

## Task 3: Rebuild Identity and Soul APIs around whole-document editing

**Files:**
- Modify: `backend/packages/harness/nion/user_identity/service.py`
- Modify: `backend/packages/harness/nion/user_identity/repository.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Create: `backend/app/gateway/routers/identity_document.py`
- Create: `backend/app/gateway/routers/soul_document.py`
- Modify: `backend/tests/test_identity_document_router.py`
- Modify: `backend/tests/test_soul_document_router.py`

- [ ] **Step 1: Add failing tests for PUT document semantics**

```python
def test_put_identity_document_replaces_markdown_and_updates_projection(client):
    response = client.put(
        "/api/identity/document",
        json={"document": "# Identity\n\n## Core\n- User name: 张天成\n"},
    )
    assert response.status_code == 200
    assert response.json()["document"].startswith("# Identity")
```

- [ ] **Step 2: Implement document router payloads**

```python
class MarkdownDocumentResponse(BaseModel):
    document: str


class MarkdownDocumentUpdateRequest(BaseModel):
    document: str
```

- [ ] **Step 3: Route writes through file store plus compiler**

```python
@router.put("/api/identity/document", response_model=MarkdownDocumentResponse)
async def update_identity_document(request: MarkdownDocumentUpdateRequest):
    document = identity_store.write(request.document)
    identity_service.replace_from_document(document)
    return MarkdownDocumentResponse(document=document)
```

- [ ] **Step 4: Keep chat writes and settings reads aligned**

```python
def replace_from_document(self, document: str) -> UserIdentityProfile:
    compiled = compile_identity_document(document)
    self._document_store.write(document)
    return self._repository.save(compiled)
```

- [ ] **Step 5: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_identity_document_router.py \
  backend/tests/test_soul_document_router.py \
  backend/tests/test_soul_chat_write_path.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/user_identity/service.py \
  backend/packages/harness/nion/user_identity/repository.py \
  backend/packages/harness/nion/memory/soul/console_service.py \
  backend/app/gateway/routers/user_identity.py \
  backend/app/gateway/routers/memory_soul.py \
  backend/app/gateway/routers/identity_document.py \
  backend/app/gateway/routers/soul_document.py
git commit -m "feat: move identity and soul editing to whole-document markdown APIs"
```

---

## Task 4: Split Memory into structured read-only product surface plus assistant-maintained active file

**Files:**
- Modify: `backend/app/gateway/routers/memory.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/tests/test_memory_router.py`

- [ ] **Step 1: Remove legacy maintenance actions from the product surface**

```python
def collect_gateway_routes() -> set[str]:
    app = create_app()
    return {route.path for route in app.routes}


def test_memory_route_surface_has_no_legacy_fact_mutations():
    routes = collect_gateway_routes()
    assert "/api/memory/facts" not in routes
    assert "/api/memory/import" not in routes
    assert "/api/memory/export" not in routes
```

- [ ] **Step 2: Add runtime test that MEMORY.md becomes the active memory summary**

```python
def test_runtime_memory_context_prefers_memory_md_summary(tmp_path):
    from nion.runtime_context.files.memory_file import MemoryDocumentStore
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    MemoryDocumentStore(tmp_path).write("# Active Memory\n\n- 先给结论\n")
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    result = build_runtime_memory_context(
        repository=repo,
        query="总结今天工作",
        thread_id="thread-1",
        base_dir=tmp_path,
    )

    assert "先给结论" in (result.sections.active_memory_document or "")
```

- [ ] **Step 3: Implement the product router as read-only**

```python
@router.get("/memory", response_model=MemoryUserFacingResponse)
async def get_memory() -> MemoryUserFacingResponse:
    return MemoryUserFacingResponse(**build_memory_user_facing_payload())
```

- [ ] **Step 4: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_router.py \
  backend/tests/test_runtime_context_files.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/gateway/routers/memory.py \
  backend/packages/harness/nion/memory/runtime_engine/service.py \
  backend/tests/test_memory_router.py
git commit -m "feat: make memory a structured read-only product surface"
```

---

## Task 5: Replace Identity and Soul UI with markdown preview/edit dual-mode

**Files:**
- Create: `frontend/src/components/workspace/documents/markdown-document-view.tsx`
- Create: `frontend/src/components/workspace/documents/markdown-document-editor.tsx`
- Create: `frontend/src/components/workspace/documents/document-mode-toggle.tsx`
- Create: `frontend/src/components/workspace/documents/index.ts`
- Modify: `frontend/src/components/workspace/settings/identity-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/core/user-identity/api.ts`
- Modify: `frontend/src/core/soul-settings/api.ts`
- Create: `frontend/src/core/user-identity/document-types.ts`
- Create: `frontend/src/core/soul-settings/document-types.ts`
- Create: `frontend/src/components/workspace/settings/identity-settings-page.contract.test.ts`
- Create: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`

- [ ] **Step 1: Add failing frontend contracts for whole-document mode**

```ts
void test("identity page exposes preview/edit markdown modes", async () => {
  const source = await readFile(new URL("./identity-settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /IDENTITY\.md/);
  assert.match(source, /预览/);
  assert.match(source, /编辑/);
  assert.match(source, /保存并生效/);
});
```

- [ ] **Step 2: Create shared document UI primitives**

```tsx
export function DocumentModeToggle(props: {
  mode: "preview" | "edit";
  onModeChange: (mode: "preview" | "edit") => void;
}) {
  return (
    <div className="inline-flex rounded-full border p-1">
      <button type="button" onClick={() => props.onModeChange("preview")}>预览</button>
      <button type="button" onClick={() => props.onModeChange("edit")}>编辑</button>
    </div>
  );
}
```

- [ ] **Step 3: Replace field form UIs with whole-document flow**

```tsx
const [mode, setMode] = useState<"preview" | "edit">("preview");
const [draft, setDraft] = useState(document);

return mode === "preview" ? (
  <MarkdownDocumentView document={document} />
) : (
  <MarkdownDocumentEditor draft={draft} onChange={setDraft} onSave={saveDocument} />
);
```

- [ ] **Step 4: Run contracts and typecheck**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/settings/identity-settings-page.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/documents \
  frontend/src/components/workspace/settings/identity-settings-page.tsx \
  frontend/src/components/workspace/settings/user-identity-panel.tsx \
  frontend/src/components/workspace/settings/soul-settings-page.tsx \
  frontend/src/core/user-identity/api.ts \
  frontend/src/core/soul-settings/api.ts \
  frontend/src/core/user-identity/document-types.ts \
  frontend/src/core/soul-settings/document-types.ts
git commit -m "feat: rebuild identity and soul pages around whole-document markdown editing"
```

---

## Task 6: Rebuild Memory UI as structured reading only

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`

- [ ] **Step 1: Add failing contract for structured reading semantics**

```ts
void test("memory home page treats memory as assistant-maintained structured reading surface", async () => {
  const source = await readFile(new URL("./memory-home-page.tsx", import.meta.url), "utf8");
  assert.match(source, /由助手自动维护|来自 MEMORY\\.md|长期记忆档案/);
  assert.doesNotMatch(source, /导入|导出|新建事实|删除事实/);
});
```

- [ ] **Step 2: Implement the reading layout**

```tsx
<section>
  <header>
    <h2>记忆</h2>
    <p>这是 MEMORY.md 的结构化阅读视图。</p>
  </header>
  <ActiveMemorySummary />
  <LongTermMemoryVault />
</section>
```

- [ ] **Step 3: Run contracts**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 4: Commit**

```bash
git add \
  frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/components/workspace/memory/memory-home-page.contract.test.ts
git commit -m "feat: turn memory into a structured reading surface"
```

---

## Task 7: Align multi-agent orchestration to the file-native speaking contract

**Files:**
- Modify: `backend/packages/harness/nion/orchestration/delegated_agent_executor.py`
- Modify: `backend/packages/harness/nion/orchestration/graph.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Modify: `backend/packages/harness/nion/orchestration/remote_transports/a2a.py`
- Modify: `backend/tests/test_delegated_agent_executor.py`
- Modify: `backend/tests/test_orchestrator_graph.py`
- Modify: `backend/tests/test_remote_agent_transport.py`

- [ ] **Step 1: Add failing tests that child runs only produce internal work products**

```python
def test_orchestrator_graph_returns_child_work_products_not_final_user_reply():
    result = graph.invoke(...)
    assert "child_work_products" in result
    assert result["final_reply"] == ""
```

- [ ] **Step 2: Add failing tests for lead-agent synthesis step**

```python
def test_thread_service_replays_child_work_products_back_to_lead_agent(monkeypatch):
    captured = {}
    service._client = FakeLeadClient(captured)  # noqa: SLF001
    ...
    assert "child_work_products" in captured["context"]
```

- [ ] **Step 3: Tighten delegated permissions and A2A final-state handling**

```python
effective_permissions = caller_permissions if caller_permissions is not None else set(...)
```

```python
terminal_text = candidate if _is_terminal_state(_extract_state(result)) else terminal_text
```

- [ ] **Step 4: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_delegated_agent_executor.py \
  backend/tests/test_orchestrator_graph.py \
  backend/tests/test_remote_agent_transport.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/orchestration/delegated_agent_executor.py \
  backend/packages/harness/nion/orchestration/graph.py \
  backend/packages/harness/nion/threads/service.py \
  backend/packages/harness/nion/orchestration/remote_transports/a2a.py \
  backend/tests/test_delegated_agent_executor.py \
  backend/tests/test_orchestrator_graph.py \
  backend/tests/test_remote_agent_transport.py
git commit -m "feat: align multi-agent orchestration to the file-native speaking contract"
```

---

## Task 8: Final verification and docs sync

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update docs to reflect delivered behavior**

```md
- Identity 与 Soul 现在以 whole-document markdown 方式编辑
- Memory 是 assistant-maintained structured reading surface
- child agents 只产出 internal work products，最终回复仍由主智能体统一生成
```

- [ ] **Step 2: Run the focused end-to-end verification stack**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_router.py \
  backend/tests/test_identity_document_router.py \
  backend/tests/test_soul_document_router.py \
  backend/tests/test_runtime_context_files.py \
  backend/tests/test_soul_chat_write_path.py \
  backend/tests/test_delegated_agent_executor.py \
  backend/tests/test_orchestrator_graph.py \
  backend/tests/test_remote_agent_transport.py -q

pnpm --dir frontend test:contracts -- \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/settings/identity-settings-page.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- backend tests PASS
- frontend contract tests PASS
- frontend typecheck PASS

- [ ] **Step 3: Commit**

```bash
git add README.md backend/CLAUDE.md docs/test/README.md
git commit -m "docs: sync file-native context and orchestration redesign behavior"
```

---

## Self-Review

### Spec coverage

- 文件主档：Task 2, Task 3
- Identity / Soul markdown 双态：Task 5
- Memory 结构化只读：Task 4, Task 6
- runtime bundle 对齐：Task 2, Task 4, Task 7
- 多智能体 speaking contract：Task 7

没有发现未覆盖的关键要求。

### Placeholder scan

- 计划中所有任务都给了文件路径、测试意图、执行命令和期望结果。
- 没有保留 `TODO` / `TBD` / “适当处理” 这类空话。

### Type consistency

- 文档 API 统一使用 `MarkdownDocumentResponse` / `MarkdownDocumentUpdateRequest`
- Identity / Soul 一律走 whole-document preview/edit
- child agent 统一产出 `child_work_products`

---

Plan complete and saved to `docs/superpowers/plans/2026-04-13-memory-identity-soul-file-native-and-orchestration-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
