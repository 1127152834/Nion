from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.daemon.service import LocalDaemonService

router = APIRouter(prefix="/api/daemon", tags=["daemon"])


class DiagnosticResponse(BaseModel):
    status: str
    summary: str
    details: dict = Field(default_factory=dict)


def get_daemon_service(request: Request) -> LocalDaemonService:
    return request.app.state.daemon_service


def _get_store(service: LocalDaemonService):
    store = service.telemetry_store
    if store is None:
        raise HTTPException(status_code=503, detail="telemetry store unavailable")
    return store


def _fallback_daemon_diagnostic(service: LocalDaemonService) -> DiagnosticResponse:
    info = service.runtime_info()
    return DiagnosticResponse(
        status="healthy",
        summary="Daemon is running",
        details=info,
    )


@router.get("/diagnostics", response_model=DiagnosticResponse)
async def get_daemon_diagnostics(request: Request) -> DiagnosticResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    try:
        snapshot = store.get_snapshot("daemon", "local")
        return DiagnosticResponse(
            status=snapshot.status,
            summary=snapshot.summary,
            details=snapshot.details,
        )
    except LookupError:
        return _fallback_daemon_diagnostic(service)


@router.get("/diagnostics/threads/{thread_id}", response_model=DiagnosticResponse)
async def get_thread_diagnostics(thread_id: str, request: Request) -> DiagnosticResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    try:
        snapshot = store.get_snapshot("thread", thread_id)
        return DiagnosticResponse(
            status=snapshot.status,
            summary=snapshot.summary,
            details=snapshot.details,
        )
    except LookupError:
        events = store.list_events(limit=20, thread_id=thread_id)
        if not events:
            return DiagnosticResponse(
                status="healthy",
                summary=f"No diagnostics found for thread '{thread_id}'",
                details={"thread_id": thread_id},
            )
        latest = events[0]
        return DiagnosticResponse(
            status="error" if latest.level == "error" else "healthy",
            summary=latest.message,
            details={"thread_id": thread_id, "event_type": latest.event_type},
        )


@router.get("/diagnostics/skills/{skill_name}", response_model=DiagnosticResponse)
async def get_skill_diagnostics(skill_name: str, request: Request) -> DiagnosticResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    try:
        snapshot = store.get_snapshot("skill", skill_name)
        return DiagnosticResponse(
            status=snapshot.status,
            summary=snapshot.summary,
            details=snapshot.details,
        )
    except LookupError:
        events = store.list_events(limit=20, category="skill", skill_name=skill_name)
        if not events:
            return DiagnosticResponse(
                status="healthy",
                summary=f"No diagnostics found for skill '{skill_name}'",
                details={"skill_name": skill_name},
            )
        latest = events[0]
        return DiagnosticResponse(
            status="error" if latest.level == "error" else "healthy",
            summary=latest.message,
            details={"skill_name": skill_name, "event_type": latest.event_type},
        )


@router.get("/diagnostics/tasks/{task_id}", response_model=DiagnosticResponse)
async def get_task_diagnostics(task_id: str, request: Request) -> DiagnosticResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    try:
        snapshot = store.get_snapshot("task", task_id)
        return DiagnosticResponse(
            status=snapshot.status,
            summary=snapshot.summary,
            details=snapshot.details,
        )
    except LookupError:
        events = store.list_events(limit=20, run_id=task_id)
        if not events:
            return DiagnosticResponse(
                status="healthy",
                summary=f"No diagnostics found for task '{task_id}'",
                details={"task_id": task_id},
            )
        latest = events[0]
        return DiagnosticResponse(
            status="error" if latest.level == "error" else "healthy",
            summary=latest.message,
            details={"task_id": task_id, "event_type": latest.event_type},
        )
