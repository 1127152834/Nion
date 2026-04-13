from nion.knowledge.lint_service import KnowledgeLintService
from nion.knowledge.page_store import KnowledgePageStore


def test_lint_service_reports_orphan_broken_and_stale_buckets(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="See [[entity:missing-team]]",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    service = KnowledgeLintService(base_dir=tmp_path)
    report = service.run()

    assert "orphan_pages" in report
    assert "broken_links" in report
    assert "stale_pages" in report
    assert "data_gaps" in report
