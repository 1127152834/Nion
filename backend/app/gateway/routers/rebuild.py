from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.rebuild.models import RebuildLog
from nion.rebuild.service import RebuildService

router = APIRouter(prefix="/api/memory/rebuild", tags=["rebuild"])


class RebuildLogsResponse(BaseModel):
    items: list[RebuildLog] = Field(default_factory=list)
    total_count: int = 0


@router.get("/logs", response_model=RebuildLogsResponse)
async def list_rebuild_logs(limit: int = 50, offset: int = 0) -> RebuildLogsResponse:
    service = RebuildService()
    items = service.list_logs(limit=limit, offset=offset)
    return RebuildLogsResponse(items=items, total_count=len(items))


@router.delete("/logs")
async def delete_rebuild_logs() -> dict[str, bool]:
    RebuildService().delete_logs()
    return {"ok": True}
