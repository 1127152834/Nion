from __future__ import annotations

import json

from langchain.tools import tool

from nion.knowledge.query_service import KnowledgeQueryService


@tool("query_knowledge_base", parse_docstring=True)
def query_knowledge_base_tool(question: str) -> str:
    """Query the compiled knowledge base.

    Use this when the user explicitly asks about the knowledge base, wiki pages,
    compiled project knowledge, or when the task depends on compiled knowledge
    rather than raw notebook notes or long-term memory.

    Args:
        question: Natural-language question to ask against compiled knowledge pages.

    Returns:
        JSON string containing the compiled answer, assistant-attachment metadata,
        and the legacy page_ids compatibility alias.
    """
    result = KnowledgeQueryService().answer(question)
    return json.dumps(
        {
            "answer_markdown": result.answer_markdown,
            "page_ids": result.matched_page_ids,
            "citations": result.citations,
            "matched_page_ids": result.matched_page_ids,
            "retrieval_policy": result.retrieval_policy,
            "warnings": result.warnings,
        },
        ensure_ascii=False,
    )
