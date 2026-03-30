from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from nion.compaction.models import CompactionLog
from nion.compaction.service import CompactionService

router = APIRouter(prefix="/api/memory/compact", tags=["compaction"])


class CompactionLogsResponse(BaseModel):
    items: list[CompactionLog] = Field(default_factory=list)
    total_count: int = 0


@router.get("/logs", response_model=CompactionLogsResponse)
async def list_compaction_logs(limit: int = 50, offset: int = 0) -> CompactionLogsResponse:
    service = CompactionService()
    items = service.list_logs(limit=limit, offset=offset)
    return CompactionLogsResponse(items=items, total_count=len(items))


@router.delete("/logs")
async def delete_compaction_logs() -> dict[str, bool]:
    CompactionService().delete_logs()
    return {"ok": True}
