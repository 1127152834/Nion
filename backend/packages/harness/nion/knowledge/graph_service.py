from __future__ import annotations

import json
import math
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

    def _sanitize_node_positions(self, value: object) -> dict[str, dict[str, float]]:
        if not isinstance(value, dict):
            return {}
        sanitized: dict[str, dict[str, float]] = {}
        for node_id, position in value.items():
            if not isinstance(node_id, str) or not isinstance(position, dict):
                continue
            x = position.get("x")
            y = position.get("y")
            if not isinstance(x, int | float) or not isinstance(y, int | float):
                continue
            if not math.isfinite(x) or not math.isfinite(y):
                continue
            sanitized[node_id] = {
                "x": float(x),
                "y": float(y),
            }
        return sanitized

    def _sanitize_string_list(self, value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        return [item for item in value if isinstance(item, str)]

    def _sanitize_updated_at(self, value: object) -> str:
        return value if isinstance(value, str) else utcnow_z()

    def _sanitize_layout(self, value: object) -> dict[str, object]:
        if not isinstance(value, dict):
            return self.default_layout()
        return {
            "version": 1,
            "node_positions": self._sanitize_node_positions(value.get("node_positions")),
            "collapsed_clusters": self._sanitize_string_list(value.get("collapsed_clusters")),
            "highlighted_node_ids": self._sanitize_string_list(value.get("highlighted_node_ids")),
            "updated_at": self._sanitize_updated_at(value.get("updated_at")),
        }

    def load_layout(self) -> dict[str, object]:
        path = self._layout_path()
        if not path.exists():
            return self.default_layout()
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self.default_layout()
        return self._sanitize_layout(raw)

    def save_layout(self, layout: dict[str, object]) -> dict[str, object]:
        path = self._layout_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        normalized_layout = self._sanitize_layout(layout)
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
