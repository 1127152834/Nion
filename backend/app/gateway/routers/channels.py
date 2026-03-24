"""Gateway router for IM channel management."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/channels", tags=["channels"])


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
