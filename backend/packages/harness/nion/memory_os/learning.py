from __future__ import annotations

import uuid

from .clock import utcnow_z
from .repository import MemoryOSRepository


def create_learning_topic(
    repository: MemoryOSRepository,
    *,
    title: str,
    summary: str,
) -> dict[str, object]:
    memory_id = f"learn_{uuid.uuid4().hex[:10]}"
    timestamp = utcnow_z()
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
    repository.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": f"learning:topic:{memory_id}",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "learning",
            "status": "active",
            "summary": summary,
            "created_at": timestamp,
            "updated_at": timestamp,
            "metadata": {
                "domain": "learning",
                "subtype": "topic",
                "title": title,
            },
        }
    )
    repository.save_memory_revision(
        {
            "revision_id": f"{memory_id}:rev:1",
            "memory_id": memory_id,
            "revision_number": 1,
            "summary": summary,
            "evidence_ref": None,
            "created_at": timestamp,
            "payload": {
                "domain": "learning",
                "subtype": "topic",
                "title": title,
            },
        }
    )
    return payload
