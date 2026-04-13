from nion.config.paths import Paths
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.knowledge.models import KnowledgeSourceCandidate
from nion.notebook.service import NotebookService


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


def test_candidate_refresh_marks_existing_compiled_entry_stale_when_hash_changes(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Inbox Note", body="v1")
    store = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    first = store.refresh_from_notebook(notebook)
    candidate = next(item for item in first if item.notebook_ref.get("note_id") == note.note_id)
    store.mark_compiled(candidate.source_id, compiled_at="2026-04-13T09:00:00Z")

    notebook.update_note(
        note_id=note.note_id,
        body="v2",
        expected_content_hash=note.content_hash,
    )
    second = store.refresh_from_notebook(notebook)
    updated = next(item for item in second if item.source_id == candidate.source_id)

    assert updated.status == "stale"
