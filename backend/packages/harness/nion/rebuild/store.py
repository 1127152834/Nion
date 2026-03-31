from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from nion.rebuild.models import RebuildLog


class RebuildStore:
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
                CREATE TABLE IF NOT EXISTS rebuild_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    source_count INTEGER NOT NULL DEFAULT 0,
                    restored_count INTEGER NOT NULL DEFAULT 0,
                    skipped_count INTEGER NOT NULL DEFAULT 0,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    details_json TEXT NOT NULL DEFAULT '{}'
                )
                """
            )

    def append_log(
        self,
        *,
        status: str,
        summary: str,
        source_count: int,
        restored_count: int = 0,
        skipped_count: int = 0,
        started_at: str = "",
        completed_at: str | None = None,
        details: dict[str, object] | None = None,
    ) -> RebuildLog:
        log = RebuildLog(
            status=status,
            summary=summary,
            source_count=source_count,
            restored_count=restored_count,
            skipped_count=skipped_count,
            started_at=started_at,
            completed_at=completed_at,
            details=details or {},
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO rebuild_logs (
                    status, summary, source_count, restored_count, skipped_count, started_at, completed_at, details_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log.status,
                    log.summary,
                    log.source_count,
                    log.restored_count,
                    log.skipped_count,
                    log.started_at,
                    log.completed_at,
                    json.dumps(log.details, ensure_ascii=False),
                ),
            )
        return log

    def list_logs(self, *, limit: int, offset: int) -> list[RebuildLog]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT status, summary, source_count, restored_count, skipped_count, started_at, completed_at, details_json
                FROM rebuild_logs
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()
        return [
            RebuildLog(
                status=row["status"],
                summary=row["summary"],
                source_count=row["source_count"],
                restored_count=row["restored_count"],
                skipped_count=row["skipped_count"],
                started_at=row["started_at"],
                completed_at=row["completed_at"],
                details=json.loads(row["details_json"]),
            )
            for row in rows
        ]

    def count_logs(self) -> int:
        with self._connect() as connection:
            row = connection.execute("SELECT COUNT(*) AS count FROM rebuild_logs").fetchone()
        return int(row["count"]) if row is not None else 0

    def delete_logs(self) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM rebuild_logs")
