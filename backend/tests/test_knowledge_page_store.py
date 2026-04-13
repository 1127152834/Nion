from pathlib import Path

from nion.knowledge.frontmatter import split_knowledge_frontmatter
from nion.knowledge.page_store import KnowledgePageStore


def test_page_store_writes_required_frontmatter(tmp_path):
    store = KnowledgePageStore(base_dir=tmp_path)
    page = store.write_page(
        page_id="concept:memory-runtime-bundle",
        page_type="concept",
        title="Memory Runtime Bundle",
        body="## Summary\ncompiled body\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[
            {"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}
        ],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    text = Path(page.absolute_path).read_text(encoding="utf-8")
    frontmatter, body = split_knowledge_frontmatter(text)

    assert frontmatter["sources"] == ["source:notebook_note:note_1"]
    assert frontmatter["compiled_from"][0]["content_hash"] == "abc123"
    assert frontmatter["agent_owned"] is True
    assert frontmatter["human_editable"] is False
    assert body.strip().startswith("## Summary")
