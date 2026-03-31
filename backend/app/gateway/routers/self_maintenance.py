from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from nion.self_maintenance.service import SelfMaintenanceService
from nion.self_maintenance.store import SelfMaintenanceStore

router = APIRouter(prefix="/api/self-maintenance", tags=["self-maintenance"])


class SelfMaintenanceRunRequest(BaseModel):
    query: str


class SelfMaintenanceRunResponse(BaseModel):
    entry: dict
    entry_path: str
    memory_update_proposals: list[str] = Field(default_factory=list)
    prune_proposals: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    self_upgrade_proposals: list[str] = Field(default_factory=list)


class SelfMaintenanceStatusResponse(BaseModel):
    running: bool
    last_run_at: str | None = None
    last_run_status: str | None = None
    last_run_summary: str | None = None
    session_count_since_last_run: int
    next_eligibility_hint: str


class SelfMaintenanceLogResponse(BaseModel):
    trigger: str
    status: str
    summary: str
    started_at: str
    completed_at: str | None = None
    memory_update_proposals: list[str] = Field(default_factory=list)
    prune_proposals: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    self_upgrade_proposals: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    entry_path: str | None = None


class SelfMaintenanceLogsResponse(BaseModel):
    items: list[SelfMaintenanceLogResponse] = Field(default_factory=list)


@router.post("/run", response_model=SelfMaintenanceRunResponse)
async def run_self_maintenance(
    payload: SelfMaintenanceRunRequest,
) -> SelfMaintenanceRunResponse:
    result = SelfMaintenanceService().run(trigger="manual", query=payload.query)
    return SelfMaintenanceRunResponse(
        entry=result.entry.model_dump(),
        entry_path=result.entry_path,
        memory_update_proposals=result.memory_update_proposals,
        prune_proposals=result.prune_proposals,
        action_proposals=result.action_proposals,
        self_upgrade_proposals=result.self_upgrade_proposals,
    )


@router.get("/status", response_model=SelfMaintenanceStatusResponse)
async def get_self_maintenance_status(
    request: Request,
) -> SelfMaintenanceStatusResponse:
    daemon_service = getattr(request.app.state, "daemon_service", None)
    if daemon_service is None:
        return SelfMaintenanceStatusResponse(
            running=False,
            last_run_at=None,
            last_run_status=None,
            last_run_summary=None,
            session_count_since_last_run=0,
            next_eligibility_hint=(
                "Reflective self-maintenance scheduler is not attached to this runtime surface."
            ),
        )
    return SelfMaintenanceStatusResponse.model_validate(
        daemon_service.self_maintenance_status()
    )


@router.get("/logs", response_model=SelfMaintenanceLogsResponse)
async def get_self_maintenance_logs(
    limit: int = 50,
    offset: int = 0,
) -> SelfMaintenanceLogsResponse:
    items = SelfMaintenanceStore().list_logs(limit=limit, offset=offset)
    return SelfMaintenanceLogsResponse(
        items=[SelfMaintenanceLogResponse.model_validate(item.model_dump()) for item in items]
    )


@router.delete("/logs")
async def clear_self_maintenance_logs() -> dict[str, bool]:
    SelfMaintenanceStore().delete_logs()
    return {"ok": True}
