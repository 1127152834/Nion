from __future__ import annotations

import json
from collections.abc import Generator, Iterable
from typing import Any


def normalize_stream_event(event: str, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "event": event,
        **data,
    }


def iter_sse_events(lines: Iterable[str]) -> Generator[dict[str, Any], None, None]:
    event = "message"
    data_lines: list[str] = []

    for line in lines:
        stripped = line.rstrip("\n")
        if not stripped:
            payload = json.loads("\n".join(data_lines)) if data_lines else {}
            yield normalize_stream_event(event, payload)
            event = "message"
            data_lines = []
            continue
        if stripped.startswith("event:"):
            event = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("data:"):
            data_lines.append(stripped.split(":", 1)[1].strip())
