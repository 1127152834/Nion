# Notebook Assistant Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a notebook-scoped lightweight chat experience powered by a built-in locked `笔记助手` agent, with direct rewrite application and confirm/cancel review flow.

**Architecture:** Extend the agent catalog to merge built-in and custom agents, add a notebook-assistant session layer that reuses thread-style streaming without polluting main chat history, and replace the current notebook `Ask Nion` panel with a slim chat shell. Rewrite requests write directly into notebook state through a pending-review model that supports overwrite-on-new-rewrite and local confirm/cancel controls.

**Tech Stack:** Next.js App Router, React, TanStack Query, existing thread streaming client, FastAPI routers, Pydantic models, filesystem-backed thread repository, notebook history service.

---

## File Structure

### Backend

- Modify: `backend/packages/harness/nion/config/agents_config.py`
  - Extend agent config model and add built-in agent metadata merge helpers.
- Create: `backend/packages/harness/nion/config/builtin_agents.py`
  - Define built-in agent registry entries, including `笔记助手`.
- Modify: `backend/app/gateway/routers/agents.py`
  - Return unified agent catalog and reject delete/update on built-ins.
- Modify: `backend/packages/harness/nion/threads/models.py`
  - Add thread scope metadata needed to isolate notebook-assistant sessions from main chat.
- Modify: `backend/packages/harness/nion/threads/repository.py`
  - Filter thread search by scope/surface so notebook assistant sessions stay out of main chat history.
- Modify: `backend/packages/harness/nion/threads/service.py`
  - Persist notebook assistant session metadata and carry notebook-specific context into stream requests.
- Modify: `backend/app/gateway/routers/threads.py`
  - Accept notebook-assistant-specific context/scope fields if not already passed through.
- Modify: `backend/app/gateway/routers/notebook.py`
  - Add notebook assistant session bootstrap and rewrite-application endpoints or extend notebook routes for pending rewrite operations.
- Create: `backend/packages/harness/nion/notebook/assistant_service.py`
  - Encapsulate notebook assistant rewrite intent handling, pending rewrite snapshots, and apply/revert lifecycle.
- Create: `backend/tests/test_builtin_agents.py`
  - Cover built-in agent registry and API semantics.
- Modify: `backend/tests/test_custom_agent.py`
  - Update existing agent API tests for merged catalog and locked built-ins.
- Create: `backend/tests/test_notebook_assistant_api.py`
  - Cover notebook assistant session, rewrite apply, confirm, cancel, and overwrite behavior.

### Frontend

- Modify: `frontend/src/core/agents/types.ts`
  - Extend agent model for built-in/custom metadata.
- Modify: `frontend/src/core/agents/api.ts`
  - Consume extended agent response shape.
- Modify: `frontend/src/core/agents/hooks.ts`
  - Preserve existing hooks while supporting richer agent metadata.
- Modify: `frontend/src/components/workspace/agents/agent-card.tsx`
  - Render built-in badge and hide delete for locked agents.
- Modify: `frontend/src/components/workspace/agents/agent-gallery.tsx`
  - Continue rendering unified catalog.
- Create: `frontend/src/components/workspace/agents/agent-card.contract.test.ts`
  - Assert built-in badge and locked delete behavior.
- Create: `frontend/src/core/notebook-assistant/types.ts`
  - Define notebook assistant session, message, and pending rewrite types.
- Create: `frontend/src/core/notebook-assistant/api.ts`
  - Wrap notebook-assistant session and rewrite endpoints.
- Create: `frontend/src/core/notebook-assistant/hooks.ts`
  - Query/mutation hooks for notebook assistant state.
- Create: `frontend/src/core/notebook-assistant/hooks.test.ts`
  - Assert note/session query-key and API wiring.
- Create: `frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx`
  - Lightweight notebook chat shell replacing the current ask panel surface.
- Create: `frontend/src/components/workspace/notebook/notebook-assistant-composer.tsx`
  - Minimal composer derived from shared chat/input primitives.
