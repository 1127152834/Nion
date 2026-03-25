# Hermes Deep Memory Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Nion's current lightweight `memory.json` memory with a multi-layer deep memory architecture that supports large-document retrieval, transcript recall, curated long-term memory, procedural self-growth, and optional Hermes/Honcho-style user modeling.

**Architecture:** Split memory into four persistent layers instead of forcing everything into one store. Layer 1 is Hermes-style curated long-term memory in `MEMORY.md` and `USER.md` for durable facts and user preferences. Layer 2 is session and transcript recall backed by SQLite FTS5 for cross-session search and continuity injection. Layer 3 is a document memory index that ingests uploaded and archived files, chunks them, stores chunk metadata, and supports retrieval for large corpora. Layer 4 is growth memory: post-run reflection that distills reusable workflows into skills, proposes durable memory updates, and optionally maintains a higher-order user model. Keep retrieval and growth pipelines separate from prompt-injected curated memory so each layer stays inspectable and governable.

**Tech Stack:** Python 3.12, FastAPI, LangGraph middleware, SQLite FTS5, markitdown, LangChain tools, React, TypeScript

---

**Execution Notes**

- Use `@test-driven-development` and `@verification-before-completion`.
- This plan supersedes `docs/plans/2026-03-24-hermes-memory-replacement.md` when the goal is deep memory rather than only long-term memory replacement.
- Do not treat Hermes `MEMORY.md` and `USER.md` as the whole system. They are only Layer 1.
- Reuse current uploaded-file conversion via `backend/app/gateway/routers/uploads.py` and `backend/packages/harness/nion/utils/file_conversion.py`; do not build a second document parsing pipeline.
- Reuse the current recall archive as the starting point for Layer 2 instead of throwing it away.
- Keep large-document retrieval out of the prompt snapshot. Retrieve on demand, cite hits, and inject only compact summaries.
- Store growth outputs as explicit proposals or generated skills, not hidden prompt mutations.
- If exact Honcho parity is required, add `honcho-ai` only in the dedicated user-model task; do not spread that dependency into earlier tasks.

### Task 1: deep-memory-01-core-contract-and-layout

**Files:**
- Create: `backend/packages/harness/nion/memory_center/__init__.py`
- Create: `backend/packages/harness/nion/memory_center/models.py`
- Create: `backend/packages/harness/nion/memory_center/contracts.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Test: `backend/tests/test_memory_center_paths.py`

**Step 1: Write the failing test**

Create `backend/tests/test_memory_center_paths.py`:

```python
from nion.config.paths import Paths


def test_memory_center_paths_include_all_layers(tmp_path):
    paths = Paths(tmp_path)

    assert paths.hermes_memory_dir == tmp_path / "memories"
    assert paths.session_archive_db_file == tmp_path / "session_archive.sqlite3"
    assert paths.document_memory_db_file == tmp_path / "document_memory.sqlite3"
    assert paths.growth_db_file == tmp_path / "growth.sqlite3"
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_center_paths.py -q`
Expected: `FAIL` because the new path properties do not exist

**Step 3: Write minimal implementation**

Create `backend/packages/harness/nion/memory_center/contracts.py`:

```python
from enum import Enum


class MemoryLayer(str, Enum):
    CURATED = "curated"
    SESSION = "session"
    DOCUMENT = "document"
    GROWTH = "growth"
```

Update `backend/packages/harness/nion/config/paths.py`:

```python
    @property
    def hermes_memory_dir(self) -> Path:
        return self.base_dir / "memories"

    @property
    def session_archive_db_file(self) -> Path:
        return self.base_dir / "session_archive.sqlite3"

    @property
    def document_memory_db_file(self) -> Path:
        return self.base_dir / "document_memory.sqlite3"

    @property
    def growth_db_file(self) -> Path:
        return self.base_dir / "growth.sqlite3"
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_center_paths.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-01.commit <<'EOF'
Define the storage layout for the deep memory architecture

