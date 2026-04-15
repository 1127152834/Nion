from nion.config.paths import reset_paths
from nion.knowledge.reconciliation_service import ReconciliationService
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.history import NotebookHistoryService
from nion.notebook.service import NotebookService


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
    notebook.update_note(
        note_id=note.note_id,
        body="v2",
        expected_content_hash=notebook.read_note(note.note_id).content_hash,
    )
    result = ReconciliationService(base_dir=tmp_path).run(notebook)
    candidate = store.get_candidate(f"source:notebook_note:{note.note_id}")

    assert result.restored_source_ids
    assert candidate.status == "stale"
