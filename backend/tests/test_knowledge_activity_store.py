from nion.config.paths import reset_paths
from nion.knowledge.activity_store import KnowledgeActivityStore
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.history import NotebookHistoryService
from nion.notebook.service import NotebookService


def test_activity_store_records_enqueue_and_candidate_state_metadata(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    notebook = NotebookService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Roadmap", body="body")
    source_id = f"source:notebook_note:{note.note_id}"
    store = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    store.refresh_from_notebook(notebook)

    activity = KnowledgeActivityStore(base_dir=tmp_path)
    event = activity.record_candidate_enqueued(source_id=source_id, job_id="job_123")
    candidate = store.get_candidate(source_id)

    assert event.event_type == "candidate_enqueued"
    assert event.job_id == "job_123"
    assert candidate.enqueued_at == event.created_at
    assert candidate.last_job_id == "job_123"


def test_activity_store_lists_reconciliation_restore_and_stale_events(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    notebook = NotebookService(base_dir=tmp_path)
    history = NotebookHistoryService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Roadmap", body="v1")
    source_id = f"source:notebook_note:{note.note_id}"
    candidates = KnowledgeSourceCandidateStore(base_dir=tmp_path)
    candidates.refresh_from_notebook(notebook)
    candidates.mark_compiled(source_id, compiled_at="2026-04-15T00:00:00Z")
    history.delete_note(note.note_id, actor_type="user")
    activity = KnowledgeActivityStore(base_dir=tmp_path)

    activity.record_event(
        event_type="source_restored",
        source_id=source_id,
        detail=f"Source restored for {source_id}",
    )
    activity.record_event(
        event_type="candidate_became_stale",
        source_id=source_id,
        detail=f"Source became stale for {source_id}",
    )

    events = activity.list_events()

    assert [event.event_type for event in events[:2]] == ["candidate_became_stale", "source_restored"]
