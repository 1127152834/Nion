from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.channels.repository import ChannelPlatform


class ChannelSessionContextResponse(BaseModel):
    thinking_enabled: bool | None = None
    is_plan_mode: bool | None = None
    subagent_enabled: bool | None = None


class ChannelSessionRunConfigResponse(BaseModel):
    recursion_limit: int | None = None


class ChannelSessionConfigResponse(BaseModel):
    assistant_id: str | None = None
    config: ChannelSessionRunConfigResponse | None = None
    context: ChannelSessionContextResponse | None = None


class ChannelPairRequestResponse(BaseModel):
    id: int
    platform: ChannelPlatform
    code: str
    external_user_id: str
    external_user_name: str | None = None
    chat_id: str
    conversation_type: str | None = None
    source_event_id: str | None = None
    status: Literal["pending", "approved", "rejected"]
    note: str | None = None
    created_at: str
    handled_at: str | None = None
    handled_by: str | None = None


class ChannelAuthorizedUserResponse(BaseModel):
    id: int
    platform: ChannelPlatform
    external_user_id: str
    external_user_name: str | None = None
    chat_id: str | None = None
    conversation_type: str | None = None
    workspace_id: str | None = None
    session_override: ChannelSessionConfigResponse | None = None
    granted_at: str
    revoked_at: str | None = None
    source_request_id: int | None = None


class ChannelCapabilitiesResponse(BaseModel):
    supports_streaming: bool


class ChannelOpsItemResponse(BaseModel):
    enabled: bool
    running: bool
    capabilities: ChannelCapabilitiesResponse
    last_heartbeat: float | None = None
    last_error: str | None = None
    authorized_user_count: int = 0
    pending_pair_request_count: int = 0
    can_restart: bool = False


class ChannelStatusResponse(BaseModel):
    service_running: bool
    pending_pair_requests: int = 0
    channels: dict[str, ChannelOpsItemResponse]


class ChannelRestartResponse(BaseModel):
    success: bool
    message: str


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


def coerce_session_config(
    session: dict[str, object] | None,
) -> ChannelSessionConfigResponse | None:
    if not isinstance(session, dict) or not session:
        return None
    return ChannelSessionConfigResponse.model_validate(session)


def build_pair_request_response(payload: dict[str, object]) -> ChannelPairRequestResponse:
    return ChannelPairRequestResponse.model_validate(payload)


def build_authorized_user_response(
    payload: dict[str, object],
) -> ChannelAuthorizedUserResponse:
    normalized = dict(payload)
    normalized["session_override"] = coerce_session_config(
        payload.get("session_override") if isinstance(payload, dict) else None,
    )
    return ChannelAuthorizedUserResponse.model_validate(normalized)
