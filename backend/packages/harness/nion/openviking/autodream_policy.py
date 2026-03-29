from __future__ import annotations

from datetime import UTC, datetime


def _parse(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def should_run_autodream(
    *,
    last_run_at: str | None,
    session_count_since_last_run: int,
    now: str | None = None,
) -> bool:
    if last_run_at is None:
        return session_count_since_last_run >= 5

    if session_count_since_last_run < 5:
        return False

    current = _parse(now) if now is not None else datetime.now(UTC)
    previous = _parse(last_run_at)
    return (current - previous).total_seconds() >= 24 * 60 * 60
