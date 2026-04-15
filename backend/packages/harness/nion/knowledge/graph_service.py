from __future__ import annotations

import json
import re
from pathlib import Path

from nion.knowledge.page_store import KnowledgePageStore
from nion.knowledge.paths import get_knowledge_paths
from nion.memory_os.clock import utcnow_z

_WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
_GRAPH_LAYOUT_FILENAME = "layout.json"


class KnowledgeGraphService:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._store = KnowledgePageStore(base_dir=base_dir)

    def _layout_path(self) -> Path:
        return self._paths.knowledge_graph_dir / _GRAPH_LAYOUT_FILENAME

    def default_layout(self) -> dict[str, object]:
        return {
            "version": 1,
            "node_positions": {},
            "collapsed_clusters": [],
            "highlighted_node_ids": [],
            "updated_at": utcnow_z(),
        }

    def load_layout(self) -> dict[str, object]:
        path = self._layout_path()
        if not path.exists():
            return self.default_layout()
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self.default_layout()
        if not isinstance(raw, dict):
            return self.default_layout()
        return {
            "version": 1,
            "node_positions": raw.get("node_positions", {}),
            "collapsed_clusters": raw.get("collapsed_clusters", []),
            "highlighted_node_ids": raw.get("highlighted_node_ids", []),
            "updated_at": raw.get("updated_at", utcnow_z()),
        }

    def save_layout(self, layout: dict[str, object]) -> dict[str, object]:
        path = self._layout_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        normalized_layout = {
            "version": 1,
            "node_positions": layout.get("node_positions", {}),
            "collapsed_clusters": layout.get("collapsed_clusters", []),
            "highlighted_node_ids": layout.get("highlighted_node_ids", []),
            "updated_at": layout.get("updated_at", utcnow_z()),
        }
        path.write_text(
            json.dumps(normalized_layout, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return normalized_layout

    def build_graph(self) -> dict[str, list[dict[str, object]]]:
        nodes: list[dict[str, object]] = []
        edges: list[dict[str, object]] = []
        for path in sorted(self._paths.knowledge_wiki_dir.rglob("*.md")):
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

    def load_graph(self) -> dict[str, object]:
        graph = self.build_graph()
        return {**graph, "layout": self.load_layout()}
