from __future__ import annotations

import uuid

from .repository import MemoryOSRepository
from .soul_events import SoulEventRecord


def accept_soul_proposal(
    repository: MemoryOSRepository,
    memory_id: str,
    *,
    created_at: str,
) -> dict[str, object]:
    proposal = _find_record(repository, domain="soul", memory_id=memory_id)
    repository.update_memory_status(memory_id, "archived")
    overlay = {
        "memory_id": "soul_overlay_active_main",
        "domain": "soul",
        "subtype": "adaptive_overlay",
        "owner_type": "agent",
        "scope": "agent",
        "memory_type": "semantic",
        "subject_id": "agent:main",
        "target_id": "agent:main",
        "status": "active",
        "title": "当前生效的 adaptive soul overlay",
        "summary": str(proposal["summary"]),
        "confidence": float(proposal["confidence"]),
        "created_at": created_at,
        "updated_at": created_at,
        "artifact_uri": "nion://memory-os/artifacts/soul/overlays/active_overlay.md",
        "provenance": {
            "source_type": "governance_acceptance",
            "generated_by": "accept_soul_proposal",
            "source_memory_id": memory_id,
        },
    }
    repository.save_memory_record(overlay)
    repository.save_soul_event(
        SoulEventRecord(
            event_id=f"soul_evt_{uuid.uuid4().hex[:10]}",
            event_type="proposal_accepted",
            memory_id=memory_id,
            summary=str(proposal["summary"]),
            created_at=created_at,
        )
    )
    return {"memory_id": memory_id, "action": "accept", "overlay": overlay}


def reject_soul_proposal(
    repository: MemoryOSRepository,
    memory_id: str,
    *,
    created_at: str = "2026-04-07T00:00:00Z",
) -> dict[str, object]:
    proposal = _find_record(repository, domain="soul", memory_id=memory_id)
    repository.update_memory_status(memory_id, "invalidated")
    repository.save_soul_event(
        SoulEventRecord(
            event_id=f"soul_evt_{uuid.uuid4().hex[:10]}",
            event_type="proposal_rejected",
            memory_id=memory_id,
            summary=str(proposal["summary"]),
            created_at=created_at,
        )
    )
    return {"memory_id": memory_id, "action": "reject"}


def rollback_soul_overlay(
    repository: MemoryOSRepository,
    *,
    created_at: str = "2026-04-07T00:00:00Z",
) -> dict[str, object]:
    overlay = _find_record(repository, domain="soul", memory_id="soul_overlay_active_main")
    repository.update_memory_status(str(overlay["memory_id"]), "archived")
    repository.save_soul_event(
        SoulEventRecord(
            event_id=f"soul_evt_{uuid.uuid4().hex[:10]}",
            event_type="overlay_rollback",
            memory_id=str(overlay["memory_id"]),
            summary=str(overlay["summary"]),
            created_at=created_at,
        )
    )
    return {"memory_id": overlay["memory_id"], "action": "rollback"}


def list_soul_events(repository: MemoryOSRepository) -> list[dict[str, object]]:
    return [event.model_dump() for event in repository.list_soul_events()]


def _find_record(
    repository: MemoryOSRepository,
    *,
    domain: str,
    memory_id: str,
) -> dict[str, object]:
    record = next(
        (row for row in repository.list_memory_records(domain=domain) if row["memory_id"] == memory_id),
        None,
    )
    if record is None:
        raise KeyError(memory_id)
    return record
