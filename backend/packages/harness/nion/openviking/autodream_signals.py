from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field

from nion.config.paths import Paths
from nion.openviking.context_pack import NotebookContextPackItem
from nion.openviking.runtime_retriever import RuntimeNotebookRetriever
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallSearchResult


class AutoDreamSignals(BaseModel):
    notebook_items: list[NotebookContextPackItem] = Field(default_factory=list)
    recall_results: list[RecallSearchResult] = Field(default_factory=list)


def collect_autodream_signals(
    *,
    base_dir: str | Path | None = None,
    query: str,
) -> AutoDreamSignals:
    paths = Paths(base_dir=base_dir)
    notebook = RuntimeNotebookRetriever(base_dir=base_dir).search(query, limit=5)
    recall = LocalRecallArchive(paths.recall_db_file).search_global(query, limit=5)
    return AutoDreamSignals(
        notebook_items=notebook.items,
        recall_results=recall,
    )
