from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from nion.openviking.models import NotebookResourceRecord


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class OpenVikingResourceStore:
    def __init__(self, resources_db_file: str | Path) -> None:
        self._db_file = Path(resources_db_file)
        self._db_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_file)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode=WAL;")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS notebook_resources (
                    resource_uri TEXT PRIMARY KEY,
                    note_id TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    source_relative_path TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    indexed_at TEXT NOT NULL
                )
                """
            )

    def upsert_notebook_note(
        self,
        *,
        resource_uri: str,
        note_id: str,
        title: str,
        source_relative_path: str,
        content_hash: str,
        updated_at: str,
    ) -> NotebookResourceRecord:
        indexed_at = _now_iso()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO notebook_resources(
                    resource_uri,
                    note_id,
                    title,
                    source_relative_path,
                    content_hash,
                    updated_at,
                    indexed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(resource_uri) DO UPDATE SET
                    note_id = excluded.note_id,
                    title = excluded.title,
                    source_relative_path = excluded.source_relative_path,
                    content_hash = excluded.content_hash,
                    updated_at = excluded.updated_at,
                    indexed_at = excluded.indexed_at
                """,
                (
                    resource_uri,
                    note_id,
                    title,
                    source_relative_path,
                    content_hash,
                    updated_at,
                    indexed_at,
                ),
            )
        return NotebookResourceRecord(
            resource_uri=resource_uri,
            note_id=note_id,
            title=title,
            source_relative_path=source_relative_path,
            content_hash=content_hash,
            updated_at=updated_at,
            indexed_at=indexed_at,
        )

    def get_by_note_id(self, note_id: str) -> NotebookResourceRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM notebook_resources WHERE note_id = ?",
                (note_id,),
            ).fetchone()
        if row is None:
            return None
        return NotebookResourceRecord.model_validate(dict(row))

    def list_resources(self) -> list[NotebookResourceRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM notebook_resources ORDER BY source_relative_path ASC",
            ).fetchall()
        return [NotebookResourceRecord.model_validate(dict(row)) for row in rows]
