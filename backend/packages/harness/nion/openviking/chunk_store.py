from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from pydantic import BaseModel


class NotebookChunkSearchResult(BaseModel):
    resource_uri: str
    note_id: str
    title: str
    source_relative_path: str
    updated_at: str
    snippet: str
    heading_path: list[str]
    char_start: int
    char_end: int


class OpenVikingChunkStore:
    def __init__(self, chunks_db_file: str | Path) -> None:
        self._db_file = Path(chunks_db_file)
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
                CREATE TABLE IF NOT EXISTS notebook_chunks (
                    resource_uri TEXT NOT NULL,
                    note_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    source_relative_path TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    heading_path_json TEXT NOT NULL,
                    char_start INTEGER NOT NULL,
                    char_end INTEGER NOT NULL,
                    PRIMARY KEY (resource_uri, chunk_index)
                )
                """
            )
            connection.execute(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS notebook_chunks_fts
                USING fts5(resource_uri, note_id, title, source_relative_path, text, content='notebook_chunks', content_rowid='rowid')
                """
            )

    def replace_resource_chunks(
        self,
        *,
        resource_uri: str,
        note_id: str,
        title: str,
        source_relative_path: str,
        updated_at: str,
        chunks: list[dict[str, object]],
    ) -> None:
        with self._connect() as connection:
            existing_rows = connection.execute(
                "SELECT rowid FROM notebook_chunks WHERE resource_uri = ?",
                (resource_uri,),
            ).fetchall()
            if existing_rows:
                connection.executemany(
                    "DELETE FROM notebook_chunks_fts WHERE rowid = ?",
                    [(row["rowid"],) for row in existing_rows],
                )
                connection.execute(
                    "DELETE FROM notebook_chunks WHERE resource_uri = ?",
                    (resource_uri,),
                )

            for chunk in chunks:
                cursor = connection.execute(
                    """
                    INSERT INTO notebook_chunks(
                        resource_uri,
                        note_id,
                        title,
                        source_relative_path,
                        updated_at,
                        chunk_index,
                        text,
                        heading_path_json,
                        char_start,
                        char_end
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        resource_uri,
                        note_id,
                        title,
                        source_relative_path,
                        updated_at,
                        int(chunk["chunk_index"]),
                        str(chunk["text"]),
                        json.dumps(chunk["heading_path"]),
                        int(chunk["char_start"]),
                        int(chunk["char_end"]),
                    ),
                )
                rowid = cursor.lastrowid
                connection.execute(
                    """
                    INSERT INTO notebook_chunks_fts(rowid, resource_uri, note_id, title, source_relative_path, text)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rowid,
                        resource_uri,
                        note_id,
                        title,
                        source_relative_path,
                        str(chunk["text"]),
                    ),
                )

    def search(self, query: str, limit: int = 5) -> list[NotebookChunkSearchResult]:
        normalized_query = self._normalize_fts_query(query)
        with self._connect() as connection:
            try:
                rows = connection.execute(
                    """
                    SELECT
                        notebook_chunks.resource_uri,
                        notebook_chunks.note_id,
                        notebook_chunks.title,
                        notebook_chunks.source_relative_path,
                        notebook_chunks.updated_at,
                        snippet(notebook_chunks_fts, 4, '', '', '...', 16) AS snippet,
                        notebook_chunks.heading_path_json,
                        notebook_chunks.char_start,
                        notebook_chunks.char_end
                    FROM notebook_chunks_fts
                    JOIN notebook_chunks ON notebook_chunks.rowid = notebook_chunks_fts.rowid
                    WHERE notebook_chunks_fts MATCH ?
                    ORDER BY bm25(notebook_chunks_fts), notebook_chunks.rowid DESC
                    LIMIT ?
                    """,
                    (normalized_query, limit),
                ).fetchall()
            except sqlite3.OperationalError:
                fallback = self._fallback_like_search(connection, query, limit)
                return [
                    NotebookChunkSearchResult(
                        resource_uri=row["resource_uri"],
                        note_id=row["note_id"],
                        title=row["title"],
                        source_relative_path=row["source_relative_path"],
                        updated_at=row["updated_at"],
                        snippet=row["snippet"],
                        heading_path=json.loads(row["heading_path_json"]),
                        char_start=row["char_start"],
                        char_end=row["char_end"],
                    )
                    for row in fallback
                ]

        return [
            NotebookChunkSearchResult(
                resource_uri=row["resource_uri"],
                note_id=row["note_id"],
                title=row["title"],
                source_relative_path=row["source_relative_path"],
                updated_at=row["updated_at"],
                snippet=row["snippet"],
                heading_path=json.loads(row["heading_path_json"]),
                char_start=row["char_start"],
                char_end=row["char_end"],
            )
            for row in rows
        ]

    @staticmethod
    def _normalize_fts_query(query: str) -> str:
        tokens = [token.strip() for token in query.replace('"', " ").split() if token.strip()]
        safe_tokens = [
            "".join(ch for ch in token if ch.isalnum() or ch in {"_", "-", "."})
            for token in tokens
        ]
        safe_tokens = [token for token in safe_tokens if token]
        if not safe_tokens:
            return '""'
        return " ".join(f'"{token}"' for token in safe_tokens)

    @staticmethod
    def _fallback_like_search(
        connection: sqlite3.Connection,
        query: str,
        limit: int,
    ) -> list[sqlite3.Row]:
        like_query = f"%{query.replace('%', '').replace('_', '').strip()}%"
        return connection.execute(
            """
            SELECT
                resource_uri,
                note_id,
                title,
                source_relative_path,
                updated_at,
                text AS snippet,
                heading_path_json,
                char_start,
                char_end
            FROM notebook_chunks
            WHERE title LIKE ? OR source_relative_path LIKE ? OR text LIKE ?
            ORDER BY updated_at DESC, rowid DESC
            LIMIT ?
            """,
            (like_query, like_query, like_query, limit),
        ).fetchall()
