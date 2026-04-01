from dataclasses import replace

import pytest

from nion.object_bridges.service import ObjectBridgeService


def test_apply_candidate_expires_when_structural_guard_fails(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_constraints_from_notebook(
        project_id="proj-1",
        note_ids=["note-1"],
        fragment_ids=["frag-1"],
    )
    broken_payload = {
        **candidate.payload,
        "candidate": {
            **candidate.payload["candidate"],
            "project_id": "",
        },
    }
    service.repository.save_candidate(replace(candidate, payload=broken_payload))

    with pytest.raises(ValueError, match="guard"):
        service.apply_candidate(candidate.id, actor_type="user")

    detail = service.get_candidate_detail(candidate.id)
    assert detail["candidate"].status == "expired"
    assert detail["candidate"].terminal_reason == "guard_rejected"
    assert detail["guard_state"]["is_applicable"] is False
    assert detail["guard_state"]["reasons"]


def test_apply_candidate_records_last_error_and_keeps_ready_on_execution_failure(
    tmp_path,
) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.export_project_summary_to_notebook(
        project_id="proj-1",
        scope="whole_project",
        target_directory="Inbox",
    )
    broken_payload = {
        **candidate.payload,
        "candidate": {
            **candidate.payload["candidate"],
            "title": "",
        },
    }
    service.repository.save_candidate(replace(candidate, payload=broken_payload))

    with pytest.raises(RuntimeError, match="apply failed"):
        service.apply_candidate(candidate.id, actor_type="user")

    detail = service.get_candidate_detail(candidate.id)
    assert detail["candidate"].status == "ready"
    assert detail["candidate"].last_error is not None
    assert detail["candidate"].last_error["error_code"] == "apply_failed"
    assert detail["guard_state"]["is_applicable"] is True


def test_dismiss_candidate_uses_unified_service_contract(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_long_term_memory_from_project(
        project_id="proj-1",
        scope="whole_project",
    )

    dismissed = service.dismiss_candidate(
        candidate.id,
        actor_type="user",
        reason="not_needed",
    )

    assert dismissed.status == "dismissed"
    detail = service.get_candidate_detail(candidate.id)
    assert detail["candidate"].terminal_reason == "not_needed"
    assert detail["action_history"][-1].action == "dismissed"


def test_defer_candidate_uses_unified_service_contract(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_memory_from_notebook(
        note_ids=["note-1"],
        fragment_ids=["frag-1"],
    )

    deferred = service.defer_candidate(
        candidate.id,
        actor_type="user",
        deferred_until="2026-04-02T09:00:00Z",
        reason="later",
    )

    assert deferred.status == "ready"
    assert deferred.deferred_until == "2026-04-02T09:00:00Z"
    detail = service.get_candidate_detail(candidate.id)
    assert detail["action_history"][-1].action == "deferred"
