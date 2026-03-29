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
    AutomationApproval,
    AutomationAuditEvent,
    AutomationDeliveryMode,
    AutomationJob,
    AutomationJobKind,
    AutomationRun,
    AutomationScheduleKind,
    AutomationSchedulePreset,
    AutomationTemplate,
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
    workflow_steps: list[dict] = Field(default_factory=list)
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


class AutomationTemplateExportResponse(BaseModel):
    manifest: dict
    files: dict = Field(default_factory=dict)


class AutomationJobsListResponse(BaseModel):
    jobs: list[AutomationJob]


class AutomationTemplatesListResponse(BaseModel):
    official: list[AutomationTemplate]
    personal: list[AutomationTemplate]


class AutomationTemplateResponse(BaseModel):
    template: AutomationTemplate


class AutomationRunResponse(BaseModel):
    run: AutomationRun


class AutomationApprovalResponse(BaseModel):
    approval: AutomationApproval


class AutomationApprovalsListResponse(BaseModel):
    approvals: list[AutomationApproval]


class AutomationAuditEventsListResponse(BaseModel):
    audit: list[AutomationAuditEvent]


class AutomationRunsListResponse(BaseModel):
    runs: list[AutomationRun]


class AutomationWebhookDispatchResponse(BaseModel):
    runs: list[AutomationRun]


class AutomationPlatformCapabilitiesResponse(BaseModel):
    webhook_event_versions: list[str]
    plugin_actions: list[str]


class AutomationPlatformConnectorsResponse(BaseModel):
    connectors: list[dict]


class AutomationJobUpdateRequest(BaseModel):
    name: str | None = None
    prompt: str | None = None
    trigger_kind: AutomationTriggerKind | None = None
    trigger_spec: dict = Field(default_factory=dict)
    action_kind: AutomationActionKind | None = None
    action_spec: dict = Field(default_factory=dict)
    workflow_steps: list[dict] = Field(default_factory=list)
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


class AutomationExternalWebhookEventRequest(BaseModel):
    version: str
    event_name: str
    payload: dict = Field(default_factory=dict)


class AutomationWorkflowResumeRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class AutomationTemplateImportRequest(BaseModel):
    manifest: dict
    files: dict = Field(default_factory=dict)


class AutomationTemplateSaveRequest(BaseModel):
    id: str
    name: str
    scope: str
    manifest: dict
    files: dict = Field(default_factory=dict)


class AutomationApprovalRequestCreate(BaseModel):
    actor_id: str
    reason: str = ""


class AutomationApprovalDecisionRequest(BaseModel):
    actor_id: str
    decision: str


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


@router.get("/templates", response_model=AutomationTemplatesListResponse)
def list_automation_templates(service: AutomationService = Depends(get_automation_service)) -> AutomationTemplatesListResponse:
    return AutomationTemplatesListResponse(**service.list_templates())


@router.get("/templates/{template_id}", response_model=AutomationTemplateResponse)
def get_automation_template(template_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationTemplateResponse:
    try:
        template = service.get_template(template_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation template {template_id} not found")
    return AutomationTemplateResponse(template=template)


@router.post("/templates/{template_id}/activate", response_model=AutomationJobResponse, status_code=201)
def activate_automation_template(template_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationJobResponse:
    try:
        job = service.activate_template(template_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation template {template_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AutomationJobResponse(job=job)


@router.post("/webhooks/events", response_model=AutomationWebhookDispatchResponse, status_code=202)
def ingest_automation_webhook_event(
    request: AutomationExternalWebhookEventRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationWebhookDispatchResponse:
    if request.version != "1":
        raise HTTPException(status_code=400, detail="Unsupported webhook event version")
    runs = service.handle_webhook_event(request.event_name, request.payload)
    return AutomationWebhookDispatchResponse(runs=runs)


@router.get("/platform/capabilities", response_model=AutomationPlatformCapabilitiesResponse)
def get_automation_platform_capabilities() -> AutomationPlatformCapabilitiesResponse:
    return AutomationPlatformCapabilitiesResponse(
        webhook_event_versions=["1"],
        plugin_actions=["echo.plugin"],
    )


@router.get("/platform/connectors", response_model=AutomationPlatformConnectorsResponse)
def get_automation_platform_connectors() -> AutomationPlatformConnectorsResponse:
    return AutomationPlatformConnectorsResponse(
        connectors=[
            {
                "id": "generic_webhook",
                "label": "Generic Webhook",
                "status": "available",
            }
        ]
    )


@router.post("/templates", response_model=AutomationTemplate, status_code=201)
def save_automation_template(
    request: AutomationTemplateSaveRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationTemplate:
    return service.save_template(request.model_dump())


@router.post("/jobs", response_model=AutomationJobResponse, status_code=201)
def create_automation_job(
    request: AutomationJobCreateRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationJobResponse:
    return AutomationJobResponse(job=service.create_job(request.model_dump()))


@router.post("/jobs/{job_id}/approvals", response_model=AutomationApprovalResponse, status_code=201)
def request_automation_approval(
    job_id: str,
    request: AutomationApprovalRequestCreate,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationApprovalResponse:
    try:
        approval = service.request_approval(job_id, actor_id=request.actor_id, reason=request.reason)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationApprovalResponse(approval=approval)


@router.post("/approvals/{approval_id}/decision", response_model=AutomationApprovalResponse)
def decide_automation_approval(
    approval_id: str,
    request: AutomationApprovalDecisionRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationApprovalResponse:
    try:
        approval = service.decide_approval(approval_id, actor_id=request.actor_id, decision=request.decision)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Approval {approval_id} not found")
    return AutomationApprovalResponse(approval=approval)


@router.get("/approvals", response_model=AutomationApprovalsListResponse)
def list_automation_approvals(service: AutomationService = Depends(get_automation_service)) -> AutomationApprovalsListResponse:
    return AutomationApprovalsListResponse(approvals=service.list_approvals())


@router.get("/audit", response_model=AutomationAuditEventsListResponse)
def list_automation_audit(service: AutomationService = Depends(get_automation_service)) -> AutomationAuditEventsListResponse:
    return AutomationAuditEventsListResponse(audit=service.list_audit_events())


@router.get("/jobs/{job_id}", response_model=AutomationJobResponse)
def get_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationJobResponse:
    try:
        job = service.get_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationJobResponse(job=job)


@router.get("/jobs/{job_id}/export", response_model=AutomationTemplateExportResponse)
def export_automation_job(job_id: str, service: AutomationService = Depends(get_automation_service)) -> AutomationTemplateExportResponse:
    try:
        payload = service.export_job_package(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Automation job {job_id} not found")
    return AutomationTemplateExportResponse(**payload)


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


@router.post("/jobs/{job_id}/runs/{run_id}/resume", response_model=AutomationRunResponse)
def resume_workflow_run(
    job_id: str,
    run_id: str,
    request: AutomationWorkflowResumeRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationRunResponse:
    try:
        run = service.resume_workflow_run(job_id, run_id, request.payload)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Workflow run {run_id} not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AutomationRunResponse(run=run)


@router.post("/templates/import", response_model=AutomationJobResponse, status_code=201)
def import_automation_template(
    request: AutomationTemplateImportRequest,
    service: AutomationService = Depends(get_automation_service),
) -> AutomationJobResponse:
    try:
        job = service.import_job_package(request.manifest, request.files)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return AutomationJobResponse(job=job)


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
