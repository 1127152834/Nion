from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from .models import EventRecord


def make_event(
    *,
    category: str,
    level: Literal["info", "warning", "error"],
    event_type: str,
    actor: str,
    message: str,
    details: dict[str, Any] | None = None,
    thread_id: str | None = None,
    client_id: str | None = None,
    run_id: str | None = None,
    tool_name: str | None = None,
    skill_name: str | None = None,
    duration_ms: int | None = None,
) -> EventRecord:
    return EventRecord(
        event_id=str(uuid4()),
        category=category,
        level=level,
        event_type=event_type,
        actor=actor,
        message=message,
        details=details or {},
        thread_id=thread_id,
        client_id=client_id,
        run_id=run_id,
        tool_name=tool_name,
        skill_name=skill_name,
        duration_ms=duration_ms,
    )
