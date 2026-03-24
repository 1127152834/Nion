from __future__ import annotations

import hashlib
import re
import sqlite3
from pathlib import Path

from nion.recall.models import RecallSearchResult, RecallTurn


class LocalRecallArchive:
    def __init__(self, path: Path) -> None:
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS recall_turns (
                    id INTEGER PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    source_message_id TEXT,
                    content TEXT NOT NULL,
                    content_sha256 TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE UNIQUE INDEX IF NOT EXISTS recall_turns_thread_source_message_idx
                ON recall_turns(thread_id, source_message_id)
                WHERE source_message_id IS NOT NULL;

                CREATE VIRTUAL TABLE IF NOT EXISTS recall_fts
                USING fts5(thread_id, agent_name, role, content, content='recall_turns', content_rowid='id');
                """
            )

    def append_turns(
        self,
        *,
        thread_id: str,
        agent_name: str,
        turns: list[RecallTurn],
    ) -> None:
        with self._connect() as conn:
            for turn in turns:
                digest = hashlib.sha256(turn.content.encode("utf-8")).hexdigest()
                cursor = conn.execute(
                    """
                    INSERT OR IGNORE INTO recall_turns(
                        thread_id, agent_name, role, source_message_id, content, content_sha256
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        thread_id,
                        agent_name,
                        turn.role,
                        turn.source_message_id,
                        turn.content,
                        digest,
                    ),
                )
                if cursor.rowcount:
                    conn.execute(
                        "INSERT INTO recall_fts(rowid, thread_id, agent_name, role, content) VALUES (?, ?, ?, ?, ?)",
                        (cursor.lastrowid, thread_id, agent_name, turn.role, turn.content),
                    )

    def search_global(self, query: str, limit: int = 5) -> list[RecallSearchResult]:
        return self._search(query=query, limit=limit)

    def search_thread(
        self,
        thread_id: str,
        query: str,
        limit: int = 5,
    ) -> list[RecallSearchResult]:
        return self._search(query=query, limit=limit, thread_id=thread_id)

    def _search(
        self,
        *,
        query: str,
        limit: int,
        thread_id: str | None = None,
    ) -> list[RecallSearchResult]:
        normalized_query = self._normalize_query(query)
        if not normalized_query:
            return []

        params: list[object] = [normalized_query]
        where = ["recall_fts MATCH ?"]
        if thread_id is not None:
            where.append("recall_turns.thread_id = ?")
            params.append(thread_id)
        params.append(limit)

        sql = f"""
            SELECT recall_turns.thread_id, recall_turns.agent_name, recall_turns.role,
                   snippet(recall_fts, 3, '', '', '...', 16) AS snippet,
                   recall_turns.created_at
            FROM recall_fts
            JOIN recall_turns ON recall_turns.id = recall_fts.rowid
            WHERE {' AND '.join(where)}
            ORDER BY bm25(recall_fts), recall_turns.id DESC
            LIMIT ?
        """
        with self._connect() as conn:
            rows = conn.execute(sql, tuple(params)).fetchall()
        return [RecallSearchResult(**dict(row)) for row in rows]

    def _normalize_query(self, query: str) -> str:
        tokens = [token for token in re.findall(r"[A-Za-z0-9_]+", query.lower()) if len(token) >= 2]
        if not tokens:
            return ""
        return " AND ".join(dict.fromkeys(tokens))
