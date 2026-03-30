from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field
from starlette.responses import FileResponse

from nion.automation.delivery import AutomationChannelDeliveryRequest
from nion.automation.event_dispatch import dispatch_automation_event
from nion.automation.models import (
    AutomationActionKind,
    AutomationDeliveryMode,
    AutomationJob,
    AutomationJobKind,
    AutomationRun,
    AutomationScheduleKind,
    AutomationSchedulePreset,
    AutomationTriggerKind,
)
from nion.automation.service import AutomationService, create_default_automation_service
from nion.config.app_config import get_app_config
from nion.config.paths import get_paths
from nion.telemetry.store import TelemetryStore

router = APIRouter(prefix="/api/automation", tags=["automation"])

SAFE_REPLAY_EVENT_TYPES = {
    "thread.started",
    "thread.finished",
    "thread.failed",
    "agent.run.completed",
    "agent.run.failed",
    "clarification.requested",
    "permission.requested",
    "automation.run.failed",
}


class AutomationJobCreateRequest(BaseModel):
    name: str
    prompt: str
    job_kind: AutomationJobKind = "scheduled_task"
    schedule_kind: AutomationScheduleKind | None = None
    schedule_value: str | None = None
    schedule_preset: AutomationSchedulePreset | None = None
    trigger_kind: AutomationTriggerKind | None = None
    trigger_spec: dict = Field(default_factory=dict)
    action_kind: AutomationActionKind | None = None
    action_spec: dict = Field(default_factory=dict)
    schedule_timezone: str = "UTC"
    schedule_metadata: dict = Field(default_factory=dict)
    enabled: bool = True
    delivery_mode: AutomationDeliveryMode = "local"
    delivery_targets: list[dict] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    package_dir: str | None = None
    package_manifest: dict = Field(default_factory=dict)
    package_files: list[dict] = Field(default_factory=list)
    session_policy: dict = Field(default_factory=dict)
    toolset_profile: str | None = None


class AutomationJobResponse(BaseModel):
    job: AutomationJob


class AutomationJobsListResponse(BaseModel):
    jobs: list[AutomationJob]


class AutomationRunResponse(BaseModel):
    run: AutomationRun


class AutomationRunsListResponse(BaseModel):
    runs: list[AutomationRun]


class AutomationJobUpdateRequest(BaseModel):
    name: str | None = None
    prompt: str | None = None
    trigger_kind: AutomationTriggerKind | None = None
    trigger_spec: dict = Field(default_factory=dict)
    action_kind: AutomationActionKind | None = None
    action_spec: dict = Field(default_factory=dict)
    package_files: list[dict] = Field(default_factory=list)
    delete_package_files: list[str] = Field(default_factory=list)


class AutomationStatusResponse(BaseModel):
    scheduler_running: bool
    total_jobs_count: int
    active_jobs_count: int
    paused_jobs_count: int
    error_jobs_count: int
    run_count: int
    failed_runs_count: int = 0
    last_tick_at: str | None = None
    last_success_at: str | None = None


class AutomationEventResponse(BaseModel):
    event_id: str
    timestamp: str | None = None
    category: str
    level: str
    event_type: str
    thread_id: str | None = None
    run_id: str | None = None
    actor: str
    message: str
    details: dict = Field(default_factory=dict)


class AutomationEventsListResponse(BaseModel):
    events: list[AutomationEventResponse]


class AutomationEventDetailResponse(BaseModel):
    event: AutomationEventResponse


class AutomationEventReplayRequest(BaseModel):
    event_name: str
    payload: dict = Field(default_factory=dict)


_automation_service: AutomationService | None = None


class GatewayChannelPublisher:
    def publish(self, request: AutomationChannelDeliveryRequest) -> None:
        del request
        raise RuntimeError("Legacy channel delivery has been removed")


def _resolve_langgraph_url() -> str:
    config = get_app_config()
    extra = config.model_extra or {}
    bridge = extra.get("bridge") if isinstance(extra, dict) else None
    if isinstance(bridge, dict):
        langgraph_url = bridge.get("langgraph_url")
        if isinstance(langgraph_url, str) and langgraph_url.strip():
            return langgraph_url
    return "http://localhost:2024"


def get_automation_service() -> AutomationService:
    global _automation_service
    if _automation_service is None:
        _automation_service = create_default_automation_service(
            langgraph_url=_resolve_langgraph_url(),
            channel_publisher=GatewayChannelPublisher(),
        )
    return _automation_service


def get_telemetry_store() -> TelemetryStore:
    return TelemetryStore(get_paths().telemetry_db_file)


def _resume_now() -> datetime:
    return datetime.now(UTC)


@router.get("/jobs", response_model=AutomationJobsListResponse)
def list_automation_jobs(service: AutomationService = Depends(get_automation_service)) -> AutomationJobsListResponse:
    return AutomationJobsListResponse(jobs=service.list_jobs())


