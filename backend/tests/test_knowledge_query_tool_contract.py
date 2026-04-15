from pathlib import Path

from nion.knowledge.page_store import KnowledgePageStore
from nion.tools.builtins.knowledge_tools import query_knowledge_base_tool


def test_builtin_tools_export_knowledge_query_tool() -> None:
    source = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "tools"
        / "builtins"
        / "__init__.py"
    ).read_text(encoding="utf-8")

    assert "query_knowledge_base_tool" in source


def test_query_knowledge_base_tool_reads_compiled_pages(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    KnowledgePageStore(base_dir=tmp_path).write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="## Summary\nRoadmap summary\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    payload = query_knowledge_base_tool.invoke({"question": "roadmap"})

    assert "Roadmap summary" in payload
    assert "concept:roadmap" in payload
