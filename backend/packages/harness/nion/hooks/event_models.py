from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Literal


class HookEvent(StrEnum):
    SESSION_START = "session_start"
    USER_PROMPT_SUBMIT = "user_prompt_submit"
    PRE_TOOL_USE = "pre_tool_use"
    PERMISSION_REQUEST = "permission_request"
    PERMISSION_DENIED = "permission_denied"
    POST_TOOL_USE = "post_tool_use"
    POST_TOOL_USE_FAILURE = "post_tool_use_failure"
    STOP = "stop"
    STOP_FAILURE = "stop_failure"
    SESSION_END = "session_end"
    SUBAGENT_START = "subagent_start"
    SUBAGENT_STOP = "subagent_stop"
    NOTIFICATION = "notification"
    PRE_COMPACT = "pre_compact"
    POST_COMPACT = "post_compact"
    CONFIG_CHANGE = "config_change"
    CWD_CHANGED = "cwd_changed"
    FILE_CHANGED = "file_changed"


class HookExecutionMode(StrEnum):
    IN_RUNTIME = "in_runtime"
    OUT_OF_RUNTIME = "out_of_runtime"


@dataclass(slots=True)
class HookInput:
    event: HookEvent
    thread_id: str | None
    agent_id: str | None
    agent_kind: str | None
    surface: str | None
    timestamp: str
    payload: dict[str, Any]


@dataclass(slots=True)
class HookResult:
    event: HookEvent
    mode: HookExecutionMode
    continue_execution: bool = True
    stop_reason: str | None = None
    updated_input: dict[str, Any] | None = None
    permission_behavior: Literal["allow", "deny", "ask"] | None = None
    additional_context: str | None = None
    side_effects: dict[str, Any] | None = None
