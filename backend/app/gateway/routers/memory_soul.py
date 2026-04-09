from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory.soul.console_service import (
    build_soul_console_payload,
    freeze_soul_layer_auto_evolution,
    update_soul_layer_summary,
)
from nion.memory_os.clock import utcnow_z
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_governance import rollback_soul_overlay

router = APIRouter(prefix="/api/memory/soul", tags=["memory"])


class SoulLayerEditRequest(BaseModel):
    summary: str


def _repo() -> MemoryOSRepository:
    return MemoryOSRepository(get_paths().memory_os_index_db_file)


@router.get("")
async def get_soul_console():
    return build_soul_console_payload(_repo(), now_z=utcnow_z())


@router.post("/{layer}/edit")
async def edit_soul_layer(layer: str, request: SoulLayerEditRequest):
    try:
        return update_soul_layer_summary(
            _repo(),
            layer=layer,
            summary=request.summary,
            created_at=utcnow_z(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid soul layer edit request") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Soul layer '{layer}' not found") from exc


@router.post("/{layer}/freeze-auto-evolution")
async def freeze_soul_layer(layer: str):
    try:
        return freeze_soul_layer_auto_evolution(
            _repo(),
            layer=layer,
            created_at=utcnow_z(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid soul layer freeze request") from exc


@router.post("/adaptive_overlay/rollback")
async def rollback_active_overlay():
    return rollback_soul_overlay(_repo(), created_at=utcnow_z())
