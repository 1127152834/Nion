from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.paths import get_knowledge_paths


@dataclass
class KnowledgeQueryResult:
    answer_markdown: str
    citations: list[dict[str, object]]
    matched_page_ids: list[str]
    retrieval_policy: str
    warnings: list[str]


class KnowledgeQueryService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._store = KnowledgePageStore(base_dir=base_dir)

    def answer(self, question: str, *, include_archived: bool = False) -> KnowledgeQueryResult:
        question_words = [
            word
            for word in re.findall(r"[A-Za-z0-9_\-\u4e00-\u9fff]+", question.lower())
            if word
        ]
        matches: list[tuple[int, dict[str, object], str]] = []
        for path in sorted(self._paths.knowledge_wiki_dir.rglob("*.md")):
            page_id = path.stem.replace("__", ":")
            page = self._store.read_page(page_id)
            if page.page_state == "archived" and not include_archived:
                continue
            haystack = f"{page.title}\n{page.body}".lower()
            matched_terms = [word for word in question_words if word in haystack]
            if not matched_terms:
                continue
            score = len(matched_terms)
            if page.page_state == "stale":
                score -= 10
            matches.append(
                (
                    score,
                    {
                        "page_id": page.page_id,
                        "title": page.title,
                        "page_type": page.page_type,
                        "page_state": page.page_state,
                        "source_ids": list(page.sources),
                        "score": score,
                    },
                    page.body,
                )
            )

        matches.sort(key=lambda item: (item[0], str(item[1]["page_id"])), reverse=True)
        has_active_match = any(citation["page_state"] == "active" for _, citation, _ in matches)
        selected_matches = list(matches) if include_archived else [
            item for item in matches if item[1]["page_state"] != "archived"
        ]
        retrieval_policy = "explicit_archived_lookup" if include_archived else "active_only"
        warnings: list[str] = []

        if include_archived:
            if any(citation["page_state"] == "archived" for _, citation, _ in selected_matches):
                warnings.append("Query included archived knowledge pages.")
        elif has_active_match:
            selected_matches = [
                item for item in selected_matches if item[1]["page_state"] == "active"
            ]
        else:
            stale_matches = [
                item for item in selected_matches if item[1]["page_state"] == "stale"
            ]
            if stale_matches:
                selected_matches = stale_matches
                retrieval_policy = "active_with_stale_fallback"
                warnings.append("Query used stale knowledge pages because no active matches were found.")

        citations = [citation for _, citation, _ in selected_matches]
        matched_page_ids = [
            str(citation["page_id"])
            for citation in citations
        ]
        answer_parts = [body for _, _, body in selected_matches]
        return KnowledgeQueryResult(
            answer_markdown="\n\n".join(answer_parts),
            citations=citations,
            matched_page_ids=matched_page_ids,
            retrieval_policy=retrieval_policy,
            warnings=warnings,
        )
