from __future__ import annotations

from pathlib import Path

from nion.knowledge.activity_store import KnowledgeActivityStore
from nion.knowledge.models import KnowledgeSourceReconciliationResult
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.service import NotebookService


class ReconciliationService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._store = KnowledgeSourceCandidateStore(base_dir=base_dir)
        self._activity = KnowledgeActivityStore(base_dir=base_dir)

    def run(self, notebook: NotebookService) -> KnowledgeSourceReconciliationResult:
        return self._store.reconcile_with_notebook(notebook, activity_store=self._activity)
