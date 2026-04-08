from __future__ import annotations

import sqlite3

from nion.memory.evidence_vault.models import EvidenceChunk, EvidenceSearchHit


def ensure_fts_schema(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS evidence_chunks_fts
        USING fts5(
            evidence_id,
            chunk_id,
            chunk_text,
            content='evidence_chunks',
            content_rowid='rowid'
        )
        """
    )


def index_chunks(connection: sqlite3.Connection, chunks: list[EvidenceChunk]) -> None:
    for chunk in chunks:
        row = connection.execute(
            "SELECT rowid FROM evidence_chunks WHERE chunk_id = ?",
            (chunk.chunk_id,),
        ).fetchone()
        if row is None:
            continue
        connection.execute(
            """
            INSERT INTO evidence_chunks_fts(rowid, evidence_id, chunk_id, chunk_text)
            VALUES (?, ?, ?, ?)
            """,
            (row["rowid"], chunk.evidence_id, chunk.chunk_id, chunk.chunk_text),
        )


def delete_chunks(connection: sqlite3.Connection, evidence_id: str) -> None:
    rows = connection.execute(
        "SELECT rowid FROM evidence_chunks WHERE evidence_id = ?",
        (evidence_id,),
    ).fetchall()
    if not rows:
        return
    connection.executemany(
        "DELETE FROM evidence_chunks_fts WHERE rowid = ?",
        [(row["rowid"],) for row in rows],
    )


def search_chunks(connection: sqlite3.Connection, query: str, limit: int) -> list[EvidenceSearchHit]:
    normalized_query = normalize_fts_query(query)
    fallback_query = query.replace("%", "").replace("_", "").strip()
    if not normalized_query and not fallback_query:
        return []
    rows: list[sqlite3.Row] = []
    if normalized_query:
        try:
            rows = connection.execute(
                """
                SELECT
                    evidence_chunks.evidence_id,
                    evidence_chunks.chunk_id,
                    evidence_chunks.chunk_text,
                    snippet(evidence_chunks_fts, 2, '', '', '...', 16) AS snippet,
                    bm25(evidence_chunks_fts) AS score
                FROM evidence_chunks_fts
                JOIN evidence_chunks ON evidence_chunks.rowid = evidence_chunks_fts.rowid
                JOIN evidence_documents ON evidence_documents.evidence_id = evidence_chunks.evidence_id
                WHERE evidence_chunks_fts MATCH ?
                  AND evidence_documents.purged_at IS NULL
                ORDER BY score, evidence_chunks.rowid DESC
                LIMIT ?
                """,
                (normalized_query, limit),
            ).fetchall()
        except sqlite3.OperationalError:
            rows = []
    if not rows:
        if not fallback_query:
            return []
        like_query = f"%{fallback_query}%"
        rows = connection.execute(
            """
            SELECT
                evidence_chunks.evidence_id,
                evidence_chunks.chunk_id,
                evidence_chunks.chunk_text,
                evidence_chunks.chunk_text AS snippet,
                0.0 AS score
            FROM evidence_chunks
            JOIN evidence_documents ON evidence_documents.evidence_id = evidence_chunks.evidence_id
            WHERE evidence_documents.purged_at IS NULL
              AND evidence_chunks.chunk_text LIKE ?
            ORDER BY evidence_chunks.rowid DESC
            LIMIT ?
            """,
            (like_query, limit),
        ).fetchall()
    return [EvidenceSearchHit(**dict(row)) for row in rows]


def normalize_fts_query(query: str) -> str:
    tokens = [token.strip() for token in query.replace('"', " ").split() if token.strip()]
    safe_tokens = [
        "".join(ch for ch in token if ch.isalnum() or ch in {"_", "-", "."})
        for token in tokens
    ]
    safe_tokens = [token for token in safe_tokens if token]
    if not safe_tokens:
        return ""
    return " ".join(f'"{token}"' for token in safe_tokens)
