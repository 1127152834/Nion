from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from nion.memory.runtime_trace.models import RuntimeTraceEvent


class MemoryLedgerStore:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def list_nodes(self) -> list[dict[str, object]]:
        if not self._db_path.exists():
            return []
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT memory_id, canonical_key, summary, status, updated_at
                FROM memory_nodes
                ORDER BY updated_at DESC, memory_id DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def list_current_revisions(self) -> list[dict[str, object]]:
        if not self._db_path.exists():
            return []
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT
                    memory_id,
                    revision_id,
                    revision_number,
                    summary,
                    evidence_ref,
                    created_at
                FROM memory_revisions
                ORDER BY memory_id ASC, revision_number DESC, created_at DESC, revision_id DESC
                """
            ).fetchall()

        current_revisions: list[dict[str, object]] = []
        seen_memory_ids: set[str] = set()
        for row in rows:
            memory_id = str(row["memory_id"])
            if memory_id in seen_memory_ids:
                continue
            seen_memory_ids.add(memory_id)
            current_revisions.append(dict(row))
        return current_revisions


class MemoryEvidenceStore:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def list_evidence(
        self,
        *,
        thread_id: str | None = None,
        source_type: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> dict[str, object]:
        if not self._db_path.exists():
            return {"items": [], "paging": {"limit": limit, "offset": offset, "total": 0}}

        where = ["purged_at IS NULL"]
        params: list[object] = []
        if thread_id is not None:
            where.append("thread_id = ?")
            params.append(thread_id)
        if source_type is not None:
            where.append("source_type = ?")
            params.append(source_type)
        where_sql = " AND ".join(where)

        with self._connect() as connection:
            total = connection.execute(
                f"SELECT COUNT(*) FROM evidence_documents WHERE {where_sql}",
                tuple(params),
            ).fetchone()[0]
            rows = connection.execute(
                f"""
                SELECT
                    evidence_id,
                    thread_id,
                    turn_id,
                    source_type,
                    actor,
                    durability_scope,
                    created_at,
                    artifact_uri,
                    content_normalized
                FROM evidence_documents
                WHERE {where_sql}
                ORDER BY created_at DESC, evidence_id DESC
                LIMIT ? OFFSET ?
                """,
                (*params, limit, offset),
            ).fetchall()

        items = [
            {
                "evidence_id": row["evidence_id"],
                "thread_id": row["thread_id"],
                "turn_id": row["turn_id"],
                "source_type": row["source_type"],
                "actor": row["actor"],
                "durability_scope": row["durability_scope"],
                "created_at": row["created_at"],
                "artifact_uri": row["artifact_uri"],
                "content_preview": _build_preview(str(row["content_normalized"])),
            }
            for row in rows
        ]
        return {
            "items": items,
            "paging": {"limit": limit, "offset": offset, "total": total},
        }


class RuntimeTraceStore:
    def __init__(self, trace_path: str | Path) -> None:
        self._trace_path = Path(trace_path)

    def list_events(
        self,
        *,
        thread_id: str | None = None,
        event_type: str | None = None,
        limit: int = 20,
    ) -> list[RuntimeTraceEvent]:
        if not self._trace_path.exists():
            return []

        events: list[RuntimeTraceEvent] = []
        for line in self._trace_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            payload = json.loads(line)
            event = RuntimeTraceEvent.model_validate(payload)
            if thread_id is not None and event.thread_id != thread_id:
                continue
            if event_type is not None and event.event_type != event_type:
                continue
            events.append(event)

        events.sort(key=lambda event: (event.created_at, event.event_id), reverse=True)
        return events[:limit]


def _build_preview(content: str, *, max_chars: int = 120) -> str:
    normalized = " ".join(content.split())
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 3] + "..."
