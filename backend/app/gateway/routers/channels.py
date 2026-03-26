"""Gateway router for IM channel management."""

from __future__ import annotations

import logging
from http import HTTPStatus
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.channels.api_models import (
    ChannelAuthorizedUserResponse,
    ChannelPairRequestResponse,
    ChannelSessionConfigResponse,
    ChannelStatusResponse,
    build_authorized_user_response,
    build_pair_request_response,
)
from app.channels.repository import ChannelPlatform, ChannelRepository
from nion.config import ConfigRepository
from nion.config.app_config import get_app_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/channels", tags=["channels"])

ChannelMode = Literal["webhook", "stream"]


def _platform_config_key(platform: ChannelPlatform) -> str:
    return "feishu" if platform == "lark" else platform


def _default_mode_for(platform: ChannelPlatform) -> ChannelMode:
    return "webhook" if platform == "lark" else "stream"

class ChannelConfigResponse(BaseModel):
    platform: ChannelPlatform
    enabled: bool = False
    mode: ChannelMode
    credentials: dict[str, str] = Field(default_factory=dict)
    default_workspace_id: str | None = None
    session: ChannelSessionConfigResponse | None = None
    created_at: str | None = None
    updated_at: str | None = None


class ChannelConfigUpsertRequest(BaseModel):
    enabled: bool = False
    mode: ChannelMode
    credentials: dict[str, str] = Field(default_factory=dict)
    default_workspace_id: str | None = None
    session: ChannelSessionConfigResponse | None = None


class ChannelConnectionTestPayload(BaseModel):
    credentials: dict[str, str] = Field(default_factory=dict)
    timeout_seconds: int | None = Field(default=None, ge=1)


class ChannelConnectionTestResult(BaseModel):
    platform: ChannelPlatform
    success: bool
    message: str
    latency_ms: int | None = None


class ChannelRuntimeStatusResponse(BaseModel):
    platform: ChannelPlatform
    enabled: bool
    mode: ChannelMode
    proxy_mode: str | None = None
    stream_health: str | None = None
    running: bool = False
    connected: bool = False
    active_users: int = 0
    reconnect_count: int = 0
    started_at: str | None = None
    last_ws_connected_at: str | None = None
    last_ws_disconnected_at: str | None = None
    last_event_at: str | None = None
    last_error: str | None = None
    last_error_code: str | None = None
    last_error_at: str | None = None
    last_delivery_path: str | None = None
    last_render_mode: str | None = None
    last_fallback_reason: str | None = None
    last_stream_chunk_at: str | None = None
    last_media_attempted_count: int = 0
    last_media_sent_count: int = 0
    last_media_failed_count: int = 0
    last_media_fallback_reason: str | None = None
    updated_at: str | None = None


class ChannelPairingCodeCreateRequest(BaseModel):
    ttl_minutes: int = Field(default=10, ge=1, le=1440)


class ChannelPairingCodeResponse(BaseModel):
    id: int
    platform: ChannelPlatform
    code: str
    expires_at: str
    consumed_at: str | None = None
    created_at: str


class ChannelPairRequestDecisionRequest(BaseModel):
    handled_by: str | None = None
    note: str | None = None
    workspace_id: str | None = None


class ChannelAuthorizedUserRevokeRequest(BaseModel):
    handled_by: str | None = None


class ChannelAuthorizedUserRevokeResponse(BaseModel):
    revoked: bool


def _channel_repo() -> ChannelRepository:
    return ChannelRepository()
def _load_channel_config(platform: ChannelPlatform) -> ChannelConfigResponse:
    app_config = get_app_config()
    channel_config = getattr(app_config.channels, platform)
    return ChannelConfigResponse(
        platform=platform,
        enabled=bool(channel_config.enabled),
        mode=channel_config.mode,
        credentials=dict(channel_config.credentials),
        default_workspace_id=channel_config.default_workspace_id,
        session=(
            ChannelSessionConfigResponse.model_validate(
                channel_config.session.model_dump(exclude_none=True),
            )
            if channel_config.session is not None
            else None
        ),
        created_at=channel_config.created_at,
        updated_at=channel_config.updated_at,
    )
