import pytest

from nion.object_bridges.service import ObjectBridgeService


def test_apply_project_draft_candidate_marks_candidate_applied(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.create_project_from_notebook(
        note_ids=["note-1"],
        fragment_ids=["frag-1"],
    )
    assert candidate.status == "ready"

    result = service.apply_candidate(candidate.id, actor_type="user")
    updated = service.get_candidate_detail(candidate.id)["candidate"]

    assert result["candidate"].status == "applied"
    assert result["candidate"].applied_by == "user"
    assert result["applied_target"]["target_object_type"] == "project"
    assert updated.status == "applied"


def test_apply_notebook_draft_candidate_marks_candidate_applied(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.export_project_summary_to_notebook(
        project_id="proj-1",
        scope="whole_project",
        target_directory="Inbox",
    )
    assert candidate.status == "ready"

    result = service.apply_candidate(candidate.id, actor_type="user")

    assert result["candidate"].status == "applied"
    assert result["applied_target"]["target_object_type"] == "notebook"


def test_apply_memory_entry_candidate_marks_candidate_applied(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_long_term_memory_from_project(
        project_id="proj-1",
        scope="whole_project",
    )
    assert candidate.status == "ready"

    result = service.apply_candidate(candidate.id, actor_type="user")

    assert result["candidate"].status == "applied"
    assert result["applied_target"]["target_object_type"] == "memory"


def test_apply_project_constraint_candidate_marks_candidate_applied(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_constraints_from_notebook(
        project_id="proj-1",
        note_ids=["note-1"],
        fragment_ids=["frag-1"],
    )
    assert candidate.status == "ready"

    result = service.apply_candidate(candidate.id, actor_type="user")

    assert result["candidate"].status == "applied"
    assert result["applied_target"]["target_object_type"] == "project"


def test_apply_skill_candidate_is_rejected_in_phase2(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_skill_candidate_from_project(
        project_id="proj-1",
        scope="whole_project",
    )
    assert candidate.status == "ready"

    with pytest.raises(ValueError, match="apply handler"):
        service.apply_candidate(candidate.id, actor_type="user")


def test_get_candidate_detail_returns_minimum_candidate_center_shape(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_long_term_memory_from_project(
        project_id="proj-1",
        scope="whole_project",
    )
    assert candidate.status == "ready"

    detail = service.get_candidate_detail(candidate.id)

    assert detail["candidate"].id == candidate.id
    assert detail["provenance"] == candidate.provenance
    assert detail["action_history"]
    assert detail["guard_state"]["is_applicable"] is True
    assert "checked_at" in detail["guard_state"]
    assert detail["source_summary"]["source_object_type"] == "project"
    assert detail["target_summary"]["target_object_type"] == "memory"


def test_list_candidates_returns_ready_candidates_with_actions(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    service.create_project_from_notebook(
        note_ids=["note-1"],
        fragment_ids=["frag-1"],
    )
    service.extract_skill_candidate_from_project(
        project_id="proj-1",
        scope="whole_project",
    )

    items = service.list_candidates(status="ready")

    assert [item.status for item in items] == ["ready", "ready"]
    assert items[0].available_actions == ["apply", "dismiss", "defer"]
    assert items[1].available_actions == ["dismiss", "defer"]
    assert type(items[0].provenance[0]).__name__ == "BridgeActionProvenance"
    detail = service.get_candidate_detail(items[0].id)
    assert detail["source_summary"]["source_object_type"] == "notebook"


def test_skill_candidate_detail_reports_apply_as_unsupported(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")
    candidate = service.extract_skill_candidate_from_project(
        project_id="proj-1",
        scope="whole_project",
    )

    detail = service.get_candidate_detail(candidate.id)

    assert detail["candidate"].available_actions == ["dismiss", "defer"]
    assert detail["guard_state"]["is_applicable"] is False
    assert "unsupported_apply" in detail["guard_state"]["reasons"]
    assert detail["target_summary"]["target_object_type"] == "skill"
