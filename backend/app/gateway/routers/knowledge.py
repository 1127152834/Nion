from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from nion.knowledge.compile_jobs import KnowledgeCompileJobStore
from nion.knowledge.ingest_service import KnowledgeIngestService
from nion.knowledge.models import KnowledgeCompileJob, KnowledgePage, KnowledgeSourceCandidate
from nion.knowledge.graph_service import KnowledgeGraphService
from nion.knowledge.lint_service import KnowledgeLintService
from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.query_service import KnowledgeQueryResult, KnowledgeQueryService
from nion.knowledge.revision_service import KnowledgeRevisionRequest, KnowledgeRevisionService
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.memory_os.clock import utcnow_z
from nion.notebook.service import NotebookService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class KnowledgeQueueApprovalRequest(BaseModel):
    source_ids: list[str]


class KnowledgeJobListResponse(BaseModel):
    jobs: list[KnowledgeCompileJob]


class KnowledgeRevisionCreateRequest(BaseModel):
    page_id: str
    request_type: str
    instruction: str
    optional_source_refs: list[str] = []


class KnowledgeSynthesisCreateRequest(BaseModel):
    question: str
    answer_markdown: str


@router.get("/queue", response_model=list[KnowledgeSourceCandidate])
async def get_knowledge_queue() -> list[KnowledgeSourceCandidate]:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    return store.refresh_from_notebook(notebook)


@router.get("/jobs", response_model=KnowledgeJobListResponse)
async def get_knowledge_jobs() -> KnowledgeJobListResponse:
    return KnowledgeJobListResponse(jobs=KnowledgeCompileJobStore().list_jobs())


@router.post("/queue/approve", response_model=KnowledgeCompileJob)
async def approve_knowledge_queue(payload: KnowledgeQueueApprovalRequest) -> KnowledgeCompileJob:
    store = KnowledgeSourceCandidateStore()
    for source_id in payload.source_ids:
        store.set_status(source_id, status="approved")
    job_store = KnowledgeCompileJobStore()
    job = job_store.create_job(source_ids=payload.source_ids, trigger_mode="queue_approval")
    started_at = utcnow_z()
    job_store.update_job(
        job.job_id,
        status="running",
        outputs=job.outputs,
        started_at=started_at,
    )
    try:
        outputs = KnowledgeIngestService().ingest_sources(payload.source_ids)
        return job_store.update_job(
            job.job_id,
            status="succeeded",
            outputs={**job.outputs, **outputs},
            finished_at=utcnow_z(),
        )
    except Exception as exc:
        for source_id in payload.source_ids:
            store.set_status(source_id, status="failed", compile_error=str(exc))
        return job_store.update_job(
            job.job_id,
            status="failed",
            outputs=job.outputs,
            finished_at=utcnow_z(),
            error_summary=str(exc),
        )


@router.get("/query", response_model=KnowledgeQueryResult)
async def query_knowledge(question: str = Query(..., min_length=1)) -> KnowledgeQueryResult:
    service = KnowledgeQueryService()
    return service.answer(question)


@router.post("/graph/rebuild")
async def rebuild_knowledge_graph() -> dict[str, list[dict[str, object]]]:
    service = KnowledgeGraphService()
    return service.build_graph()


@router.get("/lint")
async def lint_knowledge() -> dict[str, list[dict[str, object]]]:
    service = KnowledgeLintService()
    return service.run()


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


@router.post("/syntheses", response_model=KnowledgePage)
async def create_knowledge_synthesis(payload: KnowledgeSynthesisCreateRequest) -> KnowledgePage:
    store = KnowledgePageStore()
    page_id = f"synthesis:{payload.question.lower().replace(' ', '-')[:64]}"
    return store.write_page(
        page_id=page_id,
        page_type="synthesis",
        title=payload.question,
        body=payload.answer_markdown,
        sources=[],
        compiled_from=[],
        last_compiled_at="2026-04-13T00:00:00Z",
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


@router.post("/revisions/{request_id}/apply", response_model=KnowledgeRevisionRequest)
async def apply_knowledge_revision(request_id: str) -> KnowledgeRevisionRequest:
    service = KnowledgeRevisionService()
    try:
        return service.apply_request(request_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/pages/{page_id}", response_model=KnowledgePage)
async def get_knowledge_page(page_id: str) -> KnowledgePage:
    store = KnowledgePageStore()
    try:
        return store.read_page(page_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
