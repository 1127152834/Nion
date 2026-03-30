from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.heartbeat.service import HeartbeatService

router = APIRouter(prefix="/api/heartbeat", tags=["heartbeat"])


class HeartbeatStatusResponse(BaseModel):
    running: bool
    last_tick_at: str | None = None
    last_tick_status: str | None = None
    last_tick_summary: str | None = None
    session_count_since_last_tick: int


class HeartbeatLogResponse(BaseModel):
    bot_id: str
    status: str
    summary: str
    started_at: str
    finished_at: str | None = None
    details: dict[str, object] = Field(default_factory=dict)


class HeartbeatLogsResponse(BaseModel):
    items: list[HeartbeatLogResponse] = Field(default_factory=list)


@router.get("/status", response_model=HeartbeatStatusResponse)
async def get_heartbeat_status() -> HeartbeatStatusResponse:
    return HeartbeatStatusResponse.model_validate(HeartbeatService().status())


@router.get("/logs", response_model=HeartbeatLogsResponse)
async def get_heartbeat_logs(limit: int = 50, offset: int = 0) -> HeartbeatLogsResponse:
    items = HeartbeatService().list_logs(limit=limit, offset=offset)
    return HeartbeatLogsResponse(
        items=[HeartbeatLogResponse.model_validate(item.model_dump()) for item in items]
    )


@router.delete("/logs")
async def clear_heartbeat_logs() -> dict[str, bool]:
    HeartbeatService().delete_logs()
    return {"ok": True}
