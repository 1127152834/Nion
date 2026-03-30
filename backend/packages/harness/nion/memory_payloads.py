from __future__ import annotations

from datetime import UTC, datetime
from typing import Any


def create_empty_memory_payload() -> dict[str, Any]:
    """Create the canonical empty memory payload shared by all runtimes."""

    return {
        "version": "1.0",
        "lastUpdated": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "user": {
            "workContext": {"summary": "", "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [],
    }
