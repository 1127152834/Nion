from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory.soul.console_service import build_soul_settings_payload
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


def _repo() -> MemoryOSRepository:
    return MemoryOSRepository(get_paths().memory_os_index_db_file)


@router.get("", response_model=SoulSettingsResponse)
async def get_soul_settings() -> SoulSettingsResponse:
    return SoulSettingsResponse(**build_soul_settings_payload(_repo(), now_z=utcnow_z()))
