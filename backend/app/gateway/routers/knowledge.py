from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from nion.knowledge.compile_jobs import KnowledgeCompileJobStore
from nion.knowledge.models import KnowledgeCompileJob, KnowledgePage, KnowledgeSourceCandidate
from nion.knowledge.graph_service import KnowledgeGraphService
from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.query_service import KnowledgeQueryResult, KnowledgeQueryService
from nion.knowledge.revision_service import KnowledgeRevisionRequest, KnowledgeRevisionService
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.notebook.service import NotebookService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class KnowledgeQueueApprovalRequest(BaseModel):
    source_ids: list[str]


class KnowledgeRevisionCreateRequest(BaseModel):
    page_id: str
    request_type: str
    instruction: str
    optional_source_refs: list[str] = []


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


@router.get("/query", response_model=KnowledgeQueryResult)
async def query_knowledge(question: str = Query(..., min_length=1)) -> KnowledgeQueryResult:
    service = KnowledgeQueryService()
    return service.answer(question)


@router.post("/graph/rebuild")
async def rebuild_knowledge_graph() -> dict[str, list[dict[str, object]]]:
    service = KnowledgeGraphService()
    return service.build_graph()


@router.post("/revisions", response_model=KnowledgeRevisionRequest)
async def create_knowledge_revision(
    payload: KnowledgeRevisionCreateRequest,
) -> KnowledgeRevisionRequest:
    service = KnowledgeRevisionService()
    return service.create_request(
        page_id=payload.page_id,
        request_type=payload.request_type,
        instruction=payload.instruction,
        optional_source_refs=payload.optional_source_refs,
    )


@router.post("/revisions/{request_id}/preview", response_model=KnowledgeRevisionRequest)
async def preview_knowledge_revision(request_id: str) -> KnowledgeRevisionRequest:
    service = KnowledgeRevisionService()
    try:
        return service.mark_previewed(request_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/revisions/{request_id}/close", response_model=KnowledgeRevisionRequest)
async def close_knowledge_revision(request_id: str) -> KnowledgeRevisionRequest:
    service = KnowledgeRevisionService()
    try:
        return service.close_request(request_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/pages/{page_id}", response_model=KnowledgePage)
async def get_knowledge_page(page_id: str) -> KnowledgePage:
    store = KnowledgePageStore()
    try:
        return store.read_page(page_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
