from __future__ import annotations

from fastapi import APIRouter, Query, Request

from app.channels.repository import ChannelRepository
from app.daemon.routers.diagnostics import DiagnosticResponse
from app.gateway.routers.channels import (
    ChannelAuthorizedUserResponse,
    ChannelPairRequestResponse,
    ChannelPlatform,
    ChannelStatusResponse,
    _build_authorized_user_response,
    _build_pair_request_response,
)

router = APIRouter(prefix="/api/daemon/channels", tags=["daemon"])


def _channel_repo() -> ChannelRepository:
    return ChannelRepository()


def _channel_snapshot(request: Request, name: str) -> DiagnosticResponse | None:
    daemon_service = request.app.state.daemon_service
    store = daemon_service.telemetry_store
    if store is None:
        return None

    try:
        snapshot = store.get_snapshot("channel", name)
    except LookupError:
        return None

    return DiagnosticResponse(
        status=snapshot.status,
        summary=snapshot.summary,
        details=snapshot.details,
    )


def _live_channel_diagnostic(name: str) -> DiagnosticResponse | None:
    from app.channels.service import get_channel_service

    service = get_channel_service()
    if service is None:
        return None

    payload = service.get_status()
    channel = payload.get("channels", {}).get(name)
    if not isinstance(channel, dict):
        return None

    if channel.get("last_error"):
        status = "error"
        summary = f"Channel '{name}' has an error"
    elif channel.get("running"):
        status = "healthy"
        summary = f"Channel '{name}' is running"
    else:
        status = "degraded"
        summary = f"Channel '{name}' is not running"

    return DiagnosticResponse(
        status=status,
        summary=summary,
        details={"channel_name": name, **channel},
    )


@router.get("", response_model=ChannelStatusResponse)
async def get_channels_status() -> ChannelStatusResponse:
    from app.channels.service import get_channel_service

    service = get_channel_service()
    if service is None:
        return ChannelStatusResponse(
            service_running=False,
            pending_pair_requests=0,
            channels={},
        )

    return ChannelStatusResponse(**service.get_status())


@router.get("/{platform}/pair-requests", response_model=list[ChannelPairRequestResponse])
async def list_channel_pair_requests(
    platform: ChannelPlatform,
    status_filter: str | None = Query(default=None, alias="status"),
) -> list[ChannelPairRequestResponse]:
    items = _channel_repo().list_pair_requests(platform, status=status_filter)
    return [_build_pair_request_response(item) for item in items]


@router.get("/{platform}/authorized-users", response_model=list[ChannelAuthorizedUserResponse])
async def list_channel_authorized_users(
    platform: ChannelPlatform,
    active_only: bool = Query(default=True),
) -> list[ChannelAuthorizedUserResponse]:
    items = _channel_repo().list_authorized_users(platform, active_only=active_only)
    return [_build_authorized_user_response(item) for item in items]


@router.get("/{name}", response_model=DiagnosticResponse)
async def get_channel_diagnostics(name: str, request: Request) -> DiagnosticResponse:
    live = _live_channel_diagnostic(name)
    if live is not None:
        return live

    snapshot = _channel_snapshot(request, name)
    if snapshot is not None:
        return snapshot

    return DiagnosticResponse(
        status="healthy",
        summary=f"No diagnostics found for channel '{name}'",
        details={"channel_name": name},
    )
