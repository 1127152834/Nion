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
    service.repository.save_candidate(
        replace(candidate, payload=broken_payload, status="ready")
    )

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
    service.repository.save_candidate(
        replace(candidate, payload=broken_payload, status="ready")
    )

    with pytest.raises(RuntimeError, match="apply failed"):
        service.apply_candidate(candidate.id, actor_type="user")

    detail = service.get_candidate_detail(candidate.id)
    assert detail["candidate"].status == "ready"
    assert detail["candidate"].last_error is not None
    assert detail["candidate"].last_error["error_code"] == "apply_failed"
    assert detail["guard_state"]["is_applicable"] is True
