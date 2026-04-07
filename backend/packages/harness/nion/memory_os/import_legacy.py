from __future__ import annotations

import uuid
from typing import Any

from .repository import MemoryOSRepository


def _memory_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def import_legacy_memory_payload(
    repository: MemoryOSRepository,
    payload: dict[str, Any],
) -> dict[str, int]:
    created = 0

    user = payload.get("user", {}) if isinstance(payload.get("user"), dict) else {}
    history = payload.get("history", {}) if isinstance(payload.get("history"), dict) else {}
    facts = payload.get("facts", []) if isinstance(payload.get("facts"), list) else []

    def add_summary_record(
        *,
        subtype: str,
        summary: str,
        source_ref: str,
    ) -> None:
        nonlocal created
        if not summary.strip():
            return
        repository.save_memory_record(
            {
                "memory_id": _memory_id("mem"),
                "domain": "user_model",
                "subtype": subtype,
                "owner_type": "agent",
                "scope": "user",
                "memory_type": "semantic",
                "subject_id": "user:default",
                "status": "active",
                "summary": summary.strip(),
                "confidence": 0.8,
                "created_at": payload.get("lastUpdated") or "1970-01-01T00:00:00Z",
                "updated_at": payload.get("lastUpdated") or "1970-01-01T00:00:00Z",
                "provenance": {"source_type": "legacy_import", "source_ref": source_ref},
            }
        )
        created += 1

    for key in ("workContext", "personalContext", "topOfMind"):
        block = user.get(key, {}) if isinstance(user.get(key), dict) else {}
        add_summary_record(
            subtype=key,
            summary=str(block.get("summary") or ""),
            source_ref=f"legacy:user.{key}",
        )

    for key in ("recentMonths", "earlierContext", "longTermBackground"):
        block = history.get(key, {}) if isinstance(history.get(key), dict) else {}
        add_summary_record(
            subtype=key,
            summary=str(block.get("summary") or ""),
            source_ref=f"legacy:history.{key}",
        )

    for fact in facts:
        if not isinstance(fact, dict):
            continue
        content = str(fact.get("content") or "").strip()
        if not content:
            continue
        repository.save_memory_record(
            {
                "memory_id": str(fact.get("id") or _memory_id("fact")),
                "domain": "user_model",
                "subtype": str(fact.get("category") or "fact"),
                "owner_type": "agent",
                "scope": "user",
                "memory_type": "semantic",
                "subject_id": "user:default",
                "status": "active",
                "summary": content,
                "confidence": float(fact.get("confidence") or 0.5),
                "created_at": str(fact.get("createdAt") or payload.get("lastUpdated") or "1970-01-01T00:00:00Z"),
                "updated_at": str(fact.get("createdAt") or payload.get("lastUpdated") or "1970-01-01T00:00:00Z"),
                "provenance": {
                    "source_type": "legacy_import",
                    "source_ref": str(fact.get("source") or "legacy:fact"),
                },
            }
        )
        created += 1

    return {"records_created": created}
