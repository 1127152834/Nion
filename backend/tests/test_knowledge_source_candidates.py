from nion.config.paths import Paths
from nion.knowledge.models import KnowledgeSourceCandidate


def test_paths_expose_dedicated_knowledge_root(tmp_path):
    paths = Paths(base_dir=tmp_path)

    assert paths.knowledge_root_dir == tmp_path / "knowledge"
    assert paths.knowledge_raw_dir == tmp_path / "knowledge" / "raw"
    assert paths.knowledge_wiki_dir == tmp_path / "knowledge" / "wiki"
    assert paths.knowledge_graph_dir == tmp_path / "knowledge" / "graph"
    assert paths.knowledge_meta_dir == tmp_path / "knowledge" / ".nion"


def test_source_candidate_allows_only_phase_one_notebook_inputs():
    candidate = KnowledgeSourceCandidate(
        source_id="source:notebook_note:note_1",
        source_kind="notebook_note",
        notebook_ref={"note_id": "note_1", "relative_path": "收件箱/roadmap.md"},
        title="Roadmap",
        summary="First draft",
        content_hash="abc123",
        status="queued",
        created_at="2026-04-13T00:00:00Z",
        updated_at="2026-04-13T00:00:00Z",
    )

    assert candidate.source_kind == "notebook_note"
