from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass(slots=True)
class EventRecord:
    event_id: str
    category: str
    level: Literal["info", "warning", "error"]
    event_type: str
    actor: str
    message: str
    timestamp: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
    thread_id: str | None = None
    client_id: str | None = None
    run_id: str | None = None
    tool_name: str | None = None
    skill_name: str | None = None
    duration_ms: int | None = None


@dataclass(slots=True)
class DiagnosticSnapshot:
    scope_type: str
    scope_id: str
    status: Literal["healthy", "degraded", "error"]
    summary: str
    updated_at: str | None = None
    details: dict[str, Any] = field(default_factory=dict)
