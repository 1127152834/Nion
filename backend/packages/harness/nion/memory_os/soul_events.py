from __future__ import annotations

import uuid
from typing import Any

from .models import SoulEventRecord
from .repository import MemoryOSRepository


def make_soul_event(
    *,
    event_type: str,
    memory_id: str,
    summary: str,
    created_at: str,
    related_memory_id: str | None = None,
    actor: str | None = "agent:main",
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> SoulEventRecord:
    return SoulEventRecord(
        event_id=f"soul_evt_{uuid.uuid4().hex[:10]}",
        event_type=event_type,
        memory_id=memory_id,
        related_memory_id=related_memory_id,
        summary=summary,
        created_at=created_at,
        actor=actor,
        source=source,
        metadata=metadata or {},
    )


def record_soul_event(
    repository: MemoryOSRepository,
    *,
    event_type: str,
    memory_id: str,
    summary: str,
    created_at: str,
    related_memory_id: str | None = None,
    actor: str | None = "agent:main",
    source: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> SoulEventRecord:
    event = make_soul_event(
        event_type=event_type,
        memory_id=memory_id,
        related_memory_id=related_memory_id,
        summary=summary,
        created_at=created_at,
        actor=actor,
        source=source,
        metadata=metadata,
    )
    return repository.save_soul_event(event)


__all__ = ["SoulEventRecord", "make_soul_event", "record_soul_event"]
