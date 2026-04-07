from __future__ import annotations

import uuid
from datetime import UTC, datetime

from .repository import MemoryOSRepository


def create_learning_topic(
    repository: MemoryOSRepository,
    *,
    title: str,
    summary: str,
) -> dict[str, object]:
    memory_id = f"learn_{uuid.uuid4().hex[:10]}"
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    payload = {
        "memory_id": memory_id,
        "domain": "learning",
        "subtype": "topic",
        "owner_type": "agent",
        "scope": "user",
        "memory_type": "semantic",
        "subject_id": "user:default",
        "status": "active",
        "title": title,
        "summary": summary,
        "confidence": 0.8,
        "created_at": timestamp,
        "updated_at": timestamp,
        "provenance": {"source_type": "governance", "generated_by": "create_learning_topic"},
    }
    repository.save_memory_record(payload)
    return payload
