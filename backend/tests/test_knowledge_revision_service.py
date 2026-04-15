from nion.knowledge.revision_service import KnowledgeRevisionService


def test_revision_service_uses_non_proposal_statuses(tmp_path):
    service = KnowledgeRevisionService(base_dir=tmp_path)
    request = service.create_request(
        page_id="concept:roadmap",
        request_type="fix_fact",
        instruction="Fix the owner name",
        optional_source_refs=[],
    )

    assert request.status == "open"
    previewed = service.mark_previewed(request.request_id)
    assert previewed.status == "previewed"
    closed = service.close_request(request.request_id)
    assert closed.status == "closed"


def test_revision_service_persists_optional_source_refs(tmp_path):
    service = KnowledgeRevisionService(base_dir=tmp_path)
    request = service.create_request(
        page_id="concept:roadmap",
        request_type="fix_fact",
        instruction="Fix the owner name",
        optional_source_refs=["source:notebook_note:note_1", "source:notebook_note:note_2"],
    )

    assert request.optional_source_refs == [
        "source:notebook_note:note_1",
        "source:notebook_note:note_2",
    ]
