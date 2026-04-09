from __future__ import annotations

from .repository import MemoryOSRepository
from .soul_artifacts import MemoryOSSoulArtifactStore
from .soul_events import record_soul_event


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
            "transition": "promote_identity_narrative",
        },
    )
    promoted = promoted_artifact["memory_record"]
    promoted["provenance"] = {
        **dict(promoted.get("provenance", {})),
        "source_type": "narrative_promotion",
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
        source="soul_transitions",
        metadata={
            "artifact_uri": promoted["artifact_uri"],
            "promoted_from": staged_memory_id,
            "canonical_memory_id": "agent_self_narrative_main",
        },
    )
    return {
        "memory_id": "agent_self_narrative_main",
        "action": "promote",
        "memory_record": promoted,
    }


def _find_record(
    repository: MemoryOSRepository,
    *,
    domain: str,
    memory_id: str,
) -> dict[str, object]:
    record = next(
        (
            row
            for row in repository.list_memory_records(domain=domain)
            if row["memory_id"] == memory_id
        ),
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
