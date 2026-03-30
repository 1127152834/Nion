from nion.openviking.context_assembler import build_continuity_context_block
from nion.openviking.context_pack import NotebookContextPackItem
from nion.recall.models import RecallSearchResult


def test_build_continuity_context_block_merges_recall_and_notebook_sources():
    recall_results = [
        RecallSearchResult(
            thread_id="thread-1",
            agent_name="lead_agent",
            role="ai",
            snippet="We rotated the staging token and restarted the worker.",
            created_at="2026-03-30T00:00:00Z",
        )
    ]
    notebook_items = [
        NotebookContextPackItem(
            title="Roadmap",
            source_relative_path="projects/alpha/roadmap.md",
            snippet="Alpha launch depends on onboarding quality.",
            heading_path=["Roadmap"],
            resource_uri="viking://resources/notebook/projects/alpha/roadmap",
            updated_at="2026-03-30T00:00:00Z",
        )
    ]

    content = build_continuity_context_block(
        recall_results=recall_results,
        notebook_items=notebook_items,
    )

    assert "<continuity_context>" in content
    assert "staging token" in content
    assert "projects/alpha/roadmap.md" in content
    assert "viking://resources/notebook/projects/alpha/roadmap" in content
