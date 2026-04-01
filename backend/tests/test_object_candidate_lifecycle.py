from nion.object_bridges.models import BridgeCandidateRecord
from nion.object_bridges.repository import ObjectBridgeRepository


def _candidate(*, candidate_id: str, status: str = "draft") -> BridgeCandidateRecord:
    return BridgeCandidateRecord(
        id=candidate_id,
        candidate_type="project_draft",
        status=status,
        title=f"title-{candidate_id}",
        summary="summary",
        requires_confirmation=True,
        risk_level="medium",
        payload={},
        provenance=[],
        available_actions=["apply", "dismiss", "defer"],
    )


def test_candidate_repository_marks_draft_candidate_ready(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-draft"))

    updated = repository.mark_candidate_ready(
        "cand-draft",
        actor_type="agent",
        reviewed_at="2026-04-01T09:00:00Z",
    )

    assert updated.status == "ready"
    assert updated.reviewed_at == "2026-04-01T09:00:00Z"
    assert updated.reviewed_by == "agent"


def test_candidate_repository_dismisses_ready_candidate_with_terminal_reason(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-dismiss", status="ready"))

    updated = repository.dismiss_candidate(
        "cand-dismiss",
        actor_type="user",
        terminal_reason="user_dismissed",
    )

    assert updated.status == "dismissed"
    assert updated.terminal_reason == "user_dismissed"


def test_candidate_repository_expires_ready_candidate_with_terminal_reason(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-expire", status="ready"))

    updated = repository.expire_candidate(
        "cand-expire",
        actor_type="system",
        terminal_reason="guard_rejected",
    )

    assert updated.status == "expired"
    assert updated.terminal_reason == "guard_rejected"


def test_candidate_repository_defer_updates_queue_fields_without_status_change(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-defer", status="ready"))

    updated = repository.defer_candidate(
        "cand-defer",
        deferred_until="2026-04-02T09:00:00Z",
        deferred_reason="wait",
        actor_type="user",
    )

    assert updated.status == "ready"
    assert updated.deferred_until == "2026-04-02T09:00:00Z"
    assert updated.deferred_reason == "wait"
    assert updated.reviewed_by == "user"


def test_candidate_repository_lists_candidates_with_basic_filters(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-ready", status="ready"))
    repository.save_candidate(_candidate(candidate_id="cand-draft", status="draft"))

    ready_candidates = repository.list_candidates(status="ready", candidate_type="project_draft")

    assert [candidate.id for candidate in ready_candidates] == ["cand-ready"]
