from __future__ import annotations

import re
from pathlib import Path

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.paths import get_knowledge_paths

_WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


class KnowledgeGraphService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._store = KnowledgePageStore(base_dir=base_dir)

    def build_graph(self) -> dict[str, list[dict[str, object]]]:
        nodes: list[dict[str, object]] = []
        edges: list[dict[str, object]] = []
        for path in sorted(self._paths.knowledge_wiki_dir.glob("*.md")):
            page_id = path.stem.replace("__", ":", 1)
            page = self._store.read_page(page_id)
            nodes.append({"id": page.page_id, "label": page.title})
            for match in _WIKILINK_RE.findall(page.body):
                edges.append(
                    {
                        "from": page.page_id,
                        "to": match,
                        "edge_type": "EXTRACTED",
                    }
                )
        return {"nodes": nodes, "edges": edges}
