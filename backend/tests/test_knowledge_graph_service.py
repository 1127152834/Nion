from nion.knowledge.graph_service import KnowledgeGraphService
from nion.knowledge.page_store import KnowledgePageStore


def test_graph_service_outputs_extracted_and_inferred_edge_types(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    store.write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="See [[Entity:AlphaTeam]] for owners.",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )
    store.write_page(
        page_id="entity:alpha-team",
        page_type="entity",
        title="Alpha Team",
        body="Owner team",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    service = KnowledgeGraphService(base_dir=tmp_path)
    graph = service.build_graph()

    assert any(edge["edge_type"] == "EXTRACTED" for edge in graph["edges"])
