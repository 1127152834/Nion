from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_promote_identity_narrative_replaces_staged_record_and_emits_event(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
    from nion.memory_os.soul_transitions import promote_identity_narrative

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个正在变得更稳的助手。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )

    result = promote_identity_narrative(
        repo,
        staged_memory_id="agent_self_narrative_staged_main",
        created_at="2026-04-07T00:10:00Z",
    )

    records = repo.list_memory_records(domain="agent_self")
    active = next(row for row in records if row["memory_id"] == "agent_self_narrative_main")
    staged = next(row for row in records if row["memory_id"] == "agent_self_narrative_staged_main")
    events = repo.list_soul_events()

    assert result["memory_record"]["memory_id"] == "agent_self_narrative_main"
    assert active["status"] == "active"
    assert staged["status"] == "archived"
    assert events[0].event_type == "identity_narrative_promoted"
    assert events[0].related_memory_id == "agent_self_narrative_staged_main"


def test_promote_identity_narrative_writes_stable_artifact_path(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
    from nion.memory_os.soul_transitions import promote_identity_narrative

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    staged = store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是已经稳定下来的叙事版本。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )

    result = promote_identity_narrative(
        repo,
        staged_memory_id="agent_self_narrative_staged_main",
        created_at="2026-04-07T00:10:00Z",
    )

    active_path = tmp_path / "memory-os" / "artifacts" / "agent-self" / "narrative" / "identity_narrative.md"
    staged_path = tmp_path / "memory-os" / "artifacts" / "agent-self" / "narrative" / "staged_identity_narrative.md"

    assert staged["memory_record"]["artifact_uri"].endswith("staged_identity_narrative.md")
    assert result["memory_record"]["artifact_uri"].endswith("identity_narrative.md")
    assert result["memory_record"]["provenance"]["source_memory_id"] == "agent_self_narrative_staged_main"
    assert active_path.read_text(encoding="utf-8") == staged_path.read_text(encoding="utf-8")


def test_promote_identity_narrative_writes_canonical_revision_and_compatible_event(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
    from nion.memory_os.soul_transitions import promote_identity_narrative

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是已经稳定下来的叙事版本。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )

    promote_identity_narrative(
        repo,
        staged_memory_id="agent_self_narrative_staged_main",
        created_at="2026-04-07T00:10:00Z",
    )

    node = repo.get_memory_node("agent_self_narrative_main")
    revisions = repo.list_memory_revisions(memory_id="agent_self_narrative_main")
    event = repo.list_soul_events()[0]

    assert node is not None
    assert node.canonical_key == "soul:layer:identity_narrative:agent:main"
    assert node.summary == "我是已经稳定下来的叙事版本。"
    assert len(revisions) == 1
    assert revisions[0].payload["layer"] == "identity_narrative"
    assert revisions[0].payload["source_memory_id"] == "agent_self_narrative_staged_main"
    assert event.event_type == "identity_narrative_promoted"
    assert event.related_memory_id == "agent_self_narrative_staged_main"
    assert event.metadata["canonical_memory_id"] == "agent_self_narrative_main"
