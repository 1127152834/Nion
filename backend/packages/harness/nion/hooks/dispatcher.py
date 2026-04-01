from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .event_models import HookExecutionMode, HookInput, HookResult


def dispatch_in_runtime_hook(
    hook_input: HookInput,
    *,
    handler: Callable[[dict[str, Any]], dict[str, Any] | None],
) -> HookResult:
    payload = handler(hook_input.payload) or {}
    return HookResult(
        event=hook_input.event,
        mode=HookExecutionMode.IN_RUNTIME,
        continue_execution=payload.get("continue_execution", True),
        stop_reason=payload.get("stop_reason"),
        updated_input=payload.get("updated_input"),
        permission_behavior=payload.get("permission_behavior"),
        additional_context=payload.get("additional_context"),
        side_effects=payload.get("side_effects"),
    )


def dispatch_out_of_runtime_hook(
    hook_input: HookInput,
    *,
    handler: Callable[[dict[str, Any]], dict[str, Any] | None],
) -> HookResult:
    payload = handler(hook_input.payload) or {}
    return HookResult(
        event=hook_input.event,
        mode=HookExecutionMode.OUT_OF_RUNTIME,
        continue_execution=True,
        stop_reason=None,
        updated_input=None,
        permission_behavior=None,
        additional_context=payload.get("additional_context"),
        side_effects=payload.get("side_effects"),
    )
