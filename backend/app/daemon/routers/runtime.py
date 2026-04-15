from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.daemon.service import LocalDaemonService

router = APIRouter(tags=["daemon"])


class DaemonHealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "nion-local-daemon"


class RuntimeClientCounts(BaseModel):
    total: int = 0
    electron: int = 0
    cli: int = 0
    other: int = 0


class GuardianModeRuntimeInfo(BaseModel):
    enabled: bool
    window_required: bool
    status: str


class BridgeRuntimeInfo(BaseModel):
    available: bool
    running: bool | None = None


class DaemonRuntimeInfoResponse(BaseModel):
    mode: str
    host: str
    port: int
    base_url: str
    health_url: str
    working_directory: str
    allow_background_running: bool
    shutdown_grace_period_seconds: int = Field(ge=1, le=10)
    clients: RuntimeClientCounts = Field(default_factory=RuntimeClientCounts)
    guardian_mode: GuardianModeRuntimeInfo
    bridge_runtime: BridgeRuntimeInfo


def get_daemon_service(request: Request) -> LocalDaemonService:
    return request.app.state.daemon_service


@router.get("/health", response_model=DaemonHealthResponse)
async def get_health() -> DaemonHealthResponse:
    return DaemonHealthResponse()


@router.get("/api/daemon/runtime-info", response_model=DaemonRuntimeInfoResponse)
async def get_runtime_info(request: Request) -> DaemonRuntimeInfoResponse:
    service = get_daemon_service(request)
    return DaemonRuntimeInfoResponse.model_validate(service.runtime_info())
