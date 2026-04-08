from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from nion.memory.evidence_vault.store import EvidenceVaultStore


def test_store_persists_durable_evidence_and_chunks(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")

    result = store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="第一段说明用户月底压力很大。\n\n第二段说明需要低刺激支持。",
        durability_scope="durable_user_memory",
    )

    assert result.document.evidence_id
    assert result.document.checksum
    assert result.document.artifact_uri
    assert result.document_path == tmp_path / "memory-os" / "evidence" / f"{result.document.evidence_id}.json"
    assert result.document_path.exists()
    assert len(result.chunks) == 2
    assert [chunk.chunk_text for chunk in result.chunks] == [
        "第一段说明用户月底压力很大。",
        "第二段说明需要低刺激支持。",
    ]

    with sqlite3.connect(store.db_path) as connection:
        doc_row = connection.execute(
            """
            SELECT evidence_id, artifact_uri, durability_scope, checksum
            FROM evidence_documents
            WHERE evidence_id = ?
            """,
            (result.document.evidence_id,),
        ).fetchone()
        chunk_rows = connection.execute(
            """
            SELECT chunk_index, chunk_text
            FROM evidence_chunks
            WHERE evidence_id = ?
            ORDER BY chunk_index
            """,
            (result.document.evidence_id,),
        ).fetchall()

    assert doc_row == (
        result.document.evidence_id,
        result.document.artifact_uri,
        "durable_user_memory",
        result.document.checksum,
    )
    assert chunk_rows == [
        (0, "第一段说明用户月底压力很大。"),
        (1, "第二段说明需要低刺激支持。"),
    ]

    hits = store.search("低刺激支持")
    assert len(hits) == 1
    assert hits[0].evidence_id == result.document.evidence_id
    assert hits[0].chunk_text == "第二段说明需要低刺激支持。"


