from nion.notebook.service import NotebookService
from nion.openviking.notebook_ingest import EmbeddedNotebookIngestService
from nion.openviking.runtime_retriever import RuntimeNotebookRetriever


def test_runtime_retriever_returns_context_pack_items(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    notebook.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="# Roadmap\n\nAlpha launch depends on onboarding quality.",
    )

    ingest = EmbeddedNotebookIngestService(base_dir=tmp_path)
    ingest.reindex_all()

    retriever = RuntimeNotebookRetriever(base_dir=tmp_path)
    result = retriever.search("onboarding quality", limit=3)

    assert len(result.items) == 1
    assert result.items[0].source_relative_path == "projects/alpha/roadmap.md"
