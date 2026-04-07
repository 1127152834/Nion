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

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    fixed_now = "2026-04-08T05:06:07Z"
    monkeypatch.setattr(soul_governance, "utcnow_z", lambda: fixed_now)

    result = soul_governance.accept_soul_proposal(repo, proposal["memory_id"])

    overlay = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_overlay_active_main"
    )
    event = repo.list_soul_events()[0]

    assert result["overlay"]["created_at"] == fixed_now
    assert overlay["updated_at"] == fixed_now
    assert event.created_at == fixed_now


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

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    fixed_now = "2026-04-08T05:06:08Z"
    monkeypatch.setattr(soul_governance, "utcnow_z", lambda: fixed_now)

    soul_governance.reject_soul_proposal(repo, proposal["memory_id"])

    proposal_record = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == proposal["memory_id"]
    )
    event = repo.list_soul_events()[0]

    assert proposal_record["status"] == "invalidated"
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

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    proposal = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    soul_governance.accept_soul_proposal(repo, proposal["memory_id"], created_at="2026-04-06T00:00:00Z")
    fixed_now = "2026-04-08T05:06:09Z"
    monkeypatch.setattr(soul_governance, "utcnow_z", lambda: fixed_now)

    soul_governance.rollback_soul_overlay(repo)

    overlay = next(
        row for row in repo.list_memory_records(domain="soul") if row["memory_id"] == "soul_overlay_active_main"
    )
    event = repo.list_soul_events()[0]

    assert overlay["status"] == "archived"
    assert event.created_at == fixed_now


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
