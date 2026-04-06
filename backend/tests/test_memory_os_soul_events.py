from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul import create_soul_proposal


def test_soul_events_capture_accept_reject_and_rollback(tmp_path: Path):
    from nion.memory_os.soul_governance import (
        accept_soul_proposal,
        list_soul_events,
        reject_soul_proposal,
        rollback_soul_overlay,
    )

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    accepted = create_soul_proposal(
        repo,
        title="减少鼓励式措辞",
        summary="长期证据显示用户偏好低刺激支持。",
    )
    rejected = create_soul_proposal(
        repo,
        title="增加主动提醒",
        summary="长期证据显示用户需要更高主动性。",
    )

    accept_soul_proposal(repo, accepted["memory_id"], created_at="2026-04-07T00:00:00Z")
    reject_soul_proposal(repo, rejected["memory_id"], created_at="2026-04-07T00:01:00Z")
    rollback_soul_overlay(repo, created_at="2026-04-07T00:02:00Z")

    events = list_soul_events(repo)

    assert events[0]["event_type"] == "overlay_rollback"
    assert events[1]["event_type"] == "proposal_rejected"
    assert events[2]["event_type"] == "proposal_accepted"
