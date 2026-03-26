from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .models import DiagnosticSnapshot, EventRecord


class TelemetryStore:
    def __init__(self, path: Path) -> None:
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _initialize(self) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS event_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    category TEXT NOT NULL,
                    level TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    thread_id TEXT,
                    client_id TEXT,
                    run_id TEXT,
                    actor TEXT NOT NULL,
                    message TEXT NOT NULL,
                    tool_name TEXT,
                    skill_name TEXT,
                    duration_ms INTEGER,
                    details_json TEXT NOT NULL DEFAULT '{}'
                )
                """
            )
            conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_event_log_event_id ON event_log(event_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_event_log_category ON event_log(category)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_event_log_level ON event_log(level)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_event_log_thread_id ON event_log(thread_id)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_event_log_timestamp ON event_log(timestamp)"
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS diagnostic_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scope_type TEXT NOT NULL,
                    scope_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    details_json TEXT NOT NULL DEFAULT '{}',
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(scope_type, scope_id)
                )
                """
            )

    def record_event(self, record: EventRecord) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                INSERT INTO event_log(
                    event_id,
                    category,
                    level,
                    event_type,
                    thread_id,
                    client_id,
                    run_id,
                    actor,
                    message,
                    tool_name,
                    skill_name,
                    duration_ms,
                    details_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.event_id,
                    record.category,
                    record.level,
                    record.event_type,
                    record.thread_id,
                    record.client_id,
                    record.run_id,
                    record.actor,
                    record.message,
                    record.tool_name,
                    record.skill_name,
                    record.duration_ms,
                    json.dumps(record.details, ensure_ascii=False, sort_keys=True),
                ),
            )

    def list_events(
        self,
        *,
        limit: int = 50,
        category: str | None = None,
        level: str | None = None,
        thread_id: str | None = None,
        skill_name: str | None = None,
    ) -> list[EventRecord]:
        conditions: list[str] = []
        params: list[object] = []
        if category is not None:
            conditions.append("category = ?")
            params.append(category)
        if level is not None:
            conditions.append("level = ?")
            params.append(level)
        if thread_id is not None:
            conditions.append("thread_id = ?")
            params.append(thread_id)
        if skill_name is not None:
            conditions.append("skill_name = ?")
            params.append(skill_name)

        query = """
            SELECT event_id, timestamp, category, level, event_type, thread_id, client_id, run_id,
                   actor, message, tool_name, skill_name, duration_ms, details_json
            FROM event_log
        """
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(query, tuple(params)).fetchall()

        return [
            EventRecord(
                event_id=row["event_id"],
                timestamp=row["timestamp"],
                category=row["category"],
                level=row["level"],
                event_type=row["event_type"],
                thread_id=row["thread_id"],
                client_id=row["client_id"],
                run_id=row["run_id"],
                actor=row["actor"],
                message=row["message"],
                tool_name=row["tool_name"],
                skill_name=row["skill_name"],
                duration_ms=row["duration_ms"],
                details=json.loads(row["details_json"]),
            )
            for row in rows
        ]

    def upsert_snapshot(self, snapshot: DiagnosticSnapshot) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                INSERT INTO diagnostic_snapshots(
                    scope_type,
                    scope_id,
                    status,
                    summary,
                    details_json
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(scope_type, scope_id) DO UPDATE SET
                    status = excluded.status,
                    summary = excluded.summary,
                    details_json = excluded.details_json,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    snapshot.scope_type,
                    snapshot.scope_id,
                    snapshot.status,
                    snapshot.summary,
                    json.dumps(snapshot.details, ensure_ascii=False, sort_keys=True),
                ),
            )

    def get_snapshot(self, scope_type: str, scope_id: str) -> DiagnosticSnapshot:
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                """
                SELECT scope_type, scope_id, status, summary, updated_at, details_json
                FROM diagnostic_snapshots
                WHERE scope_type = ? AND scope_id = ?
                """,
                (scope_type, scope_id),
            ).fetchone()
        if row is None:
            raise LookupError(f"{scope_type}:{scope_id}")
        return DiagnosticSnapshot(
            scope_type=row["scope_type"],
            scope_id=row["scope_id"],
            status=row["status"],
            summary=row["summary"],
            updated_at=row["updated_at"],
            details=json.loads(row["details_json"]),
        )
