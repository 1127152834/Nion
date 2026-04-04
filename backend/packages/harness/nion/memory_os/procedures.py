from __future__ import annotations

import uuid
from datetime import UTC, datetime

from .repository import MemoryOSRepository


def create_procedure_draft(
    repository: MemoryOSRepository,
    *,
    title: str,
    summary: str,
) -> dict[str, object]:
    memory_id = f"proc_{uuid.uuid4().hex[:10]}"
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    payload = {
        "memory_id": memory_id,
        "domain": "procedure",
        "subtype": "draft",
        "owner_type": "agent",
        "scope": "user",
        "memory_type": "procedural",
        "subject_id": "user:default",
        "status": "candidate",
        "title": title,
        "summary": summary,
        "confidence": 0.75,
        "created_at": timestamp,
        "updated_at": timestamp,
        "provenance": {"source_type": "governance", "generated_by": "create_procedure_draft"},
    }
    repository.save_memory_record(payload)
    return payload