Constraint: Each memory layer needs its own inspectable persistence boundary
Rejected: Keep one shared memory store for all semantics | retrieval, recall, and growth have incompatible shapes
Confidence: high
Scope-risk: narrow
Directive: Do not collapse document memory or growth state into curated prompt memory
Tested: uv run pytest tests/test_memory_center_paths.py -q
EOF
git add backend/packages/harness/nion/memory_center backend/packages/harness/nion/config/paths.py backend/tests/test_memory_center_paths.py
git commit -F /tmp/deep-memory-01.commit
```

### Task 2: deep-memory-02-curated-memory-layer

**Files:**
- Create: `backend/packages/harness/nion/hermes_memory/__init__.py`
- Create: `backend/packages/harness/nion/hermes_memory/store.py`
- Create: `backend/packages/harness/nion/hermes_memory/migration.py`
- Create: `backend/packages/harness/nion/tools/builtins/memory_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Delete: `backend/packages/harness/nion/agents/memory/__init__.py`
- Delete: `backend/packages/harness/nion/agents/memory/prompt.py`
- Delete: `backend/packages/harness/nion/agents/memory/queue.py`
- Delete: `backend/packages/harness/nion/agents/memory/updater.py`
- Delete: `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
- Test: `backend/tests/test_hermes_memory_store.py`
- Test: `backend/tests/test_memory_tool.py`
- Test: `backend/tests/test_hermes_memory_prompt.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_hermes_memory_store.py`:

```python
from nion.hermes_memory.store import HermesMemoryStore


def test_store_persists_curated_entries_and_snapshot(tmp_path):
    store = HermesMemoryStore(memory_dir=tmp_path / "memories")
    assert store.add(target="memory", content="Use uv run pytest inside backend/.")["success"] is True
    assert store.add(target="user", content="User prefers concise Chinese replies.")["success"] is True

    reloaded = HermesMemoryStore(memory_dir=tmp_path / "memories")
    reloaded.load_from_disk()
    snapshot = reloaded.get_system_prompt_snapshot()

    assert "uv run pytest" in snapshot["memory"]
    assert "concise Chinese replies" in snapshot["user"]
```

Create `backend/tests/test_memory_tool.py`:

```python
from nion.tools.builtins.memory_tool import memory_tool


