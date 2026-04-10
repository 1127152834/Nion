from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory.soul.console_service import (
    apply_soul_settings,
    build_soul_settings_payload,
    patch_soul_setting_value,
)
from nion.memory_os.clock import utcnow_z
from nion.memory_os.repository import MemoryOSRepository

router = APIRouter(prefix="/api/memory/soul", tags=["memory"])


class SoulSettingsResponse(BaseModel):
    core_identity: str
    speech_style: str
    values_and_boundaries: str
    relationship_stance: str
    has_active_overlay: bool
    adaptive_overlay_summary: str | None = None


class SoulSettingsApplyRequest(BaseModel):
    core_identity: str
    speech_style: str
    values_and_boundaries: str
    relationship_stance: str


class SoulSettingsPatchRequest(BaseModel):
    field: Literal[
        "core_identity",
        "speech_style",
        "values_and_boundaries",
        "relationship_stance",
    ]
    value: str


def _repo() -> MemoryOSRepository:
    return MemoryOSRepository(get_paths().memory_os_index_db_file)


@router.get("", response_model=SoulSettingsResponse)
async def get_soul_settings() -> SoulSettingsResponse:
    return SoulSettingsResponse(**build_soul_settings_payload(_repo(), now_z=utcnow_z()))


@router.post("/apply")
async def apply_soul_settings_route(request: SoulSettingsApplyRequest):
    try:
        return apply_soul_settings(
            _repo(),
            core_identity=request.core_identity,
            speech_style=request.speech_style,
            values_and_boundaries=request.values_and_boundaries,
            relationship_stance=request.relationship_stance,
            created_at=utcnow_z(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid soul settings request") from exc


@router.patch("")
async def patch_soul_setting_route(request: SoulSettingsPatchRequest):
    try:
        return patch_soul_setting_value(
            _repo(),
            field=request.field,
            value=request.value,
            created_at=utcnow_z(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid soul settings request") from exc
