from __future__ import annotations

from .runtime_models import ToolExecutionStage, ToolRuntimeResult


def build_tool_runtime_metadata(
    *,
    status: str,
    stage: ToolExecutionStage,
    tool_name: str,
    tool_call_id: str | None,
    message: str | None = None,
    reason_code: str | None = None,
) -> dict[str, str]:
    metadata = {
        "status": status,
        "stage": stage.value,
        "tool_name": tool_name,
        "tool_call_id": tool_call_id or "",
    }
    if message:
        metadata["message"] = message
    if reason_code:
        metadata["reason_code"] = reason_code
    return metadata


def build_tool_runtime_result(
    *,
    status: str,
    stage: ToolExecutionStage,
    tool_name: str,
    tool_call_id: str | None,
    message: str | None = None,
    payload: dict | None = None,
) -> ToolRuntimeResult:
    return ToolRuntimeResult(
        stage=stage,
        status=status,  # type: ignore[arg-type]
        tool_name=tool_name,
        tool_call_id=tool_call_id,
        message=message,
        payload=payload,
    )
