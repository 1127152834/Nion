from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RuntimeMemorySearchPlan:
    query: str
    intent: str
    depth: str


_CONTINUITY_HINTS = ("继续", "上次", "之前", "刚才", "延续", "continue", "previous", "earlier")
_TARGETED_RECALL_HINTS = (
    "记得",
    "回忆",
    "原话",
    "怎么说",
    "怎么做",
    "那种",
    "流程",
    "步骤",
    "recall",
    "quote",
    "exact",
)


def build_runtime_search_plan(query: str) -> RuntimeMemorySearchPlan:
    normalized = query.strip()
    lowered = normalized.lower()

    if any(hint in lowered for hint in _CONTINUITY_HINTS):
        return RuntimeMemorySearchPlan(query=normalized, intent="continuity", depth="deep")
    if any(hint in lowered for hint in _TARGETED_RECALL_HINTS):
        return RuntimeMemorySearchPlan(query=normalized, intent="targeted_recall", depth="standard")
    if normalized:
        return RuntimeMemorySearchPlan(query=normalized, intent="general_recall", depth="standard")
    return RuntimeMemorySearchPlan(query="", intent="background", depth="shallow")
