from nion.object_bridges.models import (
    BridgeActionProvenance,
    MemoryEntryCandidate,
    NotebookDraftCandidate,
    NotebookReferenceLink,
    ProjectDraftCandidate,
    ProjectReferenceLink,
    SkillCandidateDraft,
)


def test_notebook_draft_candidate_is_candidate_first() -> None:
    candidate = NotebookDraftCandidate(
        id="cand-note-1",
        source_project_id="proj-1",
        title="项目总结",
        body="summary",
        target_directory="收件箱",
        requires_confirmation=True,
        provenance=[],
    )

    assert candidate.title == "项目总结"
    assert candidate.requires_confirmation is True


def test_project_draft_candidate_captures_initial_project_shape() -> None:
    candidate = ProjectDraftCandidate(
        id="cand-proj-1",
        name="Project Alpha",
        goal="Build something",
        description="desc",
        initial_constraints=["constraint-a"],
        provenance=[],
    )

    assert candidate.name == "Project Alpha"
    assert candidate.initial_constraints == ["constraint-a"]


def test_memory_entry_candidate_has_confidence_and_provenance() -> None:
    provenance = [
        BridgeActionProvenance(
            action_name="extract_long_term_memory_from_project",
            source_objects=[],
            initiated_by="agent",
            approval_mode="required",
            created_at="2026-04-01T00:00:00Z",
        )
    ]
    candidate = MemoryEntryCandidate(
        id="cand-mem-1",
        category="learning",
        title="Learning",
        content="Do X before Y",
        confidence=0.8,
        provenance=provenance,
    )

    assert candidate.confidence == 0.8
    assert candidate.provenance == provenance


def test_skill_candidate_draft_tracks_summary() -> None:
    candidate = SkillCandidateDraft(
        id="cand-skill-1",
        title="Weekly review workflow",
        summary="Turn a project retro into a weekly review workflow",
        suggested_scope="project",
        provenance=[],
    )

    assert candidate.title == "Weekly review workflow"
    assert candidate.suggested_scope == "project"


def test_reference_links_capture_cross_object_bindings() -> None:
    project_link = ProjectReferenceLink(
        id="ref-proj-1",
        project_id="proj-1",
        note_id="note-1",
        fragment_id=None,
        relation="reference",
        created_at="2026-04-01T00:00:00Z",
    )
    notebook_link = NotebookReferenceLink(
        id="ref-note-1",
        note_id="note-1",
        project_id="proj-1",
        artifact_id="art-1",
        relation="derived_from",
        created_at="2026-04-01T00:00:00Z",
    )

    assert project_link.note_id == "note-1"
    assert notebook_link.artifact_id == "art-1"
