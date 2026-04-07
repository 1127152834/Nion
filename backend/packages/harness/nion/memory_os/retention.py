from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .repository import MemoryOSRepository

_ARCHIVE_AFTER = timedelta(days=180)
_PURGE_AFTER = timedelta(days=365)


def run_retention_cycle(
    repository: MemoryOSRepository,
    *,
    now: str,
) -> dict[str, int]:
    current = _parse_z_datetime(now)
    archived_count = 0
    purged_count = 0

    for row in repository.list_memory_records():
        updated_at = row.get("updated_at")
        if not updated_at:
            continue

        age = current - _parse_z_datetime(str(updated_at))
        memory_id = str(row["memory_id"])
        status = str(row["status"])

        if status == "active" and age >= _ARCHIVE_AFTER:
            repository.update_memory_status(memory_id, "archived", updated_at=now)
            archived_count += 1
            continue

        if status == "archived" and age >= _PURGE_AFTER:
            repository.update_memory_status(memory_id, "purged", updated_at=now)
            purged_count += 1

    return {
        "archived_count": archived_count,
        "purged_count": purged_count,
    }


def _parse_z_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
