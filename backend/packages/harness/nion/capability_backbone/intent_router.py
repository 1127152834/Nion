from __future__ import annotations

from nion.capability_backbone.registry import build_system_object_registry


def route_system_object_intent(text: str) -> str | None:
    normalized = text.lower()
    if "知识库" in normalized or "knowledge base" in normalized:
        return "knowledge_pages"
    if "知识图谱" in normalized or "knowledge graph" in normalized or "重建知识图谱" in normalized:
        return "knowledge_graph"
    for obj in build_system_object_registry():
        aliases = [alias.lower() for alias in obj["aliases"]]
        if any(alias in normalized for alias in aliases):
            return obj["id"]
    return None
