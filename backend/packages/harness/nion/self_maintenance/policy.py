from __future__ import annotations

from datetime import UTC, datetime, timedelta


def should_run_reflective_maintenance(
    *,
    last_run_at: str | None,
    session_count_since_last_run: int,
    now: str,
) -> bool:
    if session_count_since_last_run >= 5 and last_run_at is None:
        return True
    if session_count_since_last_run < 5:
        return False

    try:
        last_run = datetime.fromisoformat(last_run_at.replace("Z", "+00:00"))
        current = datetime.fromisoformat(now.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        return False

    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=UTC)
    if current.tzinfo is None:
        current = current.replace(tzinfo=UTC)
    return current - last_run >= timedelta(hours=24)
