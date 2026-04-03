from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Literal


@dataclass(slots=True)
class ToolExecutionTraits:
    read_only: bool = False
    destructive: bool = False
    approval_required: bool = False
    discoverable_only: bool = False
    supports_deferred_schema: bool = False
    supports_updated_input: bool = True


class ToolExecutionStage(StrEnum):
    LOOKUP = "lookup"
    SCHEMA_PARSE = "schema_parse"
    VALIDATE_INPUT = "validate_input"
    PRE_TOOL_USE_HOOK = "pre_tool_use_hook"
    PERMISSION_DECISION = "permission_decision"
    EXECUTE = "execute"
    POST_TOOL_USE_HOOK = "post_tool_use_hook"
    POST_TOOL_USE_FAILURE_HOOK = "post_tool_use_failure_hook"
    RESULT_NORMALIZATION = "result_normalization"
    ACTIVITY_PROJECTION = "activity_projection"


@dataclass(slots=True)
class ToolRuntimeResult:
    stage: ToolExecutionStage
    status: Literal["success", "denied", "approval_required", "failed", "blocked"]
    tool_name: str
    tool_call_id: str | None
    message: str | None = None
    payload: dict[str, Any] | None = None