def test_store_keeps_ephemeral_evidence_off_disk(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")

    result = store.write_document(
        source_type="tool_summary",
        thread_id="thread-2",
        turn_id="turn-2",
        actor="assistant",
        content_raw="临时运行证据，不应该落正文文件。",
        durability_scope="session_ephemeral",
    )

    assert result.document.durability_scope == "session_ephemeral"
    assert result.document.artifact_uri is None
    assert result.document_path == tmp_path / "memory-os" / "evidence" / f"{result.document.evidence_id}.json"
    assert not result.document_path.exists()
    assert len(result.chunks) == 1

    with sqlite3.connect(store.db_path) as connection:
        doc_row = connection.execute(
            """
            SELECT durability_scope, artifact_uri
            FROM evidence_documents
            WHERE evidence_id = ?
            """,
            (result.document.evidence_id,),
        ).fetchone()

    assert doc_row == ("session_ephemeral", None)


def test_store_keeps_tombstone_after_purge(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")
    result = store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="只有一段，也应该能 fallback 成一个 chunk。",
        durability_scope="durable_user_memory",
    )

    tombstone = store.purge_document(result.document.evidence_id, deleted_by="user")

    assert tombstone.evidence_id == result.document.evidence_id
    assert tombstone.deleted_by == "user"
    assert tombstone.checksum == result.document.checksum
    assert not result.document_path.exists()

    with sqlite3.connect(store.db_path) as connection:
        doc_row = connection.execute(
            """
            SELECT evidence_id, checksum, purged_at
            FROM evidence_documents
            WHERE evidence_id = ?
            """,
            (result.document.evidence_id,),
        ).fetchone()
        chunk_count = connection.execute(
            "SELECT COUNT(*) FROM evidence_chunks WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()[0]
        tombstone_row = connection.execute(
            """
            SELECT evidence_id, deleted_by, checksum
            FROM evidence_tombstones
            WHERE evidence_id = ?
            """,
            (result.document.evidence_id,),
        ).fetchone()

    assert doc_row[0] == result.document.evidence_id
    assert doc_row[1] == result.document.checksum
    assert doc_row[2]
    assert chunk_count == 0
    assert tombstone_row == (
        result.document.evidence_id,
        "user",
        result.document.checksum,
    )

    assert store.search("fallback") == []


def test_purge_keeps_db_state_when_quarantine_cleanup_fails(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")
    result = store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="artifact delete failure should not half delete",
        durability_scope="durable_user_memory",
    )
    original_unlink = Path.unlink

    def _failing_unlink(self, missing_ok=False):
        if self.suffix == ".quarantine":
            raise OSError("unlink boom")
        return original_unlink(self, missing_ok=missing_ok)

    Path.unlink = _failing_unlink  # type: ignore[method-assign]
    try:
        tombstone = store.purge_document(result.document.evidence_id, deleted_by="user")
    finally:
        Path.unlink = original_unlink  # type: ignore[method-assign]

    assert tombstone.evidence_id == result.document.evidence_id
    assert not result.document_path.exists()
    quarantine_files = list(result.document_path.parent.glob("*.quarantine"))
    assert len(quarantine_files) == 1

    with sqlite3.connect(store.db_path) as connection:
        doc_row = connection.execute(
            "SELECT purged_at FROM evidence_documents WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()
        chunk_count = connection.execute(
            "SELECT COUNT(*) FROM evidence_chunks WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()[0]
        tombstone_count = connection.execute(
            "SELECT COUNT(*) FROM evidence_tombstones WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()[0]

    assert doc_row[0]
    assert chunk_count == 0
    assert tombstone_count == 1
    assert store.search("half delete") == []


def test_purge_restores_artifact_when_db_purge_fails(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")
    result = store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="db purge failure should keep chunks searchable",
        durability_scope="durable_user_memory",
    )
    original_connect = store._connect

    class _FailingConnection:
        def __init__(self, connection: sqlite3.Connection) -> None:
            self._connection = connection

        def execute(self, sql: str, parameters=()):
            if "UPDATE evidence_documents SET purged_at" in sql:
                raise sqlite3.OperationalError("purge boom")
            return self._connection.execute(sql, parameters)

        def executemany(self, sql: str, seq_of_parameters):
            return self._connection.executemany(sql, seq_of_parameters)

        def executescript(self, script: str):
            return self._connection.executescript(script)

        def __getattr__(self, name: str):
            return getattr(self._connection, name)

        def __enter__(self):
            self._connection.__enter__()
            return self

        def __exit__(self, exc_type, exc, tb):
            return self._connection.__exit__(exc_type, exc, tb)

    store._connect = lambda: _FailingConnection(original_connect())  # type: ignore[method-assign]
    try:
        with pytest.raises(sqlite3.OperationalError, match="purge boom"):
            store.purge_document(result.document.evidence_id, deleted_by="user")
    finally:
        store._connect = original_connect  # type: ignore[method-assign]

    assert result.document_path.exists()

    with sqlite3.connect(store.db_path) as connection:
        doc_row = connection.execute(
            "SELECT purged_at FROM evidence_documents WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()
        chunk_count = connection.execute(
            "SELECT COUNT(*) FROM evidence_chunks WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()[0]
        fts_count = connection.execute(
            """
            SELECT COUNT(*)
            FROM evidence_chunks_fts
            WHERE evidence_id = ?
            """,
            (result.document.evidence_id,),
        ).fetchone()[0]
        tombstone_count = connection.execute(
            "SELECT COUNT(*) FROM evidence_tombstones WHERE evidence_id = ?",
            (result.document.evidence_id,),
        ).fetchone()[0]

    assert doc_row == (None,)
    assert chunk_count == 1
    assert fts_count == 1
    assert tombstone_count == 0
    assert [hit.evidence_id for hit in store.search("searchable")] == [result.document.evidence_id]


def test_search_rejects_non_positive_limit(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")

    with pytest.raises(ValueError, match="limit must be positive"):
        store.search("anything", limit=0)

    with pytest.raises(ValueError, match="limit must be positive"):
        store.search("anything", limit=-1)


def test_search_blank_or_symbol_only_query_returns_empty(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")
    store.write_document(
        source_type="human_message",
        thread_id="thread-1",
        turn_id="turn-1",
        actor="user",
        content_raw="已有内容，不应该被空查询命中。",
        durability_scope="durable_user_memory",
    )

    assert store.search("   ") == []
    assert store.search("!!! ???") == []


def test_store_enables_foreign_key_constraints(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")

    with pytest.raises(sqlite3.IntegrityError):
        with store._connect() as connection:
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
                    "orphan:0",
                    "missing-evidence",
                    0,
                    "orphan chunk",
                    "",
                    0,
                    None,
                    "[]",
                    None,
                    None,
                    0.0,
                    None,
                ),
            )


def test_store_cleans_up_temp_file_when_db_write_fails(tmp_path: Path):
    store = EvidenceVaultStore(tmp_path / "memory-os")
    original_connect = store._connect

    class _FailingConnection:
        def __init__(self, connection: sqlite3.Connection) -> None:
            self._connection = connection
            self._failed = False

        def execute(self, sql: str, parameters=()):
            if "INSERT INTO evidence_documents" in sql and not self._failed:
                self._failed = True
                raise sqlite3.OperationalError("boom")
            return self._connection.execute(sql, parameters)

        def executescript(self, script: str):
            return self._connection.executescript(script)

        def __getattr__(self, name: str):
            return getattr(self._connection, name)

        def __enter__(self):
            self._connection.__enter__()
            return self

        def __exit__(self, exc_type, exc, tb):
            return self._connection.__exit__(exc_type, exc, tb)

    store._connect = lambda: _FailingConnection(original_connect())  # type: ignore[method-assign]
    evidence_dir = tmp_path / "memory-os" / "evidence"

    with pytest.raises(sqlite3.OperationalError, match="boom"):
        store.write_document(
            source_type="human_message",
            thread_id="thread-1",
            turn_id="turn-1",
            actor="user",
            content_raw="db fail should not leave final file",
            durability_scope="durable_user_memory",
        )

    assert list(evidence_dir.glob("*.json")) == []
    assert list(evidence_dir.glob("*.tmp")) == []
