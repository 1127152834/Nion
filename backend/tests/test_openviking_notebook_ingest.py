from nion.notebook.service import NotebookService
from nion.openviking.notebook_ingest import EmbeddedNotebookIngestService


def test_ingest_service_indexes_visible_notebook_notes(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    note = notebook.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="# Roadmap\n\nAlpha launch depends on onboarding quality.",
    )

    ingest = EmbeddedNotebookIngestService(base_dir=tmp_path)
    result = ingest.reindex_all()

    assert result.notes_indexed == 1
    resource = ingest.resource_store.get_by_note_id(note.note_id)
    assert resource is not None

    hits = ingest.search_notebook("onboarding quality", limit=3)
    assert len(hits) == 1
    assert hits[0].note_id == note.note_id
