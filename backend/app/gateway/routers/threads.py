from __future__ import annotations

import json
import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from starlette.responses import StreamingResponse

from nion.config.paths import get_paths
from nion.telemetry.logger import make_event
from nion.telemetry.store import TelemetryStore
from nion.thread_permissions import (
    consume_thread_permission_once,
    get_thread_permission_request,
    resolve_thread_permission_request,
)
from nion.threads.models import ThreadSearchParams, ThreadStreamRequest
from nion.threads.repository import ThreadRepository
from nion.threads.service import ThreadService, create_default_thread_service

router = APIRouter(prefix="/api/threads", tags=["threads"])
logger = logging.getLogger(__name__)


class ThreadsSearchRequest(ThreadSearchParams):
    scope: Literal["general", "notebook_assistant", "all"] = "general"
    sortBy: Literal["updated_at", "created_at"] = "updated_at"
    sortOrder: Literal["asc", "desc"] = "desc"


class ThreadStateUpdateRequest(dict):
    values: dict[str, Any]


class BridgePermissionResolveRequest(BaseModel):
    decision: Literal["allow", "allow_session", "deny"]


class NotebookAssistantSessionRequest(BaseModel):
    note_id: str
    session_id: str


class NotebookAssistantSessionResponse(BaseModel):
    thread_id: str
    agent_name: str
    created_at: str
    updated_at: str
    values: dict[str, Any]
    deleted: bool = False
    created: bool


class ChildRunListResponse(BaseModel):
    items: list[dict[str, Any]]


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
        thread_id=payload.thread_id,
        scope=payload.scope,
        limit=payload.limit,
        offset=payload.offset,
        sort_by=payload.sortBy,
        sort_order=payload.sortOrder,
        select=payload.select,
    )
    return service.search(params)


@router.post("/notebook-assistant/session", response_model=NotebookAssistantSessionResponse)
async def create_or_resume_notebook_assistant_session(
    payload: NotebookAssistantSessionRequest,
    service: ThreadService = Depends(get_thread_service),
) -> dict[str, Any]:
    record, created = service.get_or_create_notebook_assistant_session(
        note_id=payload.note_id,
        session_id=payload.session_id,
    )
    response = record.model_dump()
    response["created"] = created
    return response


@router.get("/{thread_id}/state")
async def get_thread_state(
    thread_id: str,
    service: ThreadService = Depends(get_thread_service),
    ) -> dict[str, Any]:
    return service.get_state(thread_id)


@router.get("/{thread_id}/child-runs", response_model=ChildRunListResponse)
async def list_child_runs(thread_id: str) -> ChildRunListResponse:
    from nion.orchestration.service import ChildRunService

    service = ChildRunService()
    return ChildRunListResponse(
        items=[item.model_dump() for item in service.list_open(thread_id)]
    )


@router.get("/{thread_id}/child-runs/{child_run_id}")
async def get_child_run(thread_id: str, child_run_id: str) -> dict[str, Any]:
    from nion.orchestration.service import ChildRunService

    return ChildRunService().get(thread_id, child_run_id).model_dump()


@router.post("/{thread_id}/child-runs/{child_run_id}/close")
async def close_child_run(thread_id: str, child_run_id: str) -> dict[str, Any]:
    from nion.orchestration.service import ChildRunService

    return ChildRunService().close(thread_id, child_run_id).model_dump()


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