@router.post("/jobs", response_model=AutomationJobResponse, status_code=201)
def create_automation_job(
    request: AutomationJobCreateRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationJobResponse:
    return AutomationJobResponse(job=service.create_job(request.model_dump()))


@router.get("/jobs/{job_id}", response_model=AutomationJobResponse)
def get_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationJobResponse:
    try:
        job = service.get_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationJobResponse(job=job)


@router.patch("/jobs/{job_id}", response_model=AutomationJobResponse)
def update_automation_job(
    job_id: str,
    request: AutomationJobUpdateRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationJobResponse:
    try:
        job = service.update_job(job_id, request.model_dump(exclude_none=True))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationJobResponse(job=job)


@router.post("/jobs/{job_id}/package/files", response_model=AutomationJobResponse)
async def upload_automation_package_files(
    job_id: str,
    files: list[UploadFile] = File(...),
    service: AutomationService = Depends(get_automation_service),
) -> AutomationJobResponse:
    package_files: list[dict] = []
    for file in files:
        if not file.filename:
            continue
        package_files.append(
            {
                "path": file.filename,
                "content_bytes": await file.read(),
            }
        )
    if not package_files:
        raise HTTPException(status_code=400, detail="No package files provided")
    try:
        job = service.update_job(job_id, {"package_files": package_files})
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationJobResponse(job=job)


@router.get("/jobs/{job_id}/package/files/{package_path:path}")
def get_automation_package_file(
    job_id: str,
    package_path: str,
    service: AutomationService = Depends(get_automation_service),
) -> FileResponse:
    try:
        job = service.get_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    if not job.package_dir:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} has no package directory")

    package_dir = Path(job.package_dir).resolve()
    actual = (package_dir / package_path).resolve()
    try:
        actual.relative_to(package_dir)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="Package file traversal is not allowed") from exc
    if not actual.is_file():
        raise HTTPException(status_code=404, detail=f"Package file not found: {package_path}")
    return FileResponse(actual)


@router.post("/jobs/{job_id}/pause", response_model=AutomationJobResponse)
def pause_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationJobResponse:
    try:
        job = service.pause_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationJobResponse(job=job)


@router.post("/jobs/{job_id}/resume", response_model=AutomationJobResponse)
def resume_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationJobResponse:
    try:
        job = service.resume_job(job_id, now=_resume_now())
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationJobResponse(job=job)


@router.post("/jobs/{job_id}/run", response_model=AutomationRunResponse)
def run_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationRunResponse:
    try:
        run = service.run_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    return AutomationRunResponse(run=run)


@router.delete("/jobs/{job_id}", status_code=204)
def delete_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> Response:
    deleted = service.delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return Response(status_code=204)


@router.get("/runs", response_model=AutomationRunsListResponse)
def list_automation_runs(service: AutomationService = Depends(get_automation_service)) -> AutomationRunsListResponse:
    return AutomationRunsListResponse(runs=service.list_runs())


@router.get("/status", response_model=AutomationStatusResponse)
def get_automation_status(service: AutomationService = Depends(get_automation_service)) -> AutomationStatusResponse:
    return AutomationStatusResponse(**service.get_status())


@router.get("/events", response_model=AutomationEventsListResponse)
def list_automation_events(
    limit: int = 50,
    category: str | None = None,
    event_type: str | None = None,
    store: TelemetryStore = Depends(get_telemetry_store),
) -> AutomationEventsListResponse:
    events = store.list_events(limit=limit, category=category)
    if event_type is not None:
        events = [event for event in events if event.event_type == event_type]
    return AutomationEventsListResponse(
        events=[
            AutomationEventResponse(
                event_id=event.event_id,
                timestamp=event.timestamp,
                category=event.category,
                level=event.level,
                event_type=event.event_type,
                thread_id=event.thread_id,
                run_id=event.run_id,
                actor=event.actor,
                message=event.message,
                details=event.details,
            )
            for event in events
        ]
    )


@router.get("/events/{event_id}", response_model=AutomationEventDetailResponse)
def get_automation_event(
    event_id: str,
    store: TelemetryStore = Depends(get_telemetry_store),
) -> AutomationEventDetailResponse:
    events = store.list_events(limit=500)
    for event in events:
        if event.event_id == event_id:
            return AutomationEventDetailResponse(
                event=AutomationEventResponse(
                    event_id=event.event_id,
                    timestamp=event.timestamp,
                    category=event.category,
                    level=event.level,
                    event_type=event.event_type,
                    thread_id=event.thread_id,
                    run_id=event.run_id,
                    actor=event.actor,
                    message=event.message,
                    details=event.details,
                )
            )
    raise HTTPException(status_code=404, detail=f"Automation event {event_id} not found")


@router.post("/events/replay")
def replay_automation_event(request: AutomationEventReplayRequest) -> dict:
    if request.event_name not in SAFE_REPLAY_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported replay event: {request.event_name}")
    dispatch_automation_event(request.event_name, request.payload)
    return {"ok": True}
