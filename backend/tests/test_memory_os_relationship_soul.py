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

    assert record["memory_id"] == "relationship_soul_user_default"
    assert record["subtype"] == "relationship_soul"
    assert record["provenance"]["source_type"] == "relationship_derivation"
    assert events[0].event_type == "relationship_soul_refreshed"
    assert events[0].metadata["source_relationship_ids"] == ["rel_01"]


def test_refresh_relationship_soul_does_not_overwrite_stable_relationship_stance(tmp_path: Path):
    from nion.memory_os.relationship_soul import refresh_relationship_soul

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "soul_rel_user_default",
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "这是用户显式设定的稳定关系基调。",
            "confidence": 0.9,
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {"source_type": "user_override"},
        }
    )
    repo.save_memory_node(
        {
            "memory_id": "soul_rel_user_default",
            "canonical_key": "soul:layer:relationship_stance:user:default",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "这是用户显式设定的稳定关系基调。",
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "metadata": {"layer": "relationship_stance"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_rel_user_default",
        summary="这是用户显式设定的稳定关系基调。",
        evidence_ref=None,
        created_at="2026-04-06T00:00:00Z",
        payload={"layer": "relationship_stance"},
    )
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

    refresh_relationship_soul(repo, created_at="2026-04-07T01:00:00Z")

    stable = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_rel_user_default"
    )

    assert stable["summary"] == "这是用户显式设定的稳定关系基调。"