async def _resolve_permission_request(
    thread_id: str,
    permission_request_id: str,
    payload: BridgePermissionResolveRequest,
    *,
    expect_bridge_thread: bool,
    client_id: str | None,
) -> tuple[dict[str, Any], bool]:
    decision = payload.decision
    if decision not in {"allow", "allow_session", "deny"}:
        return {"ok": False, "message": "Invalid permission decision"}, False

    repository = ThreadRepository()
    thread_record = repository.get_thread(thread_id)
    bridge_info = thread_record.values.bridge if thread_record is not None else None
    is_bridge_thread = (
        isinstance(bridge_info, dict) and bridge_info.get("source") == "bridge"
    )
    if expect_bridge_thread and not is_bridge_thread:
        return (
            {
                "ok": False,
                "message": "Workspace permission requests must use the workspace resolve route",
            },
            True,
        )
    if not expect_bridge_thread and is_bridge_thread:
        return (
            {
                "ok": False,
                "message": "Bridge permission requests must use the bridge resolve route",
            },
            True,
        )
    owner_client_id = (
        thread_record.values.owner_client_id
        if thread_record is not None
        else None
    )
    if (
        isinstance(owner_client_id, str)
        and owner_client_id.strip()
        and isinstance(client_id, str)
        and client_id.strip()
        and owner_client_id != client_id
    ):
        return (
            {
                "ok": False,
                "message": "Permission request does not belong to this client",
            },
            True,
        )

    record = resolve_thread_permission_request(
        thread_id=thread_id,
        permission_request_id=permission_request_id,
        decision=decision,
    )
    if record is None:
        return {"ok": False, "message": "Permission request not found"}, False

    latest = get_thread_permission_request(
        thread_id=thread_id,
        permission_request_id=permission_request_id,
    )
    existing_record = repository.get_thread(thread_id)
    existing_resolved_ids = (
        list(existing_record.values.resolved_permission_request_ids)
        if existing_record is not None
        else []
    )
    if permission_request_id not in existing_resolved_ids:
        existing_resolved_ids.append(permission_request_id)
    state_update: dict[str, Any] = {
        "resolved_permission_request_ids": existing_resolved_ids,
    }
    if (
        existing_record is not None
        and not existing_record.values.owner_client_id
        and isinstance(client_id, str)
        and client_id.strip()
    ):
        state_update["owner_client_id"] = client_id
    repository.update_state(thread_id, state_update)
    if latest and latest.tool_name.startswith("codepilot_cli_tools_"):
        record = repository.get_thread(thread_id)
        if record is not None:
            cli_management = record.values.cli_management.model_dump()
            cli_management["updated_at"] = record.updated_at
            cli_management["pending_permission_request_id"] = None
            if decision in {"allow", "allow_session"}:
                cli_management["active"] = True
                cli_management["phase"] = "managing"
                cli_management["last_trigger"] = "permission_resolved"
                cli_management["followup_turns_remaining"] = max(
                    int(cli_management.get("followup_turns_remaining") or 0),
                    1,
                )
            else:
                cli_management["active"] = False
                cli_management["phase"] = "inactive"
                cli_management["last_trigger"] = "permission_denied"
                cli_management["followup_turns_remaining"] = 0
            repository.update_state(thread_id, {"cli_management": cli_management})
    consumed = (
        consume_thread_permission_once(
            thread_id=thread_id,
            permission_request_id=permission_request_id,
        )
        if decision in {"allow", "allow_session"}
        else False
    )
    return (
        {
            "ok": True,
            "decision": decision,
            "consumed": consumed,
            "original_message_text": latest.original_message_text if latest else "",
            "replay_payload": latest.replay_payload if latest else {
                "text": "",
                "files": [],
                "additional_kwargs": {},
            },
            "tool_name": latest.tool_name if latest else "",
        },
        False,
    )


@router.post("/{thread_id}/permissions/{permission_request_id}/resolve")
async def resolve_thread_permission(
    thread_id: str,
    permission_request_id: str,
    payload: BridgePermissionResolveRequest,
    request: Request,
) -> dict[str, Any]:
    client_id = request.headers.get("X-Nion-Client-Id")
    response, is_authz_failure = await _resolve_permission_request(
        thread_id=thread_id,
        permission_request_id=permission_request_id,
        payload=payload,
        expect_bridge_thread=False,
        client_id=client_id,
    )
    if response.get("ok") is False and is_authz_failure:
        raise HTTPException(status_code=403, detail=response["message"])
    return response


@router.post("/{thread_id}/bridge/permissions/{permission_request_id}/resolve")
async def resolve_bridge_permission(
    thread_id: str,
    permission_request_id: str,
    payload: BridgePermissionResolveRequest,
    request: Request,
) -> dict[str, Any]:
    client_id = request.headers.get("X-Nion-Client-Id")
    response, is_authz_failure = await _resolve_permission_request(
        thread_id=thread_id,
        permission_request_id=permission_request_id,
        payload=payload,
        expect_bridge_thread=True,
        client_id=client_id,
    )
    if response.get("ok") is False and is_authz_failure:
        raise HTTPException(status_code=403, detail=response["message"])
    return response
