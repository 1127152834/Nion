from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.recall.local_archive import LocalRecallArchive

router = APIRouter(prefix="/api/recall", tags=["recall"])


class RecallResultResponse(BaseModel):
    thread_id: str
    agent_name: str
    role: str
    snippet: str
    created_at: str


class RecallSearchResponse(BaseModel):
    scope: Literal["global", "thread"]
    results: list[RecallResultResponse]


@router.get("/search", response_model=RecallSearchResponse)
async def search_recall(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    thread_id: str | None = Query(None),
):
    archive = LocalRecallArchive(get_paths().recall_db_file)
    if thread_id:
        results = archive.search_thread(thread_id, q, limit)
        return RecallSearchResponse(
            scope="thread",
            results=[RecallResultResponse(**asdict(result)) for result in results],
        )
    results = archive.search_global(q, limit)
    return RecallSearchResponse(
        scope="global",
        results=[RecallResultResponse(**asdict(result)) for result in results],
    )
