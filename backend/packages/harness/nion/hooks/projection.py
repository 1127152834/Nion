from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

from langgraph.prebuilt.tool_node import ToolCallRequest

from .dispatcher import dispatch_in_runtime_hook
from .event_models import HookEvent, HookInput, HookResult


def _optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def build_tool_call_hook_input(
    request: ToolCallRequest,
    *,
    event: HookEvent,
    payload: dict[str, Any] | None = None,
) -> HookInput:
    context = getattr(request, "context", {}) or {}
    return HookInput(
        event=event,
        thread_id=_optional_text(context.get("thread_id")),
        agent_id=_optional_text(context.get("agent_id")),
        agent_kind=_optional_text(context.get("agent_kind")),
        surface=_optional_text(context.get("surface")),
        timestamp=datetime.now(UTC).isoformat(),
        payload=payload or {},
    )


def project_hook_result_metadata(result: HookResult) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "event": result.event.value,
        "mode": result.mode.value,
        "continue_execution": result.continue_execution,
    }
    if result.stop_reason is not None:
        metadata["stop_reason"] = result.stop_reason
    if result.updated_input is not None:
        metadata["updated_input"] = result.updated_input
    if result.permission_behavior is not None:
        metadata["permission_behavior"] = result.permission_behavior
    if result.additional_context is not None:
        metadata["additional_context"] = result.additional_context
    if result.side_effects is not None:
        metadata["side_effects"] = result.side_effects
    return metadata


def dispatch_tool_call_in_runtime_hook(
    request: ToolCallRequest,
    *,
    event: HookEvent,
    payload: dict[str, Any] | None = None,
    handler: Callable[[dict[str, Any]], dict[str, Any] | None],
) -> dict[str, Any]:
    hook_input = build_tool_call_hook_input(
        request,
        event=event,
        payload=payload,
    )
    hook_result = dispatch_in_runtime_hook(
        hook_input,
        handler=handler,
    )
    return project_hook_result_metadata(hook_result)