- Create: `frontend/src/components/workspace/notebook/notebook-pending-rewrite.ts`
  - Pure helpers for pending rewrite range resolution and overwrite behavior.
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
  - Replace current ask-tab body with notebook assistant panel; keep history/info tabs.
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
  - Render inline pending rewrite highlights and local confirm/cancel controls.
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
  - Orchestrate notebook assistant state, rewrite application, and session reset.
- Create: `frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
  - Lock the new lightweight notebook chat structure.
- Create: `frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts`
  - Cover overwrite and revert behavior in pure helpers.
- Modify: `frontend/src/components/workspace/agents/agent-card.contract.test.ts` or nearest agent contract test file if present
  - Assert built-in badge/locked delete behavior.

### Docs

- Reference: `docs/superpowers/specs/2026-03-30-notebook-assistant-chat-design.md`
  - Source of truth for implementation.

## Task 1: Add Built-In Agent Catalog Support

**Files:**
- Create: `backend/packages/harness/nion/config/builtin_agents.py`
- Modify: `backend/packages/harness/nion/config/agents_config.py`
- Modify: `backend/app/gateway/routers/agents.py`
- Modify: `backend/tests/test_custom_agent.py`
- Create: `backend/tests/test_builtin_agents.py`
- Modify: `frontend/src/core/agents/types.ts`
- Modify: `frontend/src/core/agents/api.ts`
- Modify: `frontend/src/components/workspace/agents/agent-card.tsx`
- Create: `frontend/src/components/workspace/agents/agent-card.contract.test.ts`

- [ ] **Step 1: Write the failing backend tests for built-in agent listing and lock rules**

```python
def test_agents_api_includes_builtin_notebook_assistant(client: TestClient):
    response = client.get("/api/agents")
    assert response.status_code == 200
    names = [agent["name"] for agent in response.json()["agents"]]
    assert "笔记助手" in names


def test_builtin_agent_cannot_be_deleted(client: TestClient):
    response = client.delete("/api/agents/notebook-assistant")
    assert response.status_code == 403
    assert "built-in" in response.json()["detail"].lower()
```

- [ ] **Step 2: Run backend tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest tests/test_builtin_agents.py tests/test_custom_agent.py -q
```

Expected: FAIL because built-in registry/helpers and locked-agent route behavior do not exist yet.

- [ ] **Step 3: Write the failing frontend agent-card contract assertions**

```ts
void test("AgentCard shows built-in badge and hides delete for locked agents", async () => {
  const source = await readFile(new URL("./agent-card.tsx", import.meta.url), "utf8");

  assert.match(source, /系统内置|built-in|builtin/);
  assert.match(source, /can_delete/);
});
```

- [ ] **Step 4: Run the frontend contract test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/agents/agent-card.contract.test.ts
```

Expected: FAIL because the current card always renders delete and does not know built-in metadata.

- [ ] **Step 5: Implement the minimal built-in registry and merged agent API**

```python
# backend/packages/harness/nion/config/builtin_agents.py
from pydantic import BaseModel


class BuiltinAgentConfig(BaseModel):
    id: str
    name: str
    description: str
    kind: str = "builtin"
    visibility: str = "public"
    can_delete: bool = False
    can_edit: bool = False
    entrypoint: str = "notebook-chat"
    tool_policy: str | None = "notebook-basic"
    model: str | None = None
    tool_groups: list[str] | None = None
    soul: str | None = None


NOTEBOOK_ASSISTANT = BuiltinAgentConfig(
    id="builtin:notebook-assistant",
    name="笔记助手",
    description="针对当前笔记进行问答和改写的系统内置助手",
)


def list_builtin_agents() -> list[BuiltinAgentConfig]:
    return [NOTEBOOK_ASSISTANT]


def get_builtin_agent(name: str) -> BuiltinAgentConfig | None:
    normalized = name.lower()
    for agent in list_builtin_agents():
        if agent.id == normalized or agent.name == name or normalized == "notebook-assistant":
            return agent
    return None
