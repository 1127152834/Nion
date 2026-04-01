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
    NORMALIZE_INPUT = "normalize_input"
    VALIDATE_INPUT = "validate_input"
    CHECK_POLICY = "check_policy"
    PRE_HOOKS = "pre_hooks"
    REQUEST_PERMISSION = "request_permission"
    EXECUTE = "execute"
    POST_HOOKS = "post_hooks"
    FAILURE_HOOKS = "failure_hooks"
    NORMALIZE_RESULT = "normalize_result"


@dataclass(slots=True)
class ToolRuntimeResult:
    stage: ToolExecutionStage
    status: Literal["success", "denied", "approval_required", "failed", "blocked"]
    tool_name: str
    tool_call_id: str | None
    message: str | None = None
    payload: dict[str, Any] | None = None
