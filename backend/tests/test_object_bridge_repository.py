from dataclasses import asdict

from nion.object_bridges.models import (
    BridgeActionProvenance,
    BridgeCandidateRecord,
    NotebookDraftCandidate,
    ObjectProvenance,
    ProjectReferenceLink,
)
from nion.object_bridges.repository import ObjectBridgeRepository


def _provenance() -> list[BridgeActionProvenance]:
    return [
        BridgeActionProvenance(
            action_name="export_project_summary_to_notebook",
            source_objects=[
                ObjectProvenance(
                    source_object_type="project",
                    source_object_id="proj-1",
                    source_action="summary",
                    created_at="2026-04-01T00:00:00Z",
                    created_by="agent",
                )
            ],
            initiated_by="agent",
            approval_mode="required",
            created_at="2026-04-01T00:00:00Z",
        )
    ]


def test_repository_can_save_and_get_candidate(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    notebook_candidate = NotebookDraftCandidate(
        id="cand-1",
        source_project_id="proj-1",
        title="项目总结",
        body="summary",
        target_directory="收件箱",
        requires_confirmation=True,
        provenance=_provenance(),
    )
    candidate = BridgeCandidateRecord(
        id="cand-1",
        candidate_type="notebook_draft",
        status="draft",
        title="项目总结",
        summary="一段摘要",
        requires_confirmation=True,
        payload={"candidate": asdict(notebook_candidate)},
        provenance=_provenance(),
        created_at="2026-04-01T00:00:00Z",
        updated_at="2026-04-01T00:00:00Z",
    )

    repository.save_candidate(candidate)
    restored = repository.get_candidate("cand-1")

    assert restored is not None
    assert restored.id == "cand-1"
    assert restored.candidate_type == "notebook_draft"
    assert restored.status == "draft"


def test_repository_updates_candidate_status(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    candidate = BridgeCandidateRecord(
        id="cand-2",
        candidate_type="memory_entry",
        status="draft",
        title="记忆候选",
        summary="summary",
        requires_confirmation=True,
        payload={"content": "Do X before Y"},
        provenance=_provenance(),
        created_at="2026-04-01T00:00:00Z",
        updated_at="2026-04-01T00:00:00Z",
    )

    repository.save_candidate(candidate)
    updated = repository.update_candidate_status("cand-2", "applied")

    assert updated.status == "applied"
    assert repository.get_candidate("cand-2").status == "applied"


def test_repository_lists_candidates_by_status(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    repository.save_candidate(
        BridgeCandidateRecord(
            id="cand-a",
            candidate_type="project_draft",
            status="draft",
            title="A",
            summary="A",
            requires_confirmation=True,
            payload={},
            provenance=[],
        )
    )
    repository.save_candidate(
        BridgeCandidateRecord(
            id="cand-b",
            candidate_type="project_draft",
            status="applied",
            title="B",
            summary="B",
            requires_confirmation=True,
            payload={},
            provenance=[],
        )
    )

    drafts = repository.list_candidates(status="draft")
    assert [item.id for item in drafts] == ["cand-a"]


def test_repository_can_save_and_list_project_reference_links(tmp_path) -> None:
    repository = ObjectBridgeRepository(base_dir=tmp_path / "nion-home")
    link = ProjectReferenceLink(
        id="ref-1",
        project_id="proj-1",
        note_id="note-1",
        fragment_id=None,
        relation="reference",
        created_at="2026-04-01T00:00:00Z",
    )

    repository.save_project_reference(link)
    links = repository.list_project_references("proj-1")

    assert len(links) == 1
    assert links[0].note_id == "note-1"
