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
    assert "concept:roadmap" in result.page_ids
