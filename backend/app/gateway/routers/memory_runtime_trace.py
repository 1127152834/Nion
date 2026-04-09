from __future__ import annotations

from fastapi import APIRouter, Query

from nion.config.paths import get_paths
from nion.memory.runtime_trace.models import RuntimeTraceListResponse
from nion.memory.runtime_trace.store import RuntimeTraceStore

router = APIRouter(prefix="/api/memory/runtime-trace", tags=["memory"])


@router.get("")
async def get_memory_runtime_trace(
    thread_id: str | None = None,
    event_type: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
) -> RuntimeTraceListResponse:
    store = RuntimeTraceStore(get_paths().memory_os_dir / "runtime_trace" / "events.jsonl")
    return RuntimeTraceListResponse(
        items=store.list_events(thread_id=thread_id, event_type=event_type, limit=limit)
    )
