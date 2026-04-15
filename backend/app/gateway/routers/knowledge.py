from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from nion.knowledge.compile_jobs import KnowledgeCompileJobStore
from nion.knowledge.ingest_service import KnowledgeIngestService
from nion.knowledge.activity_store import KnowledgeActivityStore
from nion.knowledge.models import (
    KnowledgeCompileJob,
    KnowledgePage,
    KnowledgeSourceCandidate,
    KnowledgeSourceReconciliationResult,
)
from nion.knowledge.graph_service import KnowledgeGraphService
from nion.knowledge.lint_service import KnowledgeLintService
from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.query_service import KnowledgeQueryResult, KnowledgeQueryService
from nion.knowledge.reconciliation_service import ReconciliationService
from nion.knowledge.revision_service import KnowledgeRevisionRequest, KnowledgeRevisionService
from nion.knowledge.source_candidates import KnowledgeSourceCandidateStore
from nion.memory_os.clock import utcnow_z
from nion.notebook.service import NotebookService

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class KnowledgeQueueApprovalRequest(BaseModel):
    source_ids: list[str]


class KnowledgeSourceEnqueueRequest(BaseModel):
    source_id: str


class KnowledgeJobListResponse(BaseModel):
    jobs: list[KnowledgeCompileJob]


class NotebookKnowledgeStatus(BaseModel):
    has_knowledge: bool
    tag_label: Literal["知识库"] = "知识库"
    status: Literal["queued", "running", "compiled", "failed", "stale", "source_missing"]
    enqueue_state: Literal["not_enqueued", "enqueued"]
    compile_state: Literal["idle", "pending", "running", "succeeded", "failed"]
    last_job_id: str | None = None
    created_page_ids: list[str] = Field(default_factory=list)
    error_summary: str | None = None


class KnowledgeRevisionCreateRequest(BaseModel):
    page_id: str
    request_type: str
    instruction: str
    optional_source_refs: list[str] = []


class KnowledgeSynthesisCreateRequest(BaseModel):
    question: str
    answer_markdown: str


def _get_candidate_by_source_id(
    store: KnowledgeSourceCandidateStore,
    source_id: str,
) -> KnowledgeSourceCandidate | None:
    for candidate in store.list_candidates():
        if candidate.source_id == source_id:
            return candidate
    return None


def _candidate_from_notebook_source(
    notebook: NotebookService,
    source_id: str,
) -> KnowledgeSourceCandidate | None:
    if source_id.startswith("source:notebook_note:"):
        note_id = source_id.removeprefix("source:notebook_note:")
        try:
            note = notebook.read_note(note_id)
        except FileNotFoundError:
            return None
        return KnowledgeSourceCandidate(
            source_id=source_id,
            source_kind="notebook_note",
            notebook_ref={
                "note_id": note.note_id,
                "relative_path": note.relative_path,
            },
            title=note.title,
            summary=note.body[:280],
            content_hash=note.content_hash,
            status="queued",
            created_at=note.created_at,
            updated_at=note.updated_at,
        )

    if source_id.startswith("source:notebook_asset:"):
        asset_id = source_id.removeprefix("source:notebook_asset:")
        for asset in notebook.list_assets():
            if asset.asset_id == asset_id:
                return KnowledgeSourceCandidate(
                    source_id=source_id,
                    source_kind="notebook_asset",
                    notebook_ref={
                        "asset_id": asset.asset_id,
                        "relative_path": asset.relative_path,
                    },
                    title=asset.title,
                    summary=asset.relative_path,
                    content_hash="",
                    status="queued",
                    created_at=asset.created_at,
                    updated_at=asset.updated_at,
                )
    return None


