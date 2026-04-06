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