class ChannelRestartResponse(BaseModel):
    success: bool
    message: str


@router.get("/", response_model=ChannelStatusResponse)
async def get_channels_status() -> ChannelStatusResponse:
    """Get the status of all IM channels."""
    from app.channels.service import get_channel_service

    service = get_channel_service()
    if service is None:
        return ChannelStatusResponse(
            service_running=False,
            pending_pair_requests=0,
            channels={},
        )
    status = service.get_status()
    return ChannelStatusResponse(**status)


@router.post("/{name}/restart", response_model=ChannelRestartResponse)
async def restart_channel(name: str) -> ChannelRestartResponse:
    """Restart a specific IM channel."""
    from app.channels.service import get_channel_service

    service = get_channel_service()
    if service is None:
        raise HTTPException(status_code=503, detail="Channel service is not running")

    success = await service.restart_channel(name)
    if success:
        logger.info("Channel %s restarted successfully", name)
        return ChannelRestartResponse(success=True, message=f"Channel {name} restarted successfully")
    else:
        logger.warning("Failed to restart channel %s", name)
        return ChannelRestartResponse(success=False, message=f"Failed to restart channel {name}")


@router.get("/{platform}/config", response_model=ChannelConfigResponse)
async def get_channel_config(platform: ChannelPlatform) -> ChannelConfigResponse:
    return _load_channel_config(platform)


