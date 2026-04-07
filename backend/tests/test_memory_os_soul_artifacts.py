from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_soul_artifact_store_writes_core_soul_and_indexes_metadata(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)

    artifact = store.write_core_soul(
        body="# Core Soul\n\n## Identity\n结论先行、长期陪伴、克制稳定。\n",
        created_at="2026-04-06T00:00:00Z",
    )

    assert artifact["memory_record"]["memory_id"] == "soul_core_main"
    assert artifact["memory_record"]["domain"] == "soul"
    assert artifact["memory_record"]["subtype"] == "core"
    assert artifact["artifact_path"].endswith("memory-os/artifacts/soul/core/core_soul.md")
    assert Path(artifact["artifact_path"]).read_text(encoding="utf-8").startswith("# Core Soul")


def test_soul_artifact_store_writes_identity_narrative_and_overlay(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)

    narrative = store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个长期陪伴型助手。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    overlay = store.write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n近期减少鼓励式措辞。\n",
        created_at="2026-04-06T00:00:00Z",
    )

    records = repo.list_memory_records()
    ids = {row["memory_id"] for row in records}

    assert narrative["memory_record"]["memory_id"] == "agent_self_narrative_main"
    assert overlay["memory_record"]["memory_id"] == "soul_overlay_active_main"
    assert "agent_self_narrative_main" in ids
    assert "soul_overlay_active_main" in ids


def test_soul_artifact_store_records_staged_identity_narrative_event(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)

    narrative = store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个正在变得更稳的助手。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )

    events = repo.list_soul_events()

    assert narrative["memory_record"]["memory_id"] == "agent_self_narrative_staged_main"
    assert events[0].event_type == "identity_narrative_staged"
    assert events[0].memory_id == "agent_self_narrative_staged_main"


def test_soul_artifact_store_writes_relationship_soul_artifact(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)

    artifact = store.write_relationship_soul(
        body="# Relationship Soul\n\n## Current Stance\n保持低刺激、少施压、结论先行。\n",
        created_at="2026-04-08T00:00:00Z",
        source_relationship_ids=["rel_01", "rel_02"],
    )

    assert artifact["memory_record"]["memory_id"] == "soul_rel_user_default"
    assert artifact["memory_record"]["artifact_uri"].endswith("relationship_soul.md")
    assert Path(artifact["artifact_path"]).read_text(encoding="utf-8").startswith("# Relationship Soul")


def test_import_legacy_soul_file_creates_core_soul_record(tmp_path: Path):
    from nion.memory_os.soul_artifacts import import_legacy_soul_file

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    legacy_path = tmp_path / "SOUL.md"
    legacy_path.write_text("# Legacy Soul\n\n陪伴、稳定、长期主义。", encoding="utf-8")

    imported = import_legacy_soul_file(
        repository=repo,
        soul_path=legacy_path,
        created_at="2026-04-06T00:00:00Z",
    )

    record = next(
        item for item in repo.list_memory_records(domain="soul") if item["memory_id"] == "soul_core_main"
    )

    assert imported["artifact_path"].endswith("memory-os/artifacts/soul/core/core_soul.md")
    assert record["artifact_uri"] == "nion://memory-os/artifacts/soul/core/core_soul.md"
    assert "长期主义" in Path(imported["artifact_path"]).read_text(encoding="utf-8")