def test_memory_tool_adds_reads_and_replaces_entries(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    assert "Entry added" in memory_tool(action="add", target="user", content="User prefers direct answers.")
    assert "direct answers" in memory_tool(action="read", target="user")
    assert "Entry replaced" in memory_tool(
        action="replace",
        target="user",
        old_text="direct",
        content="User prefers direct Chinese answers.",
    )
```

Create `backend/tests/test_hermes_memory_prompt.py`:

```python
from nion.agents.lead_agent.prompt import _get_memory_context


def test_prompt_reads_curated_memory_snapshot(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    memories = tmp_path / "memories"
    memories.mkdir(parents=True)
    (memories / "MEMORY.md").write_text("§\nUse uv in backend worktrees.\n", encoding="utf-8")
    (memories / "USER.md").write_text("§\nUser prefers Chinese.\n", encoding="utf-8")

    content = _get_memory_context()

    assert "<memory>" in content
    assert "Use uv in backend worktrees." in content
    assert "User prefers Chinese." in content
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py -q`
Expected: `FAIL` with missing Hermes memory modules and old structured-memory behavior

**Step 3: Write minimal implementation**

Create `backend/packages/harness/nion/hermes_memory/store.py` with Hermes-style bounded curated memory:

```python
class HermesMemoryStore:
    def __init__(self, memory_dir: Path, memory_char_limit: int = 2200, user_char_limit: int = 1375):
        ...

    def load_from_disk(self) -> None:
        ...

    def get_system_prompt_snapshot(self) -> dict[str, str]:
        ...

    def add(self, target: str, content: str) -> dict[str, object]:
        ...

    def replace(self, target: str, old_text: str, new_content: str) -> dict[str, object]:
        ...

    def remove(self, target: str, text: str) -> dict[str, object]:
        ...

    def read(self, target: str) -> dict[str, object]:
        ...
```

Create `backend/packages/harness/nion/tools/builtins/memory_tool.py`:

```python
@tool("memory", parse_docstring=True)
def memory_tool(
    action: Literal["add", "replace", "remove", "read"],
    target: Literal["memory", "user"],
    content: str | None = None,
    old_text: str | None = None,
) -> str:
    ...
```

Update `backend/packages/harness/nion/agents/lead_agent/prompt.py` so `_get_memory_context()` loads only the frozen curated snapshot, and remove `MemoryMiddleware` from `backend/packages/harness/nion/agents/lead_agent/agent.py`.

**Step 4: Run tests to verify they pass**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-02.commit <<'EOF'
Replace structured memory.json with Hermes-style curated long-term memory

Constraint: Prompt-injected long-term memory must be compact, inspectable, and durable
Rejected: Keep background LLM summarization for long-term memory | too opaque and still too lightweight for the larger architecture
Confidence: high
Scope-risk: broad
Directive: Curated memory is only Layer 1 and must not absorb transcript or document retrieval concerns
Tested: uv run pytest tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py -q
EOF
git add backend/packages/harness/nion/hermes_memory backend/packages/harness/nion/tools/builtins/memory_tool.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/packages/harness/nion/agents/lead_agent/prompt.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/tests/test_hermes_memory_store.py backend/tests/test_memory_tool.py backend/tests/test_hermes_memory_prompt.py
git rm backend/packages/harness/nion/agents/memory/__init__.py backend/packages/harness/nion/agents/memory/prompt.py backend/packages/harness/nion/agents/memory/queue.py backend/packages/harness/nion/agents/memory/updater.py backend/packages/harness/nion/agents/middlewares/memory_middleware.py
git commit -F /tmp/deep-memory-02.commit
```

### Task 3: deep-memory-03-session-archive-and-search

**Files:**
- Modify: `backend/packages/harness/nion/recall/local_archive.py`
- Create: `backend/packages/harness/nion/tools/builtins/session_search_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py`
- Test: `backend/tests/test_local_archive.py`
- Test: `backend/tests/test_session_search_tool.py`
- Test: `backend/tests/test_recall_capture_middleware.py`
- Test: `backend/tests/test_recall_router.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_session_search_tool.py`:

```python
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn
from nion.tools.builtins.session_search_tool import session_search_tool


def test_session_search_tool_returns_ranked_hits(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    archive = LocalRecallArchive(tmp_path / "session_archive.sqlite3")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(role="human", content="Deploy the staging worker", source_message_id="h1"),
            RecallTurn(role="ai", content="We fixed staging by rotating the token.", source_message_id="a1"),
        ],
    )

    result = session_search_tool(query="rotating token", limit=3)

    assert "thread-1" in result
    assert "rotating the token" in result
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_local_archive.py tests/test_session_search_tool.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q`
Expected: `FAIL` because `session_search_tool.py` does not exist and the archive still uses `recall.sqlite3`

**Step 3: Write minimal implementation**

Rename the effective database target from `recall_db_file` to the new session-archive path while keeping compatibility shims if needed:

```python
archive = LocalRecallArchive(get_paths().session_archive_db_file)
```

Create `backend/packages/harness/nion/tools/builtins/session_search_tool.py`:

```python
@tool("session_search", parse_docstring=True)
def session_search_tool(query: str, thread_id: str | None = None, limit: int = 5) -> str:
    ...
```

Update `continuity_middleware.py` so continuity injection uses the same archive but remains thread-scoped.

**Step 4: Run tests to verify they pass**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_local_archive.py tests/test_session_search_tool.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-03.commit <<'EOF'
Promote recall into an explicit session-search memory layer

Constraint: Transcript recall must stay searchable without polluting curated prompt memory
Rejected: Fold session search into MEMORY.md | impossible to scale and loses chronology
Confidence: high
Scope-risk: moderate
Directive: Continuity injection stays thread-scoped even when session_search is global
Tested: uv run pytest tests/test_local_archive.py tests/test_session_search_tool.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q
EOF
git add backend/packages/harness/nion/recall/local_archive.py backend/packages/harness/nion/tools/builtins/session_search_tool.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/packages/harness/nion/agents/middlewares/continuity_middleware.py backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py backend/tests/test_local_archive.py backend/tests/test_session_search_tool.py backend/tests/test_recall_capture_middleware.py backend/tests/test_recall_router.py
git commit -F /tmp/deep-memory-03.commit
```

### Task 4: deep-memory-04-document-memory-index

**Files:**
- Create: `backend/packages/harness/nion/document_memory/__init__.py`
- Create: `backend/packages/harness/nion/document_memory/models.py`
- Create: `backend/packages/harness/nion/document_memory/chunker.py`
- Create: `backend/packages/harness/nion/document_memory/store.py`
- Create: `backend/packages/harness/nion/document_memory/ingest.py`
- Create: `backend/packages/harness/nion/document_memory/retriever.py`
- Create: `backend/packages/harness/nion/tools/builtins/document_memory_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/app/gateway/routers/uploads.py`
- Create: `backend/app/gateway/routers/document_memory.py`
- Modify: `backend/app/gateway/app.py`
- Test: `backend/tests/test_document_memory_store.py`
- Test: `backend/tests/test_document_memory_tool.py`
- Test: `backend/tests/test_document_memory_router.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_document_memory_store.py`:

```python
from nion.document_memory.ingest import ingest_document_text
from nion.document_memory.retriever import retrieve_document_chunks
from nion.document_memory.store import DocumentMemoryStore


def test_ingest_and_retrieve_chunked_document(tmp_path):
    store = DocumentMemoryStore(tmp_path / "document_memory.sqlite3")
    ingest_document_text(
        store=store,
        doc_id="doc-1",
        source_path="/mnt/user-data/uploads/design.md",
        title="Design Notes",
        content="Hermes growth loop stores reusable workflows as skills. " * 40,
    )

    results = retrieve_document_chunks(store=store, query="reusable workflows as skills", limit=3)

    assert len(results) >= 1
    assert results[0].doc_id == "doc-1"
    assert "reusable workflows as skills" in results[0].snippet
```

Create `backend/tests/test_document_memory_tool.py`:

```python
from nion.tools.builtins.document_memory_tool import document_memory_tool


def test_document_memory_tool_searches_indexed_docs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    result = document_memory_tool(
        action="ingest_text",
        doc_id="doc-1",
        title="Arch Notes",
        content="The memory system should separate recall from curated memory. " * 20,
        source_path="/mnt/user-data/uploads/arch.md",
    )
    assert "indexed" in result.lower()

    search = document_memory_tool(action="search", query="separate recall from curated memory", limit=3)
    assert "doc-1" in search
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_document_memory_store.py tests/test_document_memory_tool.py -q`
Expected: `FAIL` because document-memory modules do not exist

**Step 3: Write minimal implementation**

Create `backend/packages/harness/nion/document_memory/store.py` with SQLite FTS5-backed tables:

```python
CREATE TABLE documents (...);
CREATE TABLE document_chunks (...);
CREATE VIRTUAL TABLE document_chunks_fts USING fts5(title, content, content='document_chunks', content_rowid='id');
```

Create `backend/packages/harness/nion/document_memory/ingest.py`:

```python
def ingest_document_text(store: DocumentMemoryStore, doc_id: str, source_path: str, title: str, content: str) -> None:
    chunks = chunk_markdown_text(content, chunk_size=1200, overlap=150)
    store.upsert_document(...)
    store.replace_chunks(doc_id=doc_id, chunks=chunks)
```

Create `backend/packages/harness/nion/tools/builtins/document_memory_tool.py`:

```python
@tool("document_memory", parse_docstring=True)
def document_memory_tool(
    action: Literal["ingest_text", "search", "delete_doc", "get_doc"],
    query: str | None = None,
    doc_id: str | None = None,
    title: str | None = None,
    content: str | None = None,
    source_path: str | None = None,
    limit: int = 5,
) -> str:
    ...
```

Update `backend/app/gateway/routers/uploads.py` so markdown conversions can optionally auto-index into document memory after save.

**Step 4: Run tests to verify they pass**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_document_memory_store.py tests/test_document_memory_tool.py tests/test_document_memory_router.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-04.commit <<'EOF'
Add a dedicated document-memory layer for large-scale document retrieval

Constraint: Large-document retrieval cannot depend on prompt snapshots or hand-curated memory entries
Rejected: Stuff uploaded documents into MEMORY.md | no scale, no ranking, no inspectable chunk structure
Confidence: medium
Scope-risk: broad
Directive: Keep document retrieval on-demand and return cited chunk hits rather than dumping full documents into context
Tested: uv run pytest tests/test_document_memory_store.py tests/test_document_memory_tool.py tests/test_document_memory_router.py -q
EOF
git add backend/packages/harness/nion/document_memory backend/packages/harness/nion/tools/builtins/document_memory_tool.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/app/gateway/routers/uploads.py backend/app/gateway/routers/document_memory.py backend/app/gateway/app.py backend/tests/test_document_memory_store.py backend/tests/test_document_memory_tool.py backend/tests/test_document_memory_router.py
git commit -F /tmp/deep-memory-04.commit
```

### Task 5: deep-memory-05-growth-loop-and-procedural-memory

**Files:**
- Create: `backend/packages/harness/nion/growth/__init__.py`
- Create: `backend/packages/harness/nion/growth/models.py`
- Create: `backend/packages/harness/nion/growth/store.py`
- Create: `backend/packages/harness/nion/growth/reflection.py`
- Create: `backend/packages/harness/nion/growth/skill_writer.py`
- Create: `backend/packages/harness/nion/agents/middlewares/growth_reflection_middleware.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Test: `backend/tests/test_growth_reflection.py`
- Test: `backend/tests/test_growth_reflection_middleware.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_growth_reflection.py`:

```python
from nion.growth.models import ReflectionOutcome
from nion.growth.reflection import distill_growth_outcome


def test_distill_growth_outcome_emits_skill_and_memory_candidates():
    outcome = distill_growth_outcome(
        user_message="Please debug why uploads are not indexed.",
        assistant_message="I fixed the upload indexing bug by reusing markitdown output and reindexing the document store.",
        tool_names=["read_file", "document_memory", "present_files", "task"],
    )

    assert isinstance(outcome, ReflectionOutcome)
    assert any("upload indexing" in proposal.summary for proposal in outcome.skill_proposals)
    assert any("markitdown output" in memory.content for memory in outcome.memory_candidates)
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_growth_reflection.py tests/test_growth_reflection_middleware.py -q`
Expected: `FAIL` because the growth modules do not exist

**Step 3: Write minimal implementation**

Create `backend/packages/harness/nion/growth/models.py`:

```python
class ReflectionOutcome(BaseModel):
    memory_candidates: list[CuratedMemoryCandidate] = Field(default_factory=list)
    skill_proposals: list[SkillProposal] = Field(default_factory=list)
    ignored: bool = False
```

Create `backend/packages/harness/nion/growth/reflection.py`:

```python
def distill_growth_outcome(user_message: str, assistant_message: str, tool_names: list[str]) -> ReflectionOutcome:
    # Heuristic first pass: only create proposals after non-trivial runs.
    ...
```

Create `backend/packages/harness/nion/agents/middlewares/growth_reflection_middleware.py` that watches completed runs and writes proposals into `growth.sqlite3` without silently mutating curated memory or skills.

Update `backend/packages/harness/nion/agents/lead_agent/agent.py` to register `GrowthReflectionMiddleware()` after `RecallCaptureMiddleware()`.

**Step 4: Run tests to verify they pass**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_growth_reflection.py tests/test_growth_reflection_middleware.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-05.commit <<'EOF'
Add a growth loop that turns successful work into reusable memory and skill proposals

Constraint: Self-growth must be inspectable and reversible rather than hidden prompt drift
Rejected: Auto-write skills directly on every long run | too noisy and hard to govern
Confidence: medium
Scope-risk: moderate
Directive: Growth outputs are proposals first; auto-apply only after explicit product approval
Tested: uv run pytest tests/test_growth_reflection.py tests/test_growth_reflection_middleware.py -q
EOF
git add backend/packages/harness/nion/growth backend/packages/harness/nion/agents/middlewares/growth_reflection_middleware.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/tests/test_growth_reflection.py backend/tests/test_growth_reflection_middleware.py
git commit -F /tmp/deep-memory-05.commit
```

### Task 6: deep-memory-06-optional-user-model-layer

**Files:**
- Modify: `backend/packages/harness/pyproject.toml`
- Create: `backend/packages/harness/nion/user_model/__init__.py`
- Create: `backend/packages/harness/nion/user_model/store.py`
- Create: `backend/packages/harness/nion/user_model/service.py`
- Create: `backend/packages/harness/nion/tools/builtins/user_model_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Test: `backend/tests/test_user_model_service.py`

**Step 1: Write the failing test**

Create `backend/tests/test_user_model_service.py`:

```python
from nion.user_model.service import UserModelService


def test_user_model_service_records_stable_preferences(tmp_path):
    service = UserModelService(tmp_path / "growth.sqlite3")
    service.record_observation("user-1", "The user repeatedly rejects verbose answers.")
    profile = service.get_profile("user-1")

    assert "verbose answers" in profile.summary
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_user_model_service.py -q`
Expected: `FAIL` because the user-model service does not exist

**Step 3: Write minimal implementation**

If you want exact Hermes/Honcho-style higher-order modeling, add the dependency explicitly:

```toml
"honcho-ai>=2.0.1",
```

Then create a narrow adapter:

```python
class UserModelService:
    def __init__(self, path: Path):
        ...

    def record_observation(self, user_id: str, observation: str) -> None:
        ...

    def get_profile(self, user_id: str):
        ...
```

If dependency approval is not granted, implement the same API with a local fallback summary store and stop there.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_user_model_service.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-06.commit <<'EOF'
Add an optional user-model layer for higher-order personalization

Constraint: Higher-order user modeling must remain optional and isolated from core retrieval layers
Rejected: Blend the user model directly into curated memory entries | loses provenance and makes corrections difficult
Confidence: medium
Scope-risk: moderate
Directive: Keep the user-model interface stable even if the backend swaps between local and Honcho-powered implementations
Tested: uv run pytest tests/test_user_model_service.py -q
EOF
git add backend/packages/harness/pyproject.toml backend/packages/harness/nion/user_model backend/packages/harness/nion/tools/builtins/user_model_tool.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/tests/test_user_model_service.py
git commit -F /tmp/deep-memory-06.commit
```

### Task 7: deep-memory-07-api-frontend-and-docs

**Files:**
- Modify: `backend/app/gateway/routers/memory.py`
- Create: `backend/app/gateway/routers/document_memory.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/app/channels/manager.py`
- Modify: `frontend/src/core/memory/types.ts`
- Modify: `frontend/src/core/memory/api.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `config.example.yaml`

**Step 1: Write the failing expectation**

Add this expected API shape to the branch notes:

```text
GET /api/memory returns layer metadata, curated memory payload, and pointers to session/document/growth surfaces.
GET /api/document-memory/search returns ranked chunk hits.
The settings page shows four layers: curated memory, transcript recall, document memory, growth proposals.
```

**Step 2: Run current verification to confirm the old surface is inadequate**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion && rg -n "memory.json|max_facts|fact_confidence_threshold|OpenViking 单栈记忆|structured memory" README.md backend frontend config.example.yaml`
Expected: legacy matches still exist

**Step 3: Write minimal implementation**

Retarget `/api/memory` to a layered response:

```python
class DeepMemoryStatusResponse(BaseModel):
    curated: dict
    sessionArchive: dict
    documentMemory: dict
    growth: dict
```

Rewrite `frontend/src/components/workspace/settings/memory-settings-page.tsx` so it no longer renders legacy `user/history/facts` sections. Instead render:

```tsx
1. Curated Memory
2. Session Recall
3. Document Memory
4. Growth Proposals
```

Update docs and config to describe the new layered architecture and remove claims that a single `memory.json` file is the long-term memory system.

**Step 4: Run final verification**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_center_paths.py tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py tests/test_local_archive.py tests/test_session_search_tool.py tests/test_recall_capture_middleware.py tests/test_recall_router.py tests/test_document_memory_store.py tests/test_document_memory_tool.py tests/test_document_memory_router.py tests/test_growth_reflection.py tests/test_growth_reflection_middleware.py tests/test_user_model_service.py -q`
Expected: `PASS`

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm check`
Expected: `PASS`

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion && rg -n "memory.json|max_facts|fact_confidence_threshold|debounce_seconds|structured memory" README.md backend frontend config.example.yaml`
Expected: no stale matches describing the active architecture

**Step 5: Commit**

```bash
cat >/tmp/deep-memory-07.commit <<'EOF'
Expose the deep memory architecture across API, UI, and docs

Constraint: The product surface must describe the layered system the code actually implements
Rejected: Leave the old single-memory page in place and hide new layers elsewhere | guarantees operator confusion
Confidence: medium
Scope-risk: broad
Directive: Keep retrieval and growth layers visible so users can debug why the agent remembered or found something
Tested: uv run pytest tests/test_memory_center_paths.py tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py tests/test_local_archive.py tests/test_session_search_tool.py tests/test_recall_capture_middleware.py tests/test_recall_router.py tests/test_document_memory_store.py tests/test_document_memory_tool.py tests/test_document_memory_router.py tests/test_growth_reflection.py tests/test_growth_reflection_middleware.py tests/test_user_model_service.py -q; cd frontend && pnpm check
EOF
git add backend/app/gateway/routers/memory.py backend/app/gateway/routers/document_memory.py backend/app/gateway/app.py backend/packages/harness/nion/client.py backend/app/channels/manager.py frontend/src/core/memory/types.ts frontend/src/core/memory/api.ts frontend/src/components/workspace/settings/memory-settings-page.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts README.md backend/README.md backend/CLAUDE.md config.example.yaml
git commit -F /tmp/deep-memory-07.commit
```

