from __future__ import annotations

from fastapi import APIRouter, Query

from nion.config.paths import get_paths
from nion.memory.runtime_trace.store import MemoryEvidenceStore

router = APIRouter(prefix="/api/memory/evidence", tags=["memory"])


@router.get("")
async def get_memory_evidence(
    thread_id: str | None = None,
    source_type: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict[str, object]:
    store = MemoryEvidenceStore(get_paths().memory_os_dir / "evidence.sqlite3")
    return store.list_evidence(
        thread_id=thread_id,
        source_type=source_type,
        limit=limit,
        offset=offset,
    )
