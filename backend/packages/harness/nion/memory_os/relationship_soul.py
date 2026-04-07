from __future__ import annotations

from .repository import MemoryOSRepository
from .soul_artifacts import MemoryOSSoulArtifactStore
from .soul_events import record_soul_event


def build_relationship_soul_summary(repository: MemoryOSRepository) -> str | None:
    records = repository.list_memory_records(domain="relationship", status="active")
    if not records:
        return None
    return "；".join(str(record["summary"]) for record in records[:2])


def refresh_relationship_soul(
    repository: MemoryOSRepository,
    *,
    created_at: str,
) -> dict[str, object]:
    records = repository.list_memory_records(domain="relationship", status="active")
    summary = build_relationship_soul_summary(repository)
    if not summary:
        raise ValueError("No active relationship records available for soul refresh")

    body = "\n".join(
        [
            "# Relationship Soul",
            "",
            "## Current Stance",
            summary,
        ]
    )
    source_relationship_ids = [str(item["memory_id"]) for item in records[:2]]
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