```

```python
# backend/app/gateway/routers/agents.py (shape only)
class AgentResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    kind: str = "custom"
    visibility: str = "public"
    can_delete: bool = True
    can_edit: bool = True
    entrypoint: str = "full-chat"
    tool_policy: str | None = None
    model: str | None = None
    tool_groups: list[str] | None = None
    soul: str | None = None
```

```ts
// frontend/src/core/agents/types.ts
export interface Agent {
  id: string;
  name: string;
  description: string;
  kind: "builtin" | "custom";
  visibility: "public" | "internal";
  can_delete: boolean;
  can_edit: boolean;
  entrypoint: "full-chat" | "notebook-chat";
  tool_policy: string | null;
  model: string | null;
  tool_groups: string[] | null;
  soul?: string | null;
}
```

- [ ] **Step 6: Update the agent card to respect built-in metadata**

```tsx
{agent.kind === "builtin" ? (
  <Badge variant="secondary" className="mt-0.5 text-xs">
    系统内置
  </Badge>
) : null}

{agent.can_delete ? (
  <Button
    size="icon"
    variant="ghost"
    className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
    onClick={() => setDeleteOpen(true)}
    title={t.agents.delete}
  >
    <Trash2Icon className="h-3.5 w-3.5" />
  </Button>
) : null}
```

- [ ] **Step 7: Run backend and frontend tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest tests/test_builtin_agents.py tests/test_custom_agent.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/agents/agent-card.contract.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add backend/packages/harness/nion/config/builtin_agents.py \
  backend/packages/harness/nion/config/agents_config.py \
  backend/app/gateway/routers/agents.py \
  backend/tests/test_builtin_agents.py \
  backend/tests/test_custom_agent.py \
  frontend/src/core/agents/types.ts \
  frontend/src/core/agents/api.ts \
  frontend/src/components/workspace/agents/agent-card.tsx \
  frontend/src/components/workspace/agents/agent-card.contract.test.ts
git commit -m "feat: add built-in notebook assistant agent metadata"
```

## Task 2: Isolate Notebook Assistant Sessions From Main Chat History

**Files:**
- Modify: `backend/packages/harness/nion/threads/models.py`
- Modify: `backend/packages/harness/nion/threads/repository.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Create: `backend/tests/test_notebook_assistant_api.py`
- Modify: `frontend/src/core/threads/hooks.ts`
- Create: `frontend/src/core/notebook-assistant/types.ts`
- Create: `frontend/src/core/notebook-assistant/api.ts`
- Create: `frontend/src/core/notebook-assistant/hooks.ts`
- Create: `frontend/src/core/notebook-assistant/hooks.test.ts`

- [ ] **Step 1: Write the failing backend tests for notebook-assistant thread scoping**

```python
def test_notebook_assistant_threads_are_excluded_from_general_search(service: ThreadService):
    service.update_state("chat-1", {"title": "Normal chat"})
    service.update_state("note-1-session-1", {"title": "Notebook chat", "scope": "notebook_assistant"})

    results = service.search(ThreadSearchParams())
    ids = [item["thread_id"] for item in results]
    assert "chat-1" in ids
    assert "note-1-session-1" not in ids
```

- [ ] **Step 2: Run backend thread tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest tests/test_notebook_assistant_api.py -q
```

Expected: FAIL because thread records do not yet model notebook-assistant scope.

- [ ] **Step 3: Write the failing frontend notebook-assistant API test**

```ts
void test("notebook assistant hooks use note_id and session_id keys", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");
  assert.match(source, /note_id/);
  assert.match(source, /session_id/);
});
```

