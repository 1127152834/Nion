from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from packages.harness.nion.config.paths import Paths
from packages.harness.nion.memory_os.repository import MemoryOSRepository


def _table_names(db_path: Path) -> set[str]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    return {row[0] for row in rows}


def test_paths_exposes_memory_os_v2_directories(tmp_path: Path) -> None:
    paths = Paths(base_dir=tmp_path)

    assert paths.memory_os_evidence_dir == tmp_path / "memory-os" / "evidence"
    assert paths.memory_os_indexes_dir == tmp_path / "memory-os" / "indexes"
    assert paths.memory_os_fts_dir == tmp_path / "memory-os" / "indexes" / "fts"
    assert paths.memory_os_vector_dir == tmp_path / "memory-os" / "indexes" / "vector"


def test_repository_initializes_v2_canonical_tables_without_breaking_legacy_tables(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "memory-os.sqlite3"

    MemoryOSRepository(db_path)

    table_names = _table_names(db_path)

    assert {
        "memory_nodes",
        "memory_revisions",
        "memory_decisions",
        "memory_links",
        "user_overrides",
    }.issubset(table_names)
    assert {"memory_records", "candidate_records", "soul_events"}.issubset(table_names)


def test_repository_enforces_v2_foreign_keys(tmp_path: Path) -> None:
    db_path = tmp_path / "memory-os.sqlite3"
    repo = MemoryOSRepository(db_path)

    with pytest.raises(sqlite3.IntegrityError):
        with repo._connect() as conn:
            conn.execute(
                """
                INSERT INTO memory_revisions (
                    revision_id,
                    memory_id,
                    revision_number,
                    summary,
                    evidence_ref,
                    created_at,
                    payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "rev-missing-parent",
                    "missing-memory-node",
                    1,
                    "revision without parent node",
                    None,
                    "2026-04-08T00:00:00Z",
                    "{}",
                ),
            )
