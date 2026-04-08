from __future__ import annotations

import sqlite3
from pathlib import Path

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
