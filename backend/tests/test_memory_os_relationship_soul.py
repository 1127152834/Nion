from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_relationship_soul_is_derived_from_active_relationship_records(tmp_path: Path):
    from nion.memory_os.relationship_soul import build_relationship_soul_summary

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "rel_01",
            "domain": "relationship",
            "subtype": "initiative_policy",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好低打扰、少施压、结论先行的支持方式。",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    summary = build_relationship_soul_summary(repo)

    assert "低打扰" in summary
    assert "结论先行" in summary


def test_refresh_relationship_soul_writes_derived_artifact_and_event(tmp_path: Path):
    from nion.memory_os.relationship_soul import refresh_relationship_soul

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "rel_01",
            "domain": "relationship",
            "subtype": "initiative_policy",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好低打扰、少施压、结论先行的支持方式。",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    result = refresh_relationship_soul(repo, created_at="2026-04-07T01:00:00Z")
    record = result["memory_record"]
    events = repo.list_soul_events()

    assert record["memory_id"] == "soul_rel_user_default"
    assert record["subtype"] == "relationship_soul"
    assert record["provenance"]["source_type"] == "relationship_derivation"
    assert events[0].event_type == "relationship_soul_refreshed"
    assert events[0].metadata["source_relationship_ids"] == ["rel_01"]
