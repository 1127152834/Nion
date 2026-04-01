from nion.object_bridges.models import BridgeCandidateRecord
from nion.object_bridges.repository import ObjectBridgeRepository


def _candidate(candidate_id: str) -> BridgeCandidateRecord:
    return BridgeCandidateRecord(
        id=candidate_id,
        candidate_type="project_draft",
        status="ready",
        title="Project Draft",
        summary="summary",
        requires_confirmation=True,
        risk_level="high",
        payload={},
        provenance=[],
        available_actions=["apply", "dismiss", "defer"],
    )


def test_candidate_repository_persists_action_history(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate("cand-audit"))

    repository.defer_candidate(
        "cand-audit",
        deferred_until="2026-04-02T09:00:00Z",
        deferred_reason="wait for review",
        actor_type="user",
    )
    repository.dismiss_candidate(
        "cand-audit",
        actor_type="user",
        terminal_reason="no_longer_needed",
    )

    events = repository.list_candidate_events("cand-audit")

    assert [event.action for event in events] == ["deferred", "dismissed"]
    assert events[0].actor_type == "user"
    assert events[0].payload["deferred_reason"] == "wait for review"
    assert events[1].payload["terminal_reason"] == "no_longer_needed"


def test_candidate_repository_persists_last_error_and_terminal_reason(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate("cand-error"))

    repository.record_candidate_error(
        "cand-error",
        error_code="apply_failed",
        message="write notebook failed",
        actor_type="system",
        failed_at="2026-04-01T10:00:00Z",
    )
    updated = repository.expire_candidate(
        "cand-error",
        actor_type="system",
        terminal_reason="apply_guard_failed",
    )

    assert updated.status == "expired"
    assert updated.terminal_reason == "apply_guard_failed"
    assert updated.last_error is not None
    assert updated.last_error["error_code"] == "apply_failed"
    assert updated.last_error["message"] == "write notebook failed"
    assert updated.last_error["failed_at"] == "2026-04-01T10:00:00Z"
