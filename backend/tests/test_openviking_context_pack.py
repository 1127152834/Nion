from nion.openviking.context_pack import (
    NotebookContextPackItem,
    build_context_pack_markdown,
)


def test_context_pack_markdown_preserves_provenance():
    items = [
        NotebookContextPackItem(
            title="Roadmap",
            source_relative_path="projects/alpha/roadmap.md",
            snippet="Alpha launch depends on onboarding quality.",
            heading_path=["Roadmap"],
            resource_uri="viking://resources/notebook/projects/alpha/roadmap",
            updated_at="2026-03-30T00:00:00Z",
        )
    ]

    content = build_context_pack_markdown(items)
    assert "projects/alpha/roadmap.md" in content
    assert "Alpha launch depends on onboarding quality." in content
    assert "viking://resources/notebook/projects/alpha/roadmap" in content
