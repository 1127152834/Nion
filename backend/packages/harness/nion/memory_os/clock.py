from __future__ import annotations

from datetime import datetime, timezone


def utcnow_z() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
