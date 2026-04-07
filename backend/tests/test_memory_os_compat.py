from pathlib import Path

from nion.memory_os.compat import (
    build_legacy_memory_view,
    clear_memory_os_memory,
    finalize_legacy_cutover,
)
from nion.memory_os.repository import MemoryOSRepository


def test_clear_memory_os_memory_preserves_core_soul(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    finalize_legacy_cutover(repo)

    cleared = clear_memory_os_memory()
    soul_records = repo.list_memory_records(domain="soul")

    assert cleared["version"] == "2.0"
    assert any(
        row["memory_id"] == "soul_core_main" and row["status"] == "active"
        for row in soul_records
    )


def test_build_legacy_memory_view_ignores_invalidated_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_ctx_active",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "当前负责财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-08T00:00:00Z",
            "updated_at": "2026-04-08T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "user_ctx_invalidated",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "invalidated",
            "summary": "过期财务汇报",
            "confidence": 0.8,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    payload = build_legacy_memory_view(repo)

    assert payload["user"]["workContext"]["summary"] == "当前负责财务汇报"
    assert all(fact["id"] != "user_ctx_invalidated" for fact in payload["facts"])
