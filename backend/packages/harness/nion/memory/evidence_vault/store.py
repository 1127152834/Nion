from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path

from nion.memory.evidence_vault.fts import delete_chunks, ensure_fts_schema, index_chunks, search_chunks
from nion.memory.evidence_vault.models import (
    EvidenceChunk,
    EvidenceDocument,
    EvidenceDurabilityScope,
    EvidenceTombstone,
    EvidenceWriteResult,
)


class EvidenceVaultStore:
    def __init__(self, memory_os_dir: str | Path) -> None:
        self._memory_os_dir = Path(memory_os_dir)
        self._evidence_dir = self._memory_os_dir / "evidence"
        self._db_path = self._memory_os_dir / "evidence.sqlite3"
        self._evidence_dir.mkdir(parents=True, exist_ok=True)
        self._memory_os_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    @property
    def db_path(self) -> Path:
        return self._db_path

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON;")
        connection.execute("PRAGMA journal_mode=WAL;")
        connection.execute("PRAGMA busy_timeout = 5000;")
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS evidence_documents (
                    evidence_id TEXT PRIMARY KEY,
                    source_type TEXT NOT NULL,
                    thread_id TEXT NOT NULL,
                    turn_id TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    content_normalized TEXT NOT NULL,
                    artifact_uri TEXT,
                    sensitivity TEXT NOT NULL,
                    retention_class TEXT NOT NULL,
                    durability_scope TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    purged_at TEXT
                );

                CREATE TABLE IF NOT EXISTS evidence_chunks (
                    chunk_id TEXT PRIMARY KEY,
                    evidence_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    chunk_text TEXT NOT NULL,
                    chunk_summary TEXT NOT NULL,
                    tokens INTEGER NOT NULL,
                    time_anchor TEXT,
                    topic_tags_json TEXT NOT NULL,
                    wing TEXT,
                    room TEXT,
                    importance_score REAL NOT NULL,
                    embedding_ref TEXT,
                    FOREIGN KEY (evidence_id) REFERENCES evidence_documents(evidence_id)
                );

                CREATE TABLE IF NOT EXISTS evidence_tombstones (
                    evidence_id TEXT PRIMARY KEY,
                    deleted_at TEXT NOT NULL,
                    deleted_by TEXT NOT NULL,
                    checksum TEXT NOT NULL,
                    FOREIGN KEY (evidence_id) REFERENCES evidence_documents(evidence_id)
                );
                """
            )
            ensure_fts_schema(connection)

    def write_document(
        self,
        *,
        source_type: str,
        thread_id: str,
        turn_id: str,
        actor: str,
        content_raw: str,
        durability_scope: EvidenceDurabilityScope,
    ) -> EvidenceWriteResult:
        created_at = _utc_now()
        evidence_id = uuid.uuid4().hex
        content_normalized = _normalize_content(content_raw)
        checksum = hashlib.sha256(content_raw.encode("utf-8")).hexdigest()
        document_path = self._evidence_dir / f"{evidence_id}.json"
        temp_document_path = self._evidence_dir / f"{evidence_id}.json.tmp"
        artifact_uri = None
        temp_file_written = False

        document = EvidenceDocument(
            evidence_id=evidence_id,
            source_type=source_type,
            thread_id=thread_id,
            turn_id=turn_id,
            actor=actor,
            created_at=created_at,
            content_raw=content_raw,
            content_normalized=content_normalized,
            artifact_uri=None,
            durability_scope=durability_scope,
            checksum=checksum,
        )

        if durability_scope == "durable_user_memory":
            payload = {
                "evidence_id": evidence_id,
                "source_type": source_type,
                "thread_id": thread_id,
                "turn_id": turn_id,
                "actor": actor,
                "created_at": created_at,
                "content_raw": content_raw,
                "content_normalized": content_normalized,
                "checksum": checksum,
            }
            temp_document_path.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            temp_file_written = True
            artifact_uri = str(document_path)
            document.artifact_uri = artifact_uri

        chunks = _chunk_document(evidence_id=evidence_id, text=content_normalized)

        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO evidence_documents(
                        evidence_id,
                        source_type,
                        thread_id,
                        turn_id,
                        actor,
                        created_at,
                        content_normalized,
                        artifact_uri,
                        sensitivity,
                        retention_class,
                        durability_scope,
                        checksum,
                        metadata_json,
                        purged_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                    """,
                    (
                        document.evidence_id,
                        document.source_type,
                        document.thread_id,
                        document.turn_id,
                        document.actor,
                        document.created_at,
                        document.content_normalized,
                        document.artifact_uri,
                        document.sensitivity,
                        document.retention_class,
                        document.durability_scope,
                        document.checksum,
                        json.dumps(document.metadata, ensure_ascii=False, sort_keys=True),
                    ),
                )
                for chunk in chunks:
                    connection.execute(
                        """
                        INSERT INTO evidence_chunks(
                            chunk_id,
                            evidence_id,
                            chunk_index,
                            chunk_text,
                            chunk_summary,
                            tokens,
                            time_anchor,
                            topic_tags_json,
                            wing,
                            room,
                            importance_score,
                            embedding_ref
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            chunk.chunk_id,
                            chunk.evidence_id,
                            chunk.chunk_index,
                            chunk.chunk_text,
                            chunk.chunk_summary,
                            chunk.tokens,
                            chunk.time_anchor,
                            json.dumps(chunk.topic_tags, ensure_ascii=False),
                            chunk.wing,
                            chunk.room,
                            chunk.importance_score,
                            chunk.embedding_ref,
                        ),
                    )
                index_chunks(connection, chunks)
        except Exception:
            if temp_file_written and temp_document_path.exists():
                temp_document_path.unlink()
            raise

        if temp_file_written:
            os.replace(temp_document_path, document_path)

        return EvidenceWriteResult(
            document=document,
            chunks=chunks,
            document_path=document_path,
        )

    def purge_document(self, evidence_id: str, *, deleted_by: str) -> EvidenceTombstone:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT evidence_id, checksum, artifact_uri
                FROM evidence_documents
                WHERE evidence_id = ?
                """,
                (evidence_id,),
            ).fetchone()
            if row is None:
                raise KeyError(f"Unknown evidence document: {evidence_id}")

        deleted_at = _utc_now()
        tombstone = EvidenceTombstone(
            evidence_id=evidence_id,
            deleted_at=deleted_at,
            deleted_by=deleted_by,
            checksum=row["checksum"],
        )

        artifact_uri = row["artifact_uri"]
        if artifact_uri:
            artifact_path = Path(artifact_uri)
            if artifact_path.exists():
                artifact_path.unlink()

        with self._connect() as connection:
            delete_chunks(connection, evidence_id)
            connection.execute(
                "DELETE FROM evidence_chunks WHERE evidence_id = ?",
                (evidence_id,),
            )
            connection.execute(
                "UPDATE evidence_documents SET purged_at = ? WHERE evidence_id = ?",
                (deleted_at, evidence_id),
            )
            connection.execute(
                """
                INSERT OR REPLACE INTO evidence_tombstones(
                    evidence_id,
                    deleted_at,
                    deleted_by,
                    checksum
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    tombstone.evidence_id,
                    tombstone.deleted_at,
                    tombstone.deleted_by,
                    tombstone.checksum,
                ),
            )

        return tombstone

    def search(self, query: str, limit: int = 5):
        if limit <= 0:
            raise ValueError("limit must be positive")
        with self._connect() as connection:
            return search_chunks(connection, query, limit)


def _chunk_document(*, evidence_id: str, text: str) -> list[EvidenceChunk]:
    paragraphs = [segment.strip() for segment in text.split("\n\n") if segment.strip()]
    if not paragraphs and text.strip():
        paragraphs = [text.strip()]
    if not paragraphs:
        return []
    return [
        EvidenceChunk(
            chunk_id=f"{evidence_id}:{index}",
            evidence_id=evidence_id,
            chunk_index=index,
            chunk_text=paragraph,
            tokens=len(paragraph.split()),
        )
        for index, paragraph in enumerate(paragraphs)
    ]


def _normalize_content(content_raw: str) -> str:
    lines = [line.rstrip() for line in content_raw.replace("\r\n", "\n").split("\n")]
    return "\n".join(lines).strip()


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
