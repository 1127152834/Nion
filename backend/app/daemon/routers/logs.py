from __future__ import annotations

from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.daemon.service import LocalDaemonService

router = APIRouter(prefix="/api/daemon", tags=["daemon"])


class EventLogItem(BaseModel):
    event_id: str
    timestamp: str | None = None
    category: str
    level: str
    event_type: str
    actor: str
    message: str
    thread_id: str | None = None
    client_id: str | None = None
    run_id: str | None = None
    tool_name: str | None = None
    skill_name: str | None = None
    duration_ms: int | None = None
    details: dict = Field(default_factory=dict)


class EventLogListResponse(BaseModel):
    events: list[EventLogItem] = Field(default_factory=list)


def get_daemon_service(request: Request) -> LocalDaemonService:
    return request.app.state.daemon_service


def _get_store(service: LocalDaemonService):
    store = service.telemetry_store
    if store is None:
        raise HTTPException(status_code=503, detail="telemetry store unavailable")
    return store


@router.get("/logs", response_model=EventLogListResponse)
async def list_logs(
    request: Request,
    category: str | None = None,
    level: Literal["info", "warning", "error"] | None = None,
    thread_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=500),
) -> EventLogListResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    events = store.list_events(
        limit=limit,
        category=category,
        level=level,
        thread_id=thread_id,
    )
    return EventLogListResponse(events=[EventLogItem(**asdict(event)) for event in events])


@router.get("/logs/tail", response_model=EventLogListResponse)
async def tail_logs(
    request: Request,
    limit: int = Query(default=20, ge=1, le=200),
) -> EventLogListResponse:
    service = get_daemon_service(request)
    store = _get_store(service)
    events = store.list_events(limit=limit)
    return EventLogListResponse(events=[EventLogItem(**asdict(event)) for event in events])
