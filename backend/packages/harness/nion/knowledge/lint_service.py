from __future__ import annotations

import re
from pathlib import Path

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.paths import get_knowledge_paths

_WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


class KnowledgeLintService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._store = KnowledgePageStore(base_dir=base_dir)

    def run(self) -> dict[str, list[dict[str, object]]]:
        pages = []
        inbound: dict[str, int] = {}
        broken_links: list[dict[str, object]] = []

        for path in sorted(self._paths.knowledge_wiki_dir.rglob("*.md")):
            page_id = path.stem.replace("__", ":")
            page = self._store.read_page(page_id)
            pages.append(page)

        known_ids = {page.page_id for page in pages}
        known_titles = {page.title for page in pages}

        for page in pages:
            for target in _WIKILINK_RE.findall(page.body):
                inbound[target] = inbound.get(target, 0) + 1
                if target not in known_ids and target not in known_titles:
                    broken_links.append({"from": page.page_id, "to": target})

        orphan_pages = [
            {"page_id": page.page_id, "title": page.title}
            for page in pages
            if inbound.get(page.page_id, 0) == 0 and inbound.get(page.title, 0) == 0
        ]

        return {
            "orphan_pages": orphan_pages,
            "broken_links": broken_links,
            "stale_pages": [],
            "contradictions": [],
            "data_gaps": [],
        }
