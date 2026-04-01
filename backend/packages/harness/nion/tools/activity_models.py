from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Literal


class ToolActivityKind(StrEnum):
    TOOL_STARTED = "tool_started"
    TOOL_PROGRESS = "tool_progress"
    TOOL_COMPLETED = "tool_completed"
    TOOL_FAILED = "tool_failed"
    TOOL_BATCH_SUMMARY = "tool_batch_summary"


ToolActivityVisibility = Literal["full", "compact", "diagnostic_only"]


@dataclass(slots=True)
class ToolActivityEvent:
    event_id: str
    kind: ToolActivityKind
    tool_name: str
    tool_call_id: str | None = None
    thread_id: str | None = None
    run_id: str | None = None
    task_id: str | None = None
    subtask_id: str | None = None
    group_id: str | None = None
    timestamp: str = ""
    activity_label: str = ""
    summary_label: str = ""
    result_class: str = "generic"
    detail: dict[str, Any] = field(default_factory=dict)
    visibility: ToolActivityVisibility = "full"


@dataclass(slots=True)
class ToolActivityBatch:
    group_id: str
    thread_id: str
    tool_names: list[str]
    events: list[ToolActivityEvent]
    summary: ToolActivityEvent | None
    run_id: str | None = None
    task_id: str | None = None
    subtask_id: str | None = None