@router.put("/{platform}/config", response_model=ChannelConfigResponse)
async def upsert_channel_config(
    platform: ChannelPlatform,
    request: ChannelConfigUpsertRequest,
) -> ChannelConfigResponse:
    repo = ConfigRepository()
    config, version, _ = repo.read()
    channels = config.get("channels")
    if not isinstance(channels, dict):
        channels = {}
    existing = channels.get(_platform_config_key(platform))
    created_at = (
        existing.get("created_at")
        if isinstance(existing, dict)
        else None
    )
    from datetime import UTC, datetime

    channels[_platform_config_key(platform)] = {
        "enabled": request.enabled,
        "mode": request.mode,
        "credentials": request.credentials,
        "default_workspace_id": request.default_workspace_id,
        "session": request.session.model_dump(exclude_none=True)
        if request.session is not None
        else None,
        "created_at": created_at or datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    config["channels"] = channels
    repo.write_with_warnings(config_dict=config, expected_version=version)
    return _load_channel_config(platform)


@router.post("/{platform}/test", response_model=ChannelConnectionTestResult)
async def test_channel_connection(
    platform: ChannelPlatform,
    payload: ChannelConnectionTestPayload,
) -> ChannelConnectionTestResult:
    required_fields = {
        "lark": ("app_id", "app_secret"),
        "dingtalk": ("client_id", "client_secret"),
        "telegram": ("bot_token",),
    }
    missing = [
        field
        for field in required_fields[platform]
        if not str(payload.credentials.get(field, "")).strip()
    ]
    if missing:
        return ChannelConnectionTestResult(
            platform=platform,
            success=False,
            message=f"Missing required credentials: {', '.join(missing)}",
            latency_ms=None,
        )
    return ChannelConnectionTestResult(
        platform=platform,
        success=True,
        message="Configuration looks valid",
        latency_ms=0,
    )


@router.get("/{platform}/runtime", response_model=ChannelRuntimeStatusResponse)
async def get_channel_runtime_status(
    platform: ChannelPlatform,
) -> ChannelRuntimeStatusResponse:
    from app.channels.service import get_channel_service

    config = _load_channel_config(platform)
    repo = _channel_repo()
    service = get_channel_service()
    service_status = service.get_status() if service is not None else {"channels": {}}
    runtime = service_status.get("channels", {}).get(_platform_config_key(platform), {})
    active_users = len(repo.list_authorized_users(platform, active_only=True))

    return ChannelRuntimeStatusResponse(
        platform=platform,
        enabled=config.enabled,
        mode=config.mode,
        proxy_mode=config.credentials.get("proxy_mode"),
        stream_health="ok" if runtime.get("running") else "down",
        running=bool(runtime.get("running", False)),
        connected=bool(runtime.get("running", False)),
        active_users=active_users,
    )


@router.post(
    "/{platform}/pairing-code",
    response_model=ChannelPairingCodeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_pairing_code(
    platform: ChannelPlatform,
    payload: ChannelPairingCodeCreateRequest,
) -> ChannelPairingCodeResponse:
    created = _channel_repo().issue_pairing_code(
        platform,
        ttl_minutes=payload.ttl_minutes,
    )
    return ChannelPairingCodeResponse.model_validate(created)


@router.get(
    "/{platform}/pair-requests",
    response_model=list[ChannelPairRequestResponse],
)
async def list_pair_requests(
    platform: ChannelPlatform,
    status_filter: Literal["pending", "approved", "rejected"] | None = Query(
        default=None,
        alias="status",
    ),
) -> list[ChannelPairRequestResponse]:
    items = _channel_repo().list_pair_requests(platform, status=status_filter)
    return [build_pair_request_response(item) for item in items]


@router.post(
    "/{platform}/pair-requests/{request_id}/approve",
    response_model=ChannelPairRequestResponse,
)
async def approve_pair_request(
    platform: ChannelPlatform,
    request_id: int,
    payload: ChannelPairRequestDecisionRequest,
) -> ChannelPairRequestResponse:
    try:
        updated = _channel_repo().decide_pair_request(
            request_id,
            status="approved",
            handled_by=payload.handled_by,
            note=payload.note,
            workspace_id=payload.workspace_id,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(exc),
        ) from exc

    if updated.get("platform") != platform:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Pair request {request_id} not found for {platform}",
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
    try:
        updated = _channel_repo().decide_pair_request(
            request_id,
            status="rejected",
            handled_by=payload.handled_by,
            note=payload.note,
            workspace_id=payload.workspace_id,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(exc),
        ) from exc

    if updated.get("platform") != platform:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Pair request {request_id} not found for {platform}",
        )
    return build_pair_request_response(updated)


@router.get(
    "/{platform}/authorized-users",
    response_model=list[ChannelAuthorizedUserResponse],
)
async def list_authorized_users(
    platform: ChannelPlatform,
    active_only: bool = Query(default=True),
) -> list[ChannelAuthorizedUserResponse]:
    items = _channel_repo().list_authorized_users(
        platform,
        active_only=active_only,
    )
    return [build_authorized_user_response(item) for item in items]


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
    try:
        updated = _channel_repo().revoke_authorized_user(user_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(exc),
        ) from exc

    if updated.get("platform") != platform:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Authorized user {user_id} not found for {platform}",
        )
    return ChannelAuthorizedUserRevokeResponse(revoked=bool(updated.get("revoked_at")))


@router.post(
    "/{platform}/authorized-users/{user_id}/session-override",
    response_model=ChannelAuthorizedUserResponse,
)
async def update_authorized_user_session_override(
    platform: ChannelPlatform,
    user_id: int,
    payload: ChannelSessionConfigResponse,
) -> ChannelAuthorizedUserResponse:
    try:
        updated = _channel_repo().update_authorized_user_session_override(
            user_id,
            payload.model_dump(exclude_none=True),
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=str(exc),
        ) from exc

    if updated.get("platform") != platform:
        raise HTTPException(
            status_code=HTTPStatus.NOT_FOUND,
            detail=f"Authorized user {user_id} not found for {platform}",
        )
    return build_authorized_user_response(updated)
