from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_repository_bootstraps_metadata_database(tmp_path: Path):
    db_path = tmp_path / "memory-os" / "index.sqlite3"
    repo = MemoryOSRepository(db_path)

    status = repo.healthcheck()

    assert db_path.exists()
    assert status["ok"] is True
    assert "memory_records" in status["tables"]


def test_repository_round_trips_memory_record_artifact_uri(tmp_path: Path):
    db_path = tmp_path / "memory-os" / "index.sqlite3"
    repo = MemoryOSRepository(db_path)

    repo.save_memory_record(
        {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "稳定、克制、长期主义。",
            "confidence": 1.0,
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
            "provenance": {"source_type": "test"},
        }
    )

    record = repo.list_memory_records(domain="soul")[0]

    assert record["artifact_uri"] == "nion://memory-os/artifacts/soul/core/core_soul.md"
