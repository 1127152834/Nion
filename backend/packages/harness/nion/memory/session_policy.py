from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, frozen=True)
class MemorySessionPolicy:
    session_mode: str | None
    memory_read: bool
    memory_write: bool
    allow_memory_read: bool
    allow_memory_write: bool
    allow_durable_evidence: bool


def resolve_memory_session_policy(context: Mapping[str, Any] | None) -> MemorySessionPolicy:
    session = dict(context or {})
    memory_read = bool(session.get("memory_read", True))
    memory_write = bool(session.get("memory_write", True))

    return MemorySessionPolicy(
        session_mode=session.get("session_mode"),
        memory_read=memory_read,
        memory_write=memory_write,
        allow_memory_read=memory_read,
        allow_memory_write=memory_write,
        allow_durable_evidence=memory_write,
    )
