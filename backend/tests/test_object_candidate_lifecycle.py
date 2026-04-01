import json
import sqlite3
from dataclasses import replace

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
    assert updated.reviewed_by is None


def test_candidate_repository_mark_ready_clears_defer_fields_and_sets_review_fields(
    tmp_path,
) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-ready-again", status="ready"))
    repository.defer_candidate(
        "cand-ready-again",
        deferred_until="2026-04-02T09:00:00Z",
        deferred_reason="wait",
        actor_type="user",
    )

    updated = repository.mark_candidate_ready(
        "cand-ready-again",
        actor_type="agent",
        reviewed_at="2026-04-03T09:00:00Z",
    )

    assert updated.status == "ready"
    assert updated.reviewed_at == "2026-04-03T09:00:00Z"
    assert updated.reviewed_by == "agent"
    assert updated.deferred_until is None
    assert updated.deferred_reason is None


def test_candidate_repository_dismiss_clears_defer_fields_without_overwriting_review_fields(
    tmp_path,
) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    candidate = replace(
        _candidate(candidate_id="cand-dismiss-clean", status="ready"),
        reviewed_at="2026-04-01T09:00:00Z",
        reviewed_by="agent",
        deferred_until="2026-04-02T09:00:00Z",
        deferred_reason="wait",
    )
    repository.save_candidate(
        candidate
    )

    updated = repository.dismiss_candidate(
        "cand-dismiss-clean",
        actor_type="user",
        terminal_reason="user_dismissed",
    )

    assert updated.status == "dismissed"
    assert updated.reviewed_at == "2026-04-01T09:00:00Z"
    assert updated.reviewed_by == "agent"
    assert updated.deferred_until is None
    assert updated.deferred_reason is None


def test_candidate_repository_expire_clears_defer_fields_without_overwriting_review_fields(
    tmp_path,
) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    candidate = replace(
        _candidate(candidate_id="cand-expire-clean", status="ready"),
        reviewed_at="2026-04-01T09:00:00Z",
        reviewed_by="agent",
        deferred_until="2026-04-02T09:00:00Z",
        deferred_reason="wait",
    )
    repository.save_candidate(
        candidate
    )

    updated = repository.expire_candidate(
        "cand-expire-clean",
        actor_type="system",
        terminal_reason="guard_rejected",
    )

    assert updated.status == "expired"
    assert updated.reviewed_at == "2026-04-01T09:00:00Z"
    assert updated.reviewed_by == "agent"
    assert updated.deferred_until is None
    assert updated.deferred_reason is None


def test_candidate_repository_lists_candidates_with_basic_filters(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(_candidate(candidate_id="cand-ready", status="ready"))
    repository.save_candidate(_candidate(candidate_id="cand-draft", status="draft"))

    ready_candidates = repository.list_candidates(status="ready", candidate_type="project_draft")

    assert [candidate.id for candidate in ready_candidates] == ["cand-ready"]


def test_candidate_repository_migrates_legacy_rows_for_candidate_type_filters(tmp_path) -> None:
    base_dir = tmp_path / "nion-home"
    db_path = base_dir / "object_bridges.sqlite3"
    base_dir.mkdir(parents=True)
    legacy_candidate = _candidate(candidate_id="cand-legacy", status="ready")
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            """
            CREATE TABLE bridge_candidates (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                payload TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "INSERT INTO bridge_candidates (id, status, payload) VALUES (?, ?, ?)",
            (
                legacy_candidate.id,
                legacy_candidate.status,
                json.dumps(
                    {
                        "id": legacy_candidate.id,
                        "candidate_type": legacy_candidate.candidate_type,
                        "status": legacy_candidate.status,
                        "title": legacy_candidate.title,
                        "summary": legacy_candidate.summary,
                        "requires_confirmation": legacy_candidate.requires_confirmation,
                        "risk_level": legacy_candidate.risk_level,
                        "payload": legacy_candidate.payload,
                        "provenance": legacy_candidate.provenance,
                        "available_actions": legacy_candidate.available_actions,
                    }
                ),
            ),
        )

    repository = ObjectBridgeRepository(base_dir=base_dir)

    records = repository.list_candidates(candidate_type="project_draft")

    assert [record.id for record in records] == ["cand-legacy"]
