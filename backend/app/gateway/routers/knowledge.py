from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.knowledge.compile_jobs import KnowledgeCompileJobStore
from nion.knowledge.models import KnowledgeCompileJob, KnowledgePage, KnowledgeSourceCandidate
from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.service import NotebookService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class KnowledgeQueueApprovalRequest(BaseModel):
    source_ids: list[str]


@router.get("/queue", response_model=list[KnowledgeSourceCandidate])
async def get_knowledge_queue() -> list[KnowledgeSourceCandidate]:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    return store.refresh_from_notebook(notebook)


@router.post("/queue/approve", response_model=KnowledgeCompileJob)
async def approve_knowledge_queue(payload: KnowledgeQueueApprovalRequest) -> KnowledgeCompileJob:
    store = KnowledgeSourceCandidateStore()
    for source_id in payload.source_ids:
        store.set_status(source_id, status="approved")
    job_store = KnowledgeCompileJobStore()
    return job_store.create_job(source_ids=payload.source_ids, trigger_mode="queue_approval")


@router.get("/pages/{page_id}", response_model=KnowledgePage)
async def get_knowledge_page(page_id: str) -> KnowledgePage:
    store = KnowledgePageStore()
    try:
        return store.read_page(page_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
