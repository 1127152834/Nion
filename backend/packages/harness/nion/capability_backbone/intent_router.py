from __future__ import annotations

from nion.capability_backbone.registry import build_system_object_registry


def route_system_object_intent(text: str) -> str | None:
    normalized = text.lower()
    for obj in build_system_object_registry():
        aliases = [alias.lower() for alias in obj["aliases"]]
        if any(alias in normalized for alias in aliases):
            return obj["id"]
    return None
