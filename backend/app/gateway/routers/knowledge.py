from __future__ import annotations

from fastapi import APIRouter, HTTPException

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.knowledge.models import KnowledgePage, KnowledgeSourceCandidate
from nion.notebook.service import NotebookService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/queue", response_model=list[KnowledgeSourceCandidate])
async def get_knowledge_queue() -> list[KnowledgeSourceCandidate]:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    return store.refresh_from_notebook(notebook)


@router.get("/pages/{page_id}", response_model=KnowledgePage)
async def get_knowledge_page(page_id: str) -> KnowledgePage:
    store = KnowledgePageStore()
    try:
        return store.read_page(page_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
