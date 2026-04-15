from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.query_service import KnowledgeQueryService


def test_query_service_reads_pages_not_notebook_sources(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="## Summary\nRoadmap summary\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    service = KnowledgeQueryService(base_dir=tmp_path)
    result = service.answer("What does the knowledge base say about roadmap?")

    assert "Roadmap summary" in result.answer_markdown
    assert "concept:roadmap" in result.matched_page_ids
    assert result.retrieval_policy == "active_only"
    assert result.warnings == []
    assert result.citations[0]["page_state"] == "active"


def test_query_prefers_active_pages_and_downgrades_stale(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap-active",
        page_type="concept",
        title="Roadmap Active",
        body="current roadmap",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-15T10:00:00Z",
        page_state="active",
    )
    store.write_page(
        page_id="concept:roadmap-stale",
        page_type="concept",
        title="Roadmap Stale",
        body="old roadmap",
        sources=["source:notebook_note:note_2"],
        compiled_from=[{"source_id": "source:notebook_note:note_2", "content_hash": "def456"}],
        last_compiled_at="2026-04-15T09:00:00Z",
        page_state="stale",
    )

    result = KnowledgeQueryService(base_dir=tmp_path).answer("roadmap")

    assert result.retrieval_policy == "active_only"
    assert result.citations[0]["page_state"] == "active"
    assert "old roadmap" not in result.answer_markdown


def test_query_include_archived_returns_archived_matches_with_warning(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap-active",
        page_type="concept",
        title="Roadmap Active",
        body="current roadmap",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-15T10:00:00Z",
        page_state="active",
    )
    store.write_page(
        page_id="concept:roadmap-archived",
        page_type="concept",
        title="Roadmap Archived",
        body="archived roadmap",
        sources=["source:notebook_note:note_2"],
        compiled_from=[{"source_id": "source:notebook_note:note_2", "content_hash": "def456"}],
        last_compiled_at="2026-04-14T10:00:00Z",
        page_state="archived",
    )

    result = KnowledgeQueryService(base_dir=tmp_path).answer("roadmap", include_archived=True)

    assert result.retrieval_policy == "explicit_archived_lookup"
    assert {citation["page_state"] for citation in result.citations} == {"active", "archived"}
    assert "concept:roadmap-active" in result.matched_page_ids
    assert "concept:roadmap-archived" in result.matched_page_ids
    assert "Query included archived knowledge pages." in result.warnings
