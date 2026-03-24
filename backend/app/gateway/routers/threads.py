from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, Response
from sse_starlette import EventSourceResponse

from nion.threads.models import ThreadSearchParams, ThreadStreamRequest
from nion.threads.service import ThreadService, create_default_thread_service

router = APIRouter(prefix="/api/threads", tags=["threads"])


class ThreadsSearchRequest(ThreadSearchParams):
    sortBy: Literal["updated_at", "created_at"] = "updated_at"
    sortOrder: Literal["asc", "desc"] = "desc"


class ThreadStateUpdateRequest(dict):
    values: dict[str, Any]


def get_thread_service() -> ThreadService:
    return create_default_thread_service()


@router.post("/search")
async def search_threads(
    payload: ThreadsSearchRequest,
    service: ThreadService = Depends(get_thread_service),
) -> list[dict[str, Any]]:
    params = ThreadSearchParams(
        limit=payload.limit,
        offset=payload.offset,
        sort_by=payload.sortBy,
        sort_order=payload.sortOrder,
        select=payload.select,
    )
    return service.search(params)


@router.get("/{thread_id}/state")
async def get_thread_state(
    thread_id: str,
    service: ThreadService = Depends(get_thread_service),
) -> dict[str, Any]:
    return service.get_state(thread_id)


@router.patch("/{thread_id}/state")
async def update_thread_state(
    thread_id: str,
    payload: dict[str, Any],
    service: ThreadService = Depends(get_thread_service),
) -> dict[str, Any]:
    values = payload.get("values", {}) if isinstance(payload, dict) else {}
    return service.update_state(thread_id, values)


@router.delete("/{thread_id}", status_code=204)
async def delete_thread(
    thread_id: str,
    service: ThreadService = Depends(get_thread_service),
) -> Response:
    service.delete_thread(thread_id)
    return Response(status_code=204)


@router.post("/{thread_id}/stream")
async def stream_thread(
    thread_id: str,
    payload: ThreadStreamRequest,
    service: ThreadService = Depends(get_thread_service),
) -> EventSourceResponse:
    def event_stream():
        yield {"event": "created", "data": json.dumps({"thread_id": thread_id})}
        for event in service.stream(thread_id, payload):
            yield {"event": event.type, "data": json.dumps(event.data)}

    return EventSourceResponse(event_stream())
