from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_retention_archives_then_purges_stale_memory(tmp_path: Path):
    from nion.memory_os.retention import run_retention_cycle

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_old",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好直接表达。",
            "confidence": 0.9,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    archived = run_retention_cycle(repo, now="2026-04-10T00:00:00Z")
    archived_record = repo.list_memory_records(domain="user_model")[0]

    assert archived["archived_count"] == 1
    assert archived["purged_count"] == 0
    assert archived_record["status"] == "archived"

    purged = run_retention_cycle(repo, now="2027-04-10T00:00:00Z")
    purged_record = repo.list_memory_records(domain="user_model")[0]

    assert purged["archived_count"] == 0
    assert purged["purged_count"] == 1
    assert purged_record["status"] == "purged"
