from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.paths import get_knowledge_paths


@dataclass
class KnowledgeQueryResult:
    answer_markdown: str
    page_ids: list[str]


class KnowledgeQueryService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._store = KnowledgePageStore(base_dir=base_dir)

    def answer(self, question: str) -> KnowledgeQueryResult:
        question_words = [
            word
            for word in re.findall(r"[A-Za-z0-9_\-\u4e00-\u9fff]+", question.lower())
            if word
        ]
        page_ids: list[str] = []
        answer_parts: list[str] = []
        for path in sorted(self._paths.knowledge_wiki_dir.rglob("*.md")):
            page_id = path.stem.replace("__", ":")
            page = self._store.read_page(page_id)
            haystack = f"{page.title}\n{page.body}".lower()
            if any(word in haystack for word in question_words):
                page_ids.append(page.page_id)
                answer_parts.append(page.body)
        return KnowledgeQueryResult(
            answer_markdown="\n\n".join(answer_parts),
            page_ids=page_ids,
        )
