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


@dataclass(slots=True)
class IncidentRecord:
    incident_id: str
    source: Literal["chat", "desktop_button", "automatic"]
    incident_type: str
    severity: Literal["info", "warning", "error"]
    status: Literal["open", "resolved", "dismissed"]
    summary: str
    user_visible_explanation: str
    root_cause_hypothesis: str | None = None
    confidence: float | None = None
    thread_id: str | None = None
    run_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    recommended_actions: list[dict[str, Any]] = field(default_factory=list)
    executed_actions: list[dict[str, Any]] = field(default_factory=list)
    evidence: dict[str, Any] = field(default_factory=dict)
    resolution_note: str | None = None
