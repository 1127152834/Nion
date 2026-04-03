from __future__ import annotations

from typing import Any

from nion.tools.runtime_models import ToolRuntimeResult

from .models import ToolExecutionContext


def project_tool_runtime_diagnostics(
    context: ToolExecutionContext,
    result: ToolRuntimeResult,
) -> dict[str, Any]:
    return {
        "thread_id": context.thread_id,
        "surface": context.surface,
        "agent_name": context.agent_name,
        "execution_mode": context.execution_mode,
        "selected_extension_groups": sorted(context.selected_extensions.keys()),
        "selected_extension_count": sum(
            len(values) for values in context.selected_extensions.values()
        ),
        "session_guidance_keys": sorted(context.session_guidance.keys()),
        "status": result.status,
        "stage": result.stage.value,
        "has_message": result.message is not None,
        "has_payload": result.payload is not None,
    }
