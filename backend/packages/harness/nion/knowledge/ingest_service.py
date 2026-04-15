from __future__ import annotations

from pathlib import Path

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.service import NotebookService


class KnowledgeIngestService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._base_dir = base_dir
        self._candidate_store = KnowledgeSourceCandidateStore(base_dir=base_dir)
        self._page_store = KnowledgePageStore(base_dir=base_dir)

    def ingest_sources(
        self,
        source_ids: list[str],
        *,
        activity_store: object | None = None,
        job_id: str | None = None,
    ) -> dict[str, list[str]]:
        notebook = NotebookService(base_dir=self._base_dir)
        candidates = {
            candidate.source_id: candidate
            for candidate in self._candidate_store.refresh_from_notebook(notebook)
        }
        created_pages: list[str] = []
        created_page_ids: list[str] = []
        for source_id in source_ids:
            candidate = candidates[source_id]
            body = f"## Summary\n{candidate.summary or candidate.title}\n"
            page_id = f"sources:{candidate.source_id.split(':')[-1]}"
            page = self._page_store.write_page(
                page_id=page_id,
                page_type="source",
                title=candidate.title,
                body=body,
                sources=[candidate.source_id],
                compiled_from=[
                    {
                        "source_id": candidate.source_id,
                        "content_hash": candidate.content_hash,
                    }
                ],
                last_compiled_at=candidate.updated_at,
            )
            self._candidate_store.mark_compiled(
                candidate.source_id,
                compiled_at=candidate.updated_at,
            )
            created_pages.append(page.relative_path)
            created_page_ids.append(page.page_id)
            if activity_store is not None and hasattr(activity_store, "record_event"):
                activity_store.record_event(
                    event_type="page_created",
                    source_id=candidate.source_id,
                    page_id=page.page_id,
                    job_id=job_id,
                    detail=f"page_created:{page.page_id}",
                )
        return {
            "created_pages": created_pages,
            "created_page_ids": created_page_ids,
            "updated_pages": [],
            "stale_pages": [],
            "archived_pages": [],
        }
