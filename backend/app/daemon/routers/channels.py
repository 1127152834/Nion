from __future__ import annotations

from http import HTTPStatus

from fastapi import APIRouter, HTTPException, Query, Request

from app.channels.api_models import (
    ChannelAuthorizedUserResponse,
    ChannelAuthorizedUserRevokeRequest,
    ChannelAuthorizedUserRevokeResponse,
    ChannelPairingCodeCreateRequest,
    ChannelPairingCodeResponse,
    ChannelPairRequestDecisionRequest,
    ChannelPairRequestResponse,
    ChannelRestartResponse,
    ChannelStatusResponse,
    build_authorized_user_response,
    build_pair_request_response,
)
from app.channels.repository import ChannelPlatform, ChannelRepository
from app.channels.telemetry import (
    record_channel_authorized_user_revoked,
    record_channel_pair_request_approved,
    record_channel_pair_request_rejected,
    record_channel_pairing_code_issued,
)
from app.daemon.routers.diagnostics import DiagnosticResponse

router = APIRouter(prefix="/api/daemon/channels", tags=["daemon"])


def _channel_repo() -> ChannelRepository:
    return ChannelRepository()


def _get_pair_request_for_platform_or_404(
    repo: ChannelRepository,
    *,
    platform: ChannelPlatform,
    request_id: int,
) -> dict:
    try:
        request = repo.get_pair_request(request_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(exc),
        ) from exc
    if request.get("platform") != platform:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Pair request {request_id} not found for {platform}",
        )
    return request


def _get_authorized_user_for_platform_or_404(
    repo: ChannelRepository,
    *,
    platform: ChannelPlatform,
    user_id: int,
) -> dict:
    try:
        user = repo.get_authorized_user(user_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(exc),
        ) from exc
    if user.get("platform") != platform:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Authorized user {user_id} not found for {platform}",
        )
    return user


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


def _live_channel_diagnostic(name: str) -> tuple[DiagnosticResponse | None, dict | None]:
    from app.channels.service import get_channel_service

    service = get_channel_service()
    if service is None:
        return None, None

    payload = service.get_status()
    channel = payload.get("channels", {}).get(name)
    if not isinstance(channel, dict):
        return None, None

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
    ), channel


def _severity(status: str) -> int:
    return {"healthy": 0, "degraded": 1, "error": 2}.get(status, 0)


def _merge_channel_diagnostics(
    request: Request,
    name: str,
) -> DiagnosticResponse | None:
    snapshot = _channel_snapshot(request, name)
    live, live_details = _live_channel_diagnostic(name)

    if snapshot is None and live is None:
        return None
    if snapshot is None:
        return live
    if live is None:
        return snapshot

    use_snapshot = _severity(snapshot.status) >= _severity(live.status)
    primary = snapshot if use_snapshot else live

    return DiagnosticResponse(
        status=primary.status,
        summary=primary.summary,
        details={
            "channel_name": name,
            "snapshot": {
                "status": snapshot.status,
                "summary": snapshot.summary,
                "details": snapshot.details,
            },
            "runtime": live_details or {},
        },
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
    return [build_pair_request_response(item) for item in items]


@router.get("/{platform}/authorized-users", response_model=list[ChannelAuthorizedUserResponse])
async def list_channel_authorized_users(
    platform: ChannelPlatform,
    active_only: bool = Query(default=True),
) -> list[ChannelAuthorizedUserResponse]:
    items = _channel_repo().list_authorized_users(platform, active_only=active_only)
    return [build_authorized_user_response(item) for item in items]


@router.post("/{name}/restart", response_model=ChannelRestartResponse)
async def restart_channel(name: str) -> ChannelRestartResponse:
    from app.channels.service import get_channel_service

    service = get_channel_service()
    if service is None:
        raise HTTPException(
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            detail="Channel service is not running",
        )

    success = await service.restart_channel(name)
    if success:
        return ChannelRestartResponse(
            success=True,
            message=f"Channel {name} restarted successfully",
        )
    return ChannelRestartResponse(
        success=False,
        message=f"Failed to restart channel {name}",
    )


@router.post(
    "/{platform}/pairing-code",
    response_model=ChannelPairingCodeResponse,
    status_code=201,
)
async def create_pairing_code(
    platform: ChannelPlatform,
    payload: ChannelPairingCodeCreateRequest,
) -> ChannelPairingCodeResponse:
    created = _channel_repo().issue_pairing_code(
        platform,
        ttl_minutes=payload.ttl_minutes,
    )
    record_channel_pairing_code_issued(
        platform,
        pairing_id=created["id"],
        expires_at=created["expires_at"],
        ttl_minutes=payload.ttl_minutes,
    )
    return ChannelPairingCodeResponse.model_validate(created)


@router.post(
    "/{platform}/pair-requests/{request_id}/approve",
    response_model=ChannelPairRequestResponse,
)
async def approve_pair_request(
    platform: ChannelPlatform,
    request_id: int,
    payload: ChannelPairRequestDecisionRequest,
) -> ChannelPairRequestResponse:
    repo = _channel_repo()
    _get_pair_request_for_platform_or_404(
        repo,
        platform=platform,
        request_id=request_id,
    )
    updated = repo.decide_pair_request(
        request_id,
        status="approved",
        handled_by=payload.handled_by,
        note=payload.note,
        workspace_id=payload.workspace_id,
    )
    record_channel_pair_request_approved(
        platform,
        request_id=request_id,
        workspace_id=payload.workspace_id,
    )
    return build_pair_request_response(updated)


@router.post(
    "/{platform}/pair-requests/{request_id}/reject",
    response_model=ChannelPairRequestResponse,
)
async def reject_pair_request(
    platform: ChannelPlatform,
    request_id: int,
    payload: ChannelPairRequestDecisionRequest,
) -> ChannelPairRequestResponse:
    repo = _channel_repo()
    _get_pair_request_for_platform_or_404(
        repo,
        platform=platform,
        request_id=request_id,
    )
    updated = repo.decide_pair_request(
        request_id,
        status="rejected",
        handled_by=payload.handled_by,
        note=payload.note,
        workspace_id=payload.workspace_id,
    )
    record_channel_pair_request_rejected(platform, request_id=request_id)
    return build_pair_request_response(updated)


@router.post(
    "/{platform}/authorized-users/{user_id}/revoke",
    response_model=ChannelAuthorizedUserRevokeResponse,
)
async def revoke_authorized_user(
    platform: ChannelPlatform,
    user_id: int,
    payload: ChannelAuthorizedUserRevokeRequest,
) -> ChannelAuthorizedUserRevokeResponse:
    _ = payload
    repo = _channel_repo()
    _get_authorized_user_for_platform_or_404(
        repo,
        platform=platform,
        user_id=user_id,
    )
    updated = repo.revoke_authorized_user(user_id)
    record_channel_authorized_user_revoked(platform, user_id=user_id)
    return ChannelAuthorizedUserRevokeResponse(revoked=bool(updated.get("revoked_at")))


@router.get("/{name}", response_model=DiagnosticResponse)
async def get_channel_diagnostics(name: str, request: Request) -> DiagnosticResponse:
    merged = _merge_channel_diagnostics(request, name)
    if merged is not None:
        return merged

    return DiagnosticResponse(
        status="healthy",
        summary=f"No diagnostics found for channel '{name}'",
        details={"channel_name": name},
    )
