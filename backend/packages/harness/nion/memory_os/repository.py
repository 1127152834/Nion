from __future__ import annotations

import sqlite3
from pathlib import Path


class MemoryOSRepository:
    def __init__(self, db_path: str | Path) -> None:
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS memory_records (
                    memory_id TEXT PRIMARY KEY,
                    domain TEXT NOT NULL,
                    subtype TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    subject_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    provenance_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS candidate_records (
                    candidate_id TEXT PRIMARY KEY,
                    proposed_domain TEXT NOT NULL,
                    proposed_subtype TEXT NOT NULL,
                    owner_type TEXT NOT NULL,
                    scope TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    producer TEXT NOT NULL
                );
                """
            )

    def healthcheck(self) -> dict[str, object]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            ).fetchall()
        return {"ok": True, "tables": [row["name"] for row in rows]}
