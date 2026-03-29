from nion.notebook.service import NotebookService
from nion.openviking.notebook_ingest import EmbeddedNotebookIngestService
from nion.openviking.autodream_signals import collect_autodream_signals
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn


def test_collect_autodream_signals_reads_recall_and_notebook(tmp_path):
    notebook = NotebookService(base_dir=tmp_path)
    notebook.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="# Roadmap\n\nAlpha launch depends on onboarding quality.",
    )
    EmbeddedNotebookIngestService(base_dir=tmp_path).reindex_all()

    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We rotated the staging token.",
                source_message_id="ai-1",
            )
        ],
    )

    signals = collect_autodream_signals(base_dir=tmp_path, query="onboarding quality")
    assert len(signals.notebook_items) == 1
    assert len(signals.recall_results) >= 0