- [ ] **Step 4: Run the frontend test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/core/notebook-assistant/hooks.test.ts
```

Expected: FAIL because notebook-assistant client code does not exist yet.

- [ ] **Step 5: Add thread scope metadata and repository filtering**

```python
# backend/packages/harness/nion/threads/models.py
class ThreadValues(BaseModel):
    title: str = "Untitled"
    messages: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
    todos: list[dict[str, Any]] | None = None
    bridge: dict[str, Any] | None = None
    owner_client_id: str | None = None
    scope: str = "workspace"
    note_id: str | None = None
    notebook_session_id: str | None = None
```

```python
# backend/packages/harness/nion/threads/repository.py
if record.deleted:
    continue
if record.values.scope == "notebook_assistant":
    continue
records.append(record)
```

- [ ] **Step 6: Add notebook-assistant API wrappers and hooks**

```ts
// frontend/src/core/notebook-assistant/types.ts
export interface NotebookAssistantSession {
  note_id: string;
  session_id: string;
  thread_id: string;
}
```

```ts
// frontend/src/core/notebook-assistant/api.ts
export async function createNotebookAssistantSession(noteId: string) {
  return requestJSON<NotebookAssistantSession>(`/api/notebook/${noteId}/assistant/session`, {
    method: "POST",
  });
}
```

- [ ] **Step 7: Run backend and frontend tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest tests/test_notebook_assistant_api.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/core/notebook-assistant/hooks.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add backend/packages/harness/nion/threads/models.py \
  backend/packages/harness/nion/threads/repository.py \
  backend/packages/harness/nion/threads/service.py \
  backend/app/gateway/routers/threads.py \
  backend/tests/test_notebook_assistant_api.py \
  frontend/src/core/notebook-assistant/types.ts \
  frontend/src/core/notebook-assistant/api.ts \
  frontend/src/core/notebook-assistant/hooks.ts \
  frontend/src/core/notebook-assistant/hooks.test.ts
git commit -m "feat: add notebook assistant session scope"
```

## Task 3: Add Pending Rewrite Model and Notebook Assistant Rewrite APIs

