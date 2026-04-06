from __future__ import annotations

from .repository import MemoryOSRepository


def build_relationship_soul_summary(repository: MemoryOSRepository) -> str | None:
    records = repository.list_memory_records(domain="relationship", status="active")
    if not records:
        return None
    return "；".join(str(record["summary"]) for record in records[:2])
