from nion.notebook.service import NotebookService
from nion.openviking.notebook_ingest import EmbeddedNotebookIngestService
from nion.openviking.autodream_service import AutoDreamService


def test_autodream_service_writes_journal_and_returns_proposals(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    notebook.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="# Roadmap\n\nAlpha launch depends on onboarding quality.",
    )
    EmbeddedNotebookIngestService(base_dir=tmp_path).reindex_all()

    service = AutoDreamService(base_dir=tmp_path)
    result = service.run(query="onboarding quality", manual=True)

    assert result.entry.summary
    assert result.entry_path.exists()
    assert isinstance(result.agent_memory_updates, list)
    assert isinstance(result.action_proposals, list)