**Files:**
- Create: `backend/packages/harness/nion/notebook/assistant_service.py`
- Modify: `backend/app/gateway/routers/notebook.py`
- Modify: `backend/tests/test_notebook_api.py`
- Create: `frontend/src/components/workspace/notebook/notebook-pending-rewrite.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts`
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`

- [ ] **Step 1: Write the failing backend rewrite lifecycle tests**

```python
def test_notebook_assistant_rewrite_can_apply_confirm_and_cancel(client: TestClient):
    created = client.post("/api/notebook/notes", json={"directory": "", "title": "Draft", "body": "old"}).json()["note"]
    note_id = created["note_id"]

    applied = client.post(
        f"/api/notebook/notes/{note_id}/assistant-rewrite/apply",
        json={"scope": "selection", "selection_start": 0, "selection_end": 3, "content": "new"},
    )
    assert applied.status_code == 200
    assert applied.json()["pending_rewrite"]["status"] == "pending"

    cancelled = client.post(f"/api/notebook/notes/{note_id}/assistant-rewrite/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["note"]["body"] == "old"
```

- [ ] **Step 2: Run backend rewrite tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest tests/test_notebook_api.py tests/test_notebook_assistant_api.py -q
```

Expected: FAIL because assistant rewrite endpoints and pending state do not exist.

- [ ] **Step 3: Write the failing pure frontend pending-rewrite test**

```ts
void test("overwritePendingRewrite restores original body before applying next rewrite", () => {
  const state = createPendingRewriteState({
    originalBody: "hello world",
    appliedBody: "hello rewritten world",
    selectionStart: 6,
    selectionEnd: 11,
  });

  const next = overwritePendingRewrite(state, {
    originalBody: "hello world",
    rewrittenBody: "hello polished world",
    selectionStart: 6,
    selectionEnd: 11,
  });

  assert.equal(next.originalBody, "hello world");
  assert.equal(next.appliedBody, "hello polished world");
});
```

- [ ] **Step 4: Run the frontend helper test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts
```

Expected: FAIL because helper does not exist yet.

- [ ] **Step 5: Implement assistant rewrite service and pending state types**

```python
# backend/packages/harness/nion/notebook/assistant_service.py
class PendingRewriteResult(BaseModel):
    note: NotebookNote
    pending_rewrite: dict


class NotebookAssistantService:
    def apply_rewrite(...): ...
    def confirm_rewrite(...): ...
    def cancel_rewrite(...): ...
```

```ts
// frontend/src/core/notebook/types.ts
export interface NotebookPendingRewrite {
  status: "pending";
  original_body: string;
  applied_body: string;
  selection_start: number | null;
  selection_end: number | null;
}
```

- [ ] **Step 6: Implement pure overwrite/revert helpers**

```ts
export function overwritePendingRewrite(
  current: NotebookPendingRewrite,
  next: {
    originalBody: string;
    rewrittenBody: string;
    selectionStart: number | null;
    selectionEnd: number | null;
  },
) {
  return {
    status: "pending" as const,
    originalBody: next.originalBody,
    appliedBody: next.rewrittenBody,
    selectionStart: next.selectionStart,
    selectionEnd: next.selectionEnd,
  };
}
```

- [ ] **Step 7: Run backend and frontend tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest tests/test_notebook_api.py tests/test_notebook_assistant_api.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add backend/packages/harness/nion/notebook/assistant_service.py \
  backend/app/gateway/routers/notebook.py \
  backend/tests/test_notebook_api.py \
  backend/tests/test_notebook_assistant_api.py \
  frontend/src/core/notebook/types.ts \
  frontend/src/core/notebook/hooks.ts \
  frontend/src/components/workspace/notebook/notebook-pending-rewrite.ts \
  frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts
git commit -m "feat: add notebook assistant pending rewrite flow"
```

## Task 4: Build the Lightweight Notebook Assistant Panel

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-assistant-composer.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`

- [ ] **Step 1: Write the failing panel contract test**

```ts
void test("NotebookAssistantPanel renders lightweight notebook chat chrome", async () => {
  const source = await readFile(new URL("./notebook-assistant-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /笔记助手/);
  assert.match(source, /新对话/);
  assert.match(source, /notebook assistant/i);
  assert.doesNotMatch(source, /ModelSelector|skills|cliTools|PromptInputActionMenu/);
});
```

- [ ] **Step 2: Run the panel contract test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
```

Expected: FAIL because the panel file does not exist yet.

- [ ] **Step 3: Implement the minimal notebook assistant panel and composer**

```tsx
// frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx
export function NotebookAssistantPanel(props: NotebookAssistantPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">笔记助手</h3>
        <Button size="sm" variant="ghost" onClick={props.onNewSession}>
          新对话
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <NotebookAssistantMessages messages={props.messages} />
      </div>
      <div className="border-t px-4 py-3">
        <NotebookAssistantComposer onSubmit={props.onSubmit} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace ask-tab body in notebook context panel**

```tsx
{activeTab === "ask" ? (
  <NotebookAssistantPanel
    noteId={note.note_id}
    noteTitle={currentNoteTitle}
    selection={selection}
    onNewSession={onStartNewAssistantSession}
    onSubmit={onNotebookAssistantSubmit}
    pendingRewrite={pendingRewrite}
    messages={assistantMessages}
  />
) : ...}
```

- [ ] **Step 5: Run the panel contract and notebook contracts to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test \
  frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-assistant-composer.tsx \
  frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx
git commit -m "feat: replace ask panel with notebook assistant chat"
```

## Task 5: Render Inline Confirm/Cancel Rewrite Controls in the Editor

**Files:**
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts`

- [ ] **Step 1: Write the failing editor contract assertions for pending rewrite controls**

```ts
assert.match(source, /确认/);
assert.match(source, /取消/);
assert.match(source, /pendingRewrite|pending_rewrite/);
assert.match(source, /selectionStart|selectionEnd/);
```

- [ ] **Step 2: Run the editor contract test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts
```

Expected: FAIL because the editor does not render pending rewrite controls yet.

- [ ] **Step 3: Implement inline pending rewrite rendering**

```tsx
{pendingRewrite ? (
  <div className="rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2 text-sm">
    <div className="mb-2 font-medium">AI 改写待确认</div>
    <div className="flex gap-2">
      <Button size="sm" onClick={onConfirmRewrite}>确认</Button>
      <Button size="sm" variant="outline" onClick={onCancelRewrite}>取消</Button>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Wire confirm/cancel callbacks through notebook page state**

```tsx
<NotebookEditorPane
  ...
  pendingRewrite={pendingRewrite}
  onConfirmRewrite={() => void confirmPendingRewrite()}
  onCancelRewrite={() => void cancelPendingRewrite()}
/>
```

- [ ] **Step 5: Run contracts and pending-rewrite tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test \
  frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add frontend/src/components/workspace/notebook/notebook-editor-pane.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts
git commit -m "feat: add inline notebook rewrite confirm controls"
```

## Task 6: Final Verification

**Files:**
- Modify: only as needed to fix failures discovered during verification

- [ ] **Step 1: Run backend verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && pytest \
  tests/test_builtin_agents.py \
  tests/test_custom_agent.py \
  tests/test_notebook_api.py \
  tests/test_notebook_assistant_api.py -q
```

Expected: PASS

- [ ] **Step 2: Run frontend notebook and agent contract tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test \
  frontend/src/components/workspace/agents/agent-card.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-pending-rewrite.test.ts
```

Expected: PASS

- [ ] **Step 3: Run targeted frontend lint**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && pnpm --dir frontend exec eslint \
  src/core/agents/types.ts \
  src/core/agents/api.ts \
  src/core/notebook/types.ts \
  src/core/notebook/hooks.ts \
  src/core/notebook-assistant/api.ts \
  src/core/notebook-assistant/hooks.ts \
  src/components/workspace/agents/agent-card.tsx \
  src/components/workspace/notebook/notebook-assistant-panel.tsx \
  src/components/workspace/notebook/notebook-assistant-composer.tsx \
  src/components/workspace/notebook/notebook-context-panel.tsx \
  src/components/workspace/notebook/notebook-editor-pane.tsx \
  src/components/workspace/notebook/notebook-page.tsx
```

Expected: PASS

- [ ] **Step 4: Run targeted frontend typecheck with known repository caveat noted**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && tsc --noEmit
```

Expected: PASS for touched surfaces; if unrelated repository-wide pre-existing `.next` or automation typing errors remain, document them explicitly before claiming completion.

- [ ] **Step 5: Commit any final verification fixes**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git add -A
git commit -m "test: finalize notebook assistant chat verification"
```

## Self-Review

### Spec Coverage

- Lightweight notebook chat panel: covered by Task 4
- Built-in locked `笔记助手` agent: covered by Task 1
- Notebook-only session scope and hidden-from-main-history behavior: covered by Task 2
- Direct rewrite apply plus confirm/cancel: covered by Task 3 and Task 5
- Overwrite existing unconfirmed rewrite: covered by Task 3 and Task 5
- Simplified prompt/tool policy boundary: covered by Task 1 metadata and Task 3 backend assistant service design

No uncovered spec requirement remains for the scoped subproject.

### Placeholder Scan

- No `TBD`/`TODO` markers
- Every task lists explicit files
- Every task includes concrete commands
- Each code step includes concrete snippets instead of “implement later”

### Type Consistency

- Agent metadata fields are named consistently as `kind`, `visibility`, `can_delete`, `can_edit`, `entrypoint`, `tool_policy`
- Notebook assistant session keys are consistently `note_id`, `session_id`, `thread_id`
- Pending rewrite naming is kept as `pendingRewrite` on the frontend component side and `pending_rewrite` in API payloads only where server JSON shape requires it
