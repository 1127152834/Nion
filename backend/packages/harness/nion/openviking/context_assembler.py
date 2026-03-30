from __future__ import annotations

from nion.openviking.context_pack import NotebookContextPackItem, build_context_pack_markdown
from nion.recall.models import RecallSearchResult


def build_continuity_context_block(
    *,
    recall_results: list[RecallSearchResult],
    notebook_items: list[NotebookContextPackItem],
) -> str:
    blocks: list[str] = []
    if recall_results:
        blocks.append("\n".join(f"- {row.snippet}" for row in recall_results))
    if notebook_items:
        blocks.append(build_context_pack_markdown(notebook_items))
    return "<continuity_context>\n" + "\n\n".join(blocks) + "\n</continuity_context>"
