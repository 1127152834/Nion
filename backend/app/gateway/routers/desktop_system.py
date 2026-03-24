from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/desktop", tags=["desktop-system"])


class DesktopHealthResponse(BaseModel):
    status: str
    mode: str
    service: str


class DesktopRuntimeInfoResponse(BaseModel):
    mode: str
    helper_host: str
    helper_port: int
    data_dir: str


class DesktopShutdownResponse(BaseModel):
    accepted: bool
    service: str


def _helper_host() -> str:
    return os.getenv("NION_DESKTOP_HELPER_HOST", "127.0.0.1")


def _helper_port() -> int:
    return int(os.getenv("NION_DESKTOP_HELPER_PORT", "43115"))


def _data_dir() -> str:
    return os.getenv(
        "NION_DESKTOP_DATA_DIR",
        str(Path.home() / ".nion-data"),
    )


@router.get("/health", response_model=DesktopHealthResponse)
async def get_desktop_health() -> DesktopHealthResponse:
    return DesktopHealthResponse(
        status="healthy",
        mode="desktop",
        service="nion-desktop-helper",
    )


@router.get("/runtime-info", response_model=DesktopRuntimeInfoResponse)
async def get_desktop_runtime_info() -> DesktopRuntimeInfoResponse:
    return DesktopRuntimeInfoResponse(
        mode="desktop",
        helper_host=_helper_host(),
        helper_port=_helper_port(),
        data_dir=_data_dir(),
    )


@router.post("/shutdown", response_model=DesktopShutdownResponse)
async def shutdown_desktop_helper() -> DesktopShutdownResponse:
    return DesktopShutdownResponse(
        accepted=True,
        service="nion-desktop-helper",
    )
