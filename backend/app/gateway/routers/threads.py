from __future__ import annotations

import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, Request, Response
from starlette.responses import StreamingResponse

from nion.config.paths import get_paths
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore
from nion.threads.models import ThreadSearchParams, ThreadStreamRequest
from nion.threads.service import ThreadService, create_default_thread_service

router = APIRouter(prefix="/api/threads", tags=["threads"])
logger = logging.getLogger(__name__)


class ThreadsSearchRequest(ThreadSearchParams):
    sortBy: Literal["updated_at", "created_at"] = "updated_at"
    sortOrder: Literal["asc", "desc"] = "desc"


class ThreadStateUpdateRequest(dict):
    values: dict[str, Any]


def get_thread_service() -> ThreadService:
    return create_default_thread_service()


def _record_thread_event(
    request: Request | None,
    *,
    level: str,
    event_type: str,
    thread_id: str,
    message: str,
    details: dict[str, Any] | None = None,
) -> None:
    try:
        payload_details = details or {}
        daemon_service = getattr(getattr(request, "app", None), "state", None)
        daemon_service = getattr(daemon_service, "daemon_service", None)
        if daemon_service is not None and hasattr(daemon_service, "record_thread_event"):
            daemon_service.record_thread_event(  # type: ignore[attr-defined]
                level=level,
                event_type=event_type,
                thread_id=thread_id,
                message=message,
                details=payload_details,
            )
            return

        telemetry_store = getattr(daemon_service, "telemetry_store", None)
        store = telemetry_store or TelemetryStore(get_paths().telemetry_db_file)
        store.record_event(
            make_event(
                category="thread",
                level=level,  # type: ignore[arg-type]
                event_type=event_type,
                actor="system",
                thread_id=thread_id,
                message=message,
                details=payload_details,
            )
        )
    except Exception:
        logger.warning("Failed to record thread event %s", event_type, exc_info=True)


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
    request: Request,
    service: ThreadService = Depends(get_thread_service),
) -> StreamingResponse:
    def event_stream():
        _record_thread_event(
            request,
            level="info",
            event_type="thread_stream_started",
            thread_id=thread_id,
            message=f"Thread stream started for {thread_id}",
            details={
                "message_count": len(payload.messages),
                "surface": payload.context.get("surface"),
                "agent_name": payload.context.get("agent_name"),
            },
        )
        yield f"event: created\ndata: {json.dumps({'thread_id': thread_id})}\n\n"
        try:
            for event in service.stream(thread_id, payload):
                yield f"event: {event.type}\ndata: {json.dumps(event.data)}\n\n"
            _record_thread_event(
                request,
                level="info",
                event_type="thread_stream_finished",
                thread_id=thread_id,
                message=f"Thread stream finished for {thread_id}",
                details={"message_count": len(payload.messages)},
            )
        except Exception as error:
            logger.exception("Thread stream failed for %s", thread_id)
            _record_thread_event(
                request,
                level="error",
                event_type="thread_stream_failed",
                thread_id=thread_id,
                message=f"Thread stream failed for {thread_id}",
                details={"reason": str(error) or "Thread stream failed"},
            )
            yield f"event: error\ndata: {json.dumps({'message': str(error) or 'Thread stream failed'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
