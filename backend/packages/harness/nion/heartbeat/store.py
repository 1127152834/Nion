from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from nion.heartbeat.models import HeartbeatLog, HeartbeatStatus


class HeartbeatStore:
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
                CREATE TABLE IF NOT EXISTS heartbeat_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    bot_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    details_json TEXT NOT NULL DEFAULT '{}'
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS heartbeat_state (
                    singleton_key TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL
                )
                """
            )

    def append_log(
        self,
        *,
        bot_id: str,
        status: str,
        summary: str,
        started_at: str = "",
        finished_at: str | None = None,
        details: dict[str, object] | None = None,
    ) -> HeartbeatLog:
        log = HeartbeatLog(
            bot_id=bot_id,
            status=status,
            summary=summary,
            started_at=started_at,
            finished_at=finished_at,
            details=details or {},
        )
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO heartbeat_logs (
                    bot_id, status, summary, started_at, finished_at, details_json
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    log.bot_id,
                    log.status,
                    log.summary,
                    log.started_at,
                    log.finished_at,
                    json.dumps(log.details, ensure_ascii=False),
                ),
            )
        return log

    def list_logs(self, *, bot_id: str, limit: int, offset: int) -> list[HeartbeatLog]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT bot_id, status, summary, started_at, finished_at, details_json
                FROM heartbeat_logs
                WHERE bot_id = ?
                ORDER BY id DESC
                LIMIT ? OFFSET ?
                """,
                (bot_id, limit, offset),
            ).fetchall()
        return [
            HeartbeatLog(
                bot_id=row["bot_id"],
                status=row["status"],
                summary=row["summary"],
                started_at=row["started_at"],
                finished_at=row["finished_at"],
                details=json.loads(row["details_json"]),
            )
            for row in rows
        ]

    def delete_logs(self, *, bot_id: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "DELETE FROM heartbeat_logs WHERE bot_id = ?",
                (bot_id,),
            )

    def load_status(self) -> HeartbeatStatus:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM heartbeat_state WHERE singleton_key = 'default'",
            ).fetchone()
        if row is None:
            return HeartbeatStatus()
        return HeartbeatStatus.model_validate_json(row["payload_json"])

    def save_status(self, status: HeartbeatStatus) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO heartbeat_state (singleton_key, payload_json)
                VALUES ('default', ?)
                ON CONFLICT(singleton_key) DO UPDATE SET
                    payload_json = excluded.payload_json
                """,
                (status.model_dump_json(),),
            )
