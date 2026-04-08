from __future__ import annotations

from nion.memory.soul.service import archive_canonical_soul_layer, write_canonical_soul_layer
from .clock import utcnow_z
from .repository import MemoryOSRepository
from .soul_artifacts import MemoryOSSoulArtifactStore
from .soul_events import record_soul_event


def accept_soul_proposal(
    repository: MemoryOSRepository,
    memory_id: str,
    *,
    created_at: str | None = None,
) -> dict[str, object]:
    created_at = created_at or utcnow_z()
    proposal = _find_record(repository, domain="soul", memory_id=memory_id)
    repository.update_memory_status(memory_id, "archived", updated_at=created_at)
    existing_overlay = next(
        (
            row
            for row in repository.list_memory_records(domain="soul")
            if row["memory_id"] == "soul_overlay_active_main" and row["status"] == "active"
        ),
        None,
    )
    if existing_overlay is not None:
        repository.update_memory_status("soul_overlay_active_main", "archived", updated_at=created_at)
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
    write_canonical_soul_layer(
        repository,
        layer="adaptive_overlay",
        summary=str(proposal["summary"]),
        created_at=created_at,
        payload={
            "source_memory_id": memory_id,
            "artifact_uri": overlay["artifact_uri"],
            "governance_action": "accept",
        },
    )
    record_soul_event(
        repository,
        event_type="proposal_accepted",
        memory_id=memory_id,
        summary=str(proposal["summary"]),
        created_at=created_at,
        related_memory_id="soul_overlay_active_main",
        source="soul_governance",
        metadata={
            "canonical_memory_id": "soul_overlay_active_main",
            "governance_action": "accept",
        },
    )
    return {"memory_id": memory_id, "action": "accept", "overlay": overlay}


def reject_soul_proposal(
    repository: MemoryOSRepository,
    memory_id: str,
    *,
    created_at: str | None = None,
) -> dict[str, object]:
    created_at = created_at or utcnow_z()
    proposal = _find_record(repository, domain="soul", memory_id=memory_id)
    repository.update_memory_status(memory_id, "invalidated", updated_at=created_at)
    record_soul_event(
        repository,
        event_type="proposal_rejected",
        memory_id=memory_id,
        summary=str(proposal["summary"]),
        created_at=created_at,
        source="soul_governance",
    )
    return {"memory_id": memory_id, "action": "reject"}


def rollback_soul_overlay(
    repository: MemoryOSRepository,
    *,
    created_at: str | None = None,
) -> dict[str, object]:
    created_at = created_at or utcnow_z()
    overlay = _find_record(repository, domain="soul", memory_id="soul_overlay_active_main")
    if overlay["status"] != "active":
        return {"memory_id": overlay["memory_id"], "action": "rollback"}
    repository.update_memory_status(str(overlay["memory_id"]), "archived", updated_at=created_at)
    archive_canonical_soul_layer(
        repository,
        layer="adaptive_overlay",
        updated_at=created_at,
        metadata={"governance_action": "rollback"},
    )
    record_soul_event(
        repository,
        event_type="overlay_rollback",
        memory_id=str(overlay["memory_id"]),
        summary=str(overlay["summary"]),
        created_at=created_at,
        source="soul_governance",
        metadata={
            "canonical_memory_id": str(overlay["memory_id"]),
            "governance_action": "rollback",
        },
    )
    return {"memory_id": overlay["memory_id"], "action": "rollback"}


def list_soul_events(repository: MemoryOSRepository) -> list[dict[str, object]]:
    return [event.model_dump() for event in repository.list_soul_events()]


def promote_identity_narrative(
    repository: MemoryOSRepository,
    *,
    staged_memory_id: str,
    created_at: str,
) -> dict[str, object]:
    staged = _find_record(repository, domain="agent_self", memory_id=staged_memory_id)
    repository.update_memory_status(staged_memory_id, "archived", updated_at=created_at)
    promoted_artifact = MemoryOSSoulArtifactStore(
        repository=repository,
        base_dir=repository._db_path.parent.parent,
    ).write_identity_narrative(
        body=_load_artifact_body(repository, staged),
        created_at=created_at,
        staged=False,
        canonical_payload={
            "source_memory_id": staged_memory_id,
            "governance_action": "promote",
        },
    )
    promoted = promoted_artifact["memory_record"]
    promoted["provenance"] = {
        **dict(promoted.get("provenance", {})),
        "source_type": "governance_promotion",
        "generated_by": "promote_identity_narrative",
        "source_memory_id": staged_memory_id,
    }
    repository.save_memory_record(promoted)
    record_soul_event(
        repository,
        event_type="identity_narrative_promoted",
        memory_id="agent_self_narrative_main",
        related_memory_id=staged_memory_id,
        summary=str(promoted["summary"]),
        created_at=created_at,
        source="soul_governance",
        metadata={
            "artifact_uri": promoted["artifact_uri"],
            "promoted_from": staged_memory_id,
            "canonical_memory_id": "agent_self_narrative_main",
        },
    )
    return {"memory_id": "agent_self_narrative_main", "action": "promote", "memory_record": promoted}


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


def _load_artifact_body(repository: MemoryOSRepository, record: dict[str, object]) -> str:
    artifact_uri = str(record.get("artifact_uri") or "")
    if artifact_uri.endswith("staged_identity_narrative.md"):
        path = (
            repository._db_path.parent.parent
            / "memory-os"
            / "artifacts"
            / "agent-self"
            / "narrative"
            / "staged_identity_narrative.md"
        )
        if path.exists():
            return path.read_text(encoding="utf-8")
    return f"# Identity Narrative\n\n## Who I Am\n{record['summary']}\n"
