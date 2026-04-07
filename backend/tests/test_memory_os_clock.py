import re
from datetime import datetime, timezone

from nion.memory_os.repository import MemoryOSRepository


def test_utcnow_z_returns_iso8601_utc_string():
    from nion.memory_os.clock import utcnow_z

    timestamp = utcnow_z()

    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", timestamp)
    parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    assert parsed.tzinfo == timezone.utc
    assert parsed.microsecond == 0


def test_update_memory_status_uses_canonical_utcnow_z(monkeypatch, tmp_path):
    fixed_now = "2026-04-08T03:04:05Z"
    monkeypatch.setattr("nion.memory_os.repository.utcnow_z", lambda: fixed_now)
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_mem_clock",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    repo.update_memory_status("user_mem_clock", "archived")

    records = repo.list_memory_records(domain="user_model")
    assert records[0]["status"] == "archived"
    assert records[0]["updated_at"] == fixed_now
