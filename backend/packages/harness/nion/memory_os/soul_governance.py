from __future__ import annotations

from .repository import MemoryOSRepository


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
    return {"memory_id": memory_id, "action": "accept", "overlay": overlay}


def reject_soul_proposal(repository: MemoryOSRepository, memory_id: str) -> dict[str, object]:
    _find_record(repository, domain="soul", memory_id=memory_id)
    repository.update_memory_status(memory_id, "invalidated")
    return {"memory_id": memory_id, "action": "reject"}


def rollback_soul_overlay(repository: MemoryOSRepository) -> dict[str, object]:
    overlay = _find_record(repository, domain="soul", memory_id="soul_overlay_active_main")
    repository.update_memory_status(str(overlay["memory_id"]), "archived")
    return {"memory_id": overlay["memory_id"], "action": "rollback"}


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
