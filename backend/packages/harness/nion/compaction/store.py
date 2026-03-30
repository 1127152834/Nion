from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from nion.compaction.models import CompactionLog


class CompactionStore:
    def __init__(self, db_path: str | Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS compaction_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    message_count INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT NOT NULL DEFAULT '',
                    usage_json TEXT NOT NULL DEFAULT '{}',
                    model_id TEXT,
                    started_at TEXT NOT NULL,
                    completed_at TEXT
                )
                """
            )

    def append_log(
        self,
        *,
        status: str,
        summary: str,
        message_count: int,
        error_message: str = "",
        usage: dict[str, int] | None = None,
        model_id: str | None = None,
        started_at: str = "",
        completed_at: str | None = None,
    ) -> CompactionLog:
        log = CompactionLog(
            status=status,
            summary=summary,
            message_count=message_count,
            error_message=error_message,
            usage=usage,
            model_id=model_id,
            started_at=started_at,
            completed_at=completed_at,
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO compaction_logs (
                    status, summary, message_count, error_message, usage_json, model_id, started_at, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log.status,
                    log.summary,
                    log.message_count,
                    log.error_message,
                    json.dumps(log.usage or {}, ensure_ascii=False),
                    log.model_id,
                    log.started_at,
                    log.completed_at,
                ),
            )
        return log

    def list_logs(self, *, limit: int, offset: int) -> list[CompactionLog]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT status, summary, message_count, error_message, usage_json, model_id, started_at, completed_at
                FROM compaction_logs
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()
        return [
            CompactionLog(
                status=row["status"],
                summary=row["summary"],
                message_count=row["message_count"],
                error_message=row["error_message"],
                usage=json.loads(row["usage_json"]),
                model_id=row["model_id"],
                started_at=row["started_at"],
                completed_at=row["completed_at"],
            )
            for row in rows
        ]

    def count_logs(self) -> int:
        with self._connect() as connection:
            row = connection.execute("SELECT COUNT(*) AS count FROM compaction_logs").fetchone()
        return int(row["count"]) if row is not None else 0

    def delete_logs(self) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM compaction_logs")
