from nion.knowledge.ingest_service import KnowledgeIngestService
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.service import NotebookService


def test_ingest_service_writes_source_page_for_notebook_candidate(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    note = notebook.create_note(directory="", title="Roadmap", body="body")
    candidates = KnowledgeSourceCandidateStore(base_dir=tmp_path).refresh_from_notebook(notebook)
    candidate = next(item for item in candidates if item.notebook_ref.get("note_id") == note.note_id)

    service = KnowledgeIngestService(base_dir=tmp_path)
    result = service.ingest_sources([candidate.source_id])

    assert result["created_pages"]
    assert any("sources/" in page for page in result["created_pages"])