def _build_bridge_status(
    store: KnowledgeSourceCandidateStore,
    source_id: str,
) -> NotebookKnowledgeStatus:
    candidate = _get_candidate_by_source_id(store, source_id)
    if candidate is None:
        notebook_candidate = _candidate_from_notebook_source(NotebookService(), source_id)
        if notebook_candidate is not None:
            return NotebookKnowledgeStatus(
                has_knowledge=False,
                status="queued",
                enqueue_state="not_enqueued",
                compile_state="idle",
                created_page_ids=[],
            )
        return NotebookKnowledgeStatus(
            has_knowledge=False,
            status="source_missing",
            enqueue_state="not_enqueued",
            compile_state="idle",
            created_page_ids=[],
        )

    last_job = next(
        (job for job in KnowledgeCompileJobStore().list_jobs() if source_id in job.source_ids),
        None,
    )
    compile_state: Literal["idle", "pending", "running", "succeeded", "failed"] = "idle"
    last_job_id: str | None = None
    error_summary: str | None = None
    created_page_ids: list[str] = []

    status: Literal["queued", "running", "compiled", "failed", "stale", "source_missing"] = {
        "compiled": "compiled",
        "failed": "failed",
        "stale": "stale",
        "running": "running",
        "source_missing": "source_missing",
    }.get(candidate.status, "queued")

    if candidate.status == "queued":
        compile_state = "idle"
        error_summary = None
        last_job_id = None
    elif last_job is not None and last_job.status in {"pending", "running"}:
        last_job_id = last_job.job_id
        compile_state = "pending" if last_job.status == "pending" else "running"
        status = "running"
    elif candidate.status == "failed":
        compile_state = "failed"
        error_summary = candidate.compile_error
        last_job_id = last_job.job_id if last_job is not None else None
    elif candidate.status == "compiled":
        compile_state = "succeeded"
        last_job_id = last_job.job_id if last_job is not None else None
        created_page_ids = [f"sources:{source_id.split(':')[-1]}"]
    elif candidate.status == "stale":
        compile_state = "succeeded"
        last_job_id = last_job.job_id if last_job is not None else None

    return NotebookKnowledgeStatus(
        has_knowledge=True,
        status=status,
        enqueue_state="enqueued",
        compile_state=compile_state,
        last_job_id=last_job_id,
        created_page_ids=created_page_ids,
        error_summary=error_summary,
    )


@router.get("/queue", response_model=list[KnowledgeSourceCandidate])
async def get_knowledge_queue() -> list[KnowledgeSourceCandidate]:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    return store.refresh_from_notebook(notebook)


@router.post("/sources/enqueue", response_model=NotebookKnowledgeStatus)
async def enqueue_knowledge_source(payload: KnowledgeSourceEnqueueRequest) -> NotebookKnowledgeStatus:
    notebook = NotebookService()
    store = KnowledgeSourceCandidateStore()
    store.refresh_from_notebook(notebook)
    candidate = _get_candidate_by_source_id(store, payload.source_id)
    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail=f"Knowledge source candidate not found: {payload.source_id}",
        )
    if candidate.status != "compiled":
        KnowledgeActivityStore().record_candidate_enqueued(source_id=payload.source_id)
    return _build_bridge_status(store, payload.source_id)


@router.post("/reconcile", response_model=KnowledgeSourceReconciliationResult)
async def reconcile_knowledge_sources() -> KnowledgeSourceReconciliationResult:
    notebook = NotebookService()
    return ReconciliationService().run(notebook)


@router.get("/sources/{source_id}/status", response_model=NotebookKnowledgeStatus)
async def get_knowledge_source_status(source_id: str) -> NotebookKnowledgeStatus:
    return _build_bridge_status(KnowledgeSourceCandidateStore(), source_id)


@router.get("/jobs", response_model=KnowledgeJobListResponse)
async def get_knowledge_jobs() -> KnowledgeJobListResponse:
    return KnowledgeJobListResponse(jobs=KnowledgeCompileJobStore().list_jobs())


@router.post("/queue/approve", response_model=KnowledgeCompileJob)
async def approve_knowledge_queue(payload: KnowledgeQueueApprovalRequest) -> KnowledgeCompileJob:
    store = KnowledgeSourceCandidateStore()
    job_store = KnowledgeCompileJobStore()
    job = job_store.create_job(source_ids=payload.source_ids, trigger_mode="queue_approval")
    started_at = utcnow_z()
    for source_id in payload.source_ids:
        store.set_status(source_id, status="running", last_job_id=job.job_id, compile_error=None)
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
