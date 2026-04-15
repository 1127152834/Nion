from nion.config.paths import reset_paths
from nion.knowledge.activity_store import KnowledgeActivityStore
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
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
