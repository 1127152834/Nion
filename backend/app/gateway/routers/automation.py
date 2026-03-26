from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from nion.automation.delivery import AutomationChannelDeliveryRequest
from nion.automation.models import (
    AutomationDeliveryMode,
    AutomationJob,
    AutomationJobKind,
    AutomationRun,
    AutomationScheduleKind,
    AutomationSchedulePreset,
)
from nion.automation.service import AutomationService, create_default_automation_service
from nion.config.app_config import get_app_config

router = APIRouter(prefix="/api/automation", tags=["automation"])


class AutomationJobCreateRequest(BaseModel):
    name: str
    prompt: str
    job_kind: AutomationJobKind = "scheduled_task"
    schedule_kind: AutomationScheduleKind | None = None
    schedule_value: str | None = None
    schedule_preset: AutomationSchedulePreset | None = None
    schedule_timezone: str = "UTC"
    schedule_metadata: dict = Field(default_factory=dict)
    enabled: bool = True
    delivery_mode: AutomationDeliveryMode = "local"
    delivery_targets: list[dict] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
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
