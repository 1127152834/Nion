from nion.object_bridges.service import ObjectBridgeService


def test_create_project_from_notebook_returns_project_draft_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.create_project_from_notebook(
        note_ids=["note-1"],
        fragment_ids=[],
    )

    assert candidate.candidate_type == "project_draft"
    assert candidate.requires_confirmation is True
    assert candidate.provenance


def test_create_plan_from_notebook_returns_project_plan_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.create_plan_from_notebook(
        project_id="proj-1",
        note_ids=["note-1"],
        fragment_ids=[],
    )

    assert candidate.candidate_type == "project_draft"
    assert candidate.provenance


def test_extract_constraints_from_notebook_returns_project_constraint_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.extract_constraints_from_notebook(
        project_id="proj-1",
        note_ids=["note-1"],
        fragment_ids=[],
    )

    assert candidate.candidate_type == "project_constraint"
    assert candidate.provenance


def test_export_project_summary_to_notebook_returns_notebook_draft_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.export_project_summary_to_notebook(
        project_id="proj-1",
        scope="whole_project",
        target_directory="收件箱",
    )

    assert candidate.candidate_type == "notebook_draft"
    assert candidate.requires_confirmation is True


def test_extract_long_term_memory_from_project_returns_memory_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.extract_long_term_memory_from_project(
        project_id="proj-1",
        scope="whole_project",
    )

    assert candidate.candidate_type == "memory_entry"
    assert candidate.requires_confirmation is True


def test_extract_memory_from_notebook_returns_memory_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.extract_memory_from_notebook(
        note_ids=["note-1"],
        fragment_ids=[],
    )

    assert candidate.candidate_type == "memory_entry"
    assert candidate.provenance


def test_extract_skill_candidate_from_project_returns_skill_candidate(tmp_path) -> None:
    service = ObjectBridgeService(base_dir=tmp_path / "nion-home")

    candidate = service.extract_skill_candidate_from_project(
        project_id="proj-1",
        scope="whole_project",
    )

    assert candidate.candidate_type == "skill_candidate"
    assert candidate.requires_confirmation is True
