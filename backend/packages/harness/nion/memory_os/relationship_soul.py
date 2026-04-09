from __future__ import annotations

from nion.memory.soul.service import (
    derive_relationship_stance_snapshot,
    write_canonical_relationship_memory,
)
from .clock import utcnow_z
from .repository import MemoryOSRepository
from .soul_artifacts import MemoryOSSoulArtifactStore
from .soul_events import record_soul_event


def build_relationship_soul_summary(repository: MemoryOSRepository) -> str | None:
    snapshot = derive_relationship_stance_snapshot(
        repository,
        now_z=utcnow_z(),
    )
    return None if snapshot is None else snapshot.summary


def refresh_relationship_soul(
    repository: MemoryOSRepository,
    *,
    created_at: str,
) -> dict[str, object]:
    snapshot = derive_relationship_stance_snapshot(repository, now_z=created_at)
    if snapshot is None:
        raise ValueError("No active relationship records available for soul refresh")
    summary = snapshot.summary
    source_relationship_ids = list(snapshot.payload.get("source_relationship_ids", []))
    write_canonical_relationship_memory(
        repository,
        summary=summary,
        created_at=created_at,
        source_relationship_ids=source_relationship_ids,
    )

    body = "\n".join(
        [
            "# Relationship Soul",
            "",
            "## Current Stance",
            summary,
        ]
    )
    artifact = MemoryOSSoulArtifactStore(
        repository=repository,
        base_dir=repository._db_path.parent.parent,
    ).write_relationship_soul(
        body=body,
        created_at=created_at,
        source_relationship_ids=source_relationship_ids,
    )
    record = artifact["memory_record"]
    record_soul_event(
        repository,
        event_type="relationship_soul_refreshed",
        memory_id=str(record["memory_id"]),
        summary=f"面对当前用户的关系姿态已刷新：{summary}",
        created_at=created_at,
        source="relationship_soul_writer",
        metadata={
            "artifact_uri": record["artifact_uri"],
            "source_relationship_ids": source_relationship_ids,
        },
    )
    return artifact
