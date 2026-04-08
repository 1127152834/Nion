from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul import create_soul_proposal


def test_accept_soul_proposal_promotes_overlay_without_activating_proposal(tmp_path: Path):
    from nion.memory_os.soul_governance import accept_soul_proposal

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )

    result = accept_soul_proposal(
        repo,
        proposal["memory_id"],
        created_at="2026-04-06T00:00:00Z",
    )

    proposal_record = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == proposal["memory_id"]
    )
    overlay = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_overlay_active_main"
    )

    assert result["action"] == "accept"
    assert proposal_record["status"] == "archived"
    assert overlay["subtype"] == "adaptive_overlay"
    assert overlay["summary"] == "长期证据显示用户偏好低刺激支持。"


def test_accept_soul_proposal_uses_canonical_clock_by_default(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_governance
    from nion.memory_os import repository as memory_repository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    fixed_now = "2026-04-08T05:06:07Z"
    monkeypatch.setattr(soul_governance, "utcnow_z", lambda: fixed_now)
    monkeypatch.setattr(memory_repository, "utcnow_z", lambda: "2099-01-01T00:00:00Z", raising=False)

    result = soul_governance.accept_soul_proposal(repo, proposal["memory_id"])

    proposal_record = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == proposal["memory_id"]
    )
    overlay = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_overlay_active_main"
    )
    event = repo.list_soul_events()[0]

    assert result["overlay"]["created_at"] == fixed_now
    assert proposal_record["updated_at"] == fixed_now
    assert overlay["updated_at"] == fixed_now
    assert event.created_at == fixed_now


def test_accept_soul_proposal_writes_canonical_overlay_revision_and_compatible_event(tmp_path: Path):
    from nion.memory_os.soul_governance import accept_soul_proposal

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )

    result = accept_soul_proposal(
        repo,
        proposal["memory_id"],
        created_at="2026-04-08T00:00:00Z",
    )

    node = repo.get_memory_node("soul_overlay_active_main")
    revisions = repo.list_memory_revisions(memory_id="soul_overlay_active_main")
    event = repo.list_soul_events()[0]

    assert result["overlay"]["memory_id"] == "soul_overlay_active_main"
    assert node is not None
    assert node.canonical_key == "soul:layer:adaptive_overlay:agent:main"
    assert node.summary == "长期证据显示用户偏好低刺激支持。"
    assert revisions[0].summary == "长期证据显示用户偏好低刺激支持。"
    assert revisions[0].payload["layer"] == "adaptive_overlay"
    assert revisions[0].payload["source_memory_id"] == proposal["memory_id"]
    assert event.event_type == "proposal_accepted"
    assert event.related_memory_id == "soul_overlay_active_main"
    assert event.metadata["canonical_memory_id"] == "soul_overlay_active_main"
    assert len(revisions) == 1


def test_reject_soul_proposal_invalidates_candidate(tmp_path: Path):
    from nion.memory_os.soul_governance import reject_soul_proposal

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )

    result = reject_soul_proposal(repo, proposal["memory_id"])
    proposal_record = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == proposal["memory_id"]
    )

    assert result["action"] == "reject"
    assert proposal_record["status"] == "invalidated"


def test_reject_soul_proposal_uses_canonical_clock_by_default(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_governance
    from nion.memory_os import repository as memory_repository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    fixed_now = "2026-04-08T05:06:08Z"
    monkeypatch.setattr(soul_governance, "utcnow_z", lambda: fixed_now)
    monkeypatch.setattr(memory_repository, "utcnow_z", lambda: "2099-01-01T00:00:00Z", raising=False)

    soul_governance.reject_soul_proposal(repo, proposal["memory_id"])

    proposal_record = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == proposal["memory_id"]
    )
    event = repo.list_soul_events()[0]

    assert proposal_record["status"] == "invalidated"
    assert proposal_record["updated_at"] == fixed_now
    assert event.created_at == fixed_now


def test_rollback_soul_overlay_archives_active_overlay(tmp_path: Path):
    from nion.memory_os.soul_governance import accept_soul_proposal, rollback_soul_overlay

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    accept_soul_proposal(repo, proposal["memory_id"], created_at="2026-04-06T00:00:00Z")

    result = rollback_soul_overlay(repo)
    overlay = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_overlay_active_main"
    )

    assert result["action"] == "rollback"
    assert overlay["status"] == "archived"


def test_rollback_soul_overlay_uses_canonical_clock_by_default(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_governance
    from nion.memory_os import repository as memory_repository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    soul_governance.accept_soul_proposal(repo, proposal["memory_id"], created_at="2026-04-06T00:00:00Z")
    fixed_now = "2026-04-08T05:06:09Z"
    monkeypatch.setattr(soul_governance, "utcnow_z", lambda: fixed_now)
    monkeypatch.setattr(memory_repository, "utcnow_z", lambda: "2099-01-01T00:00:00Z", raising=False)

    soul_governance.rollback_soul_overlay(repo)

    overlay = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_overlay_active_main"
    )
    event = repo.list_soul_events()[0]

    assert overlay["status"] == "archived"
    assert overlay["updated_at"] == fixed_now
    assert event.created_at == fixed_now


def test_rollback_soul_overlay_expires_canonical_overlay_node(tmp_path: Path):
    from nion.memory_os.soul_governance import accept_soul_proposal, rollback_soul_overlay

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    accept_soul_proposal(repo, proposal["memory_id"], created_at="2026-04-06T00:00:00Z")

    rollback_soul_overlay(repo, created_at="2026-04-08T00:00:00Z")

    node = repo.get_memory_node("soul_overlay_active_main")
    event = repo.list_soul_events()[0]

    assert node is not None
    assert node.status == "archived"
    assert node.updated_at == "2026-04-08T00:00:00Z"
    assert event.event_type == "overlay_rollback"
    assert event.metadata["canonical_memory_id"] == "soul_overlay_active_main"


def test_promote_identity_narrative_replaces_staged_record_and_emits_event(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
    from nion.memory_os.soul_governance import promote_identity_narrative

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
    from nion.memory_os.soul_governance import promote_identity_narrative

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
    from nion.memory_os.soul_governance import promote_identity_narrative

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
