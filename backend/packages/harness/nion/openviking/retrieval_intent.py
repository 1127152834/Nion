from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RetrievalIntent:
    search_notebook: bool
    reason: str


NOTEBOOK_HINTS = (
    "笔记",
    "记录过",
    "知识库",
    "项目",
    "员工",
    "方案",
    "roadmap",
    "onboarding",
)


def classify_retrieval_intent(message: str) -> RetrievalIntent:
    normalized = message.strip().lower()
    if any(hint in normalized for hint in NOTEBOOK_HINTS):
        return RetrievalIntent(
            search_notebook=True,
            reason="matched notebook-oriented keywords",
        )
    return RetrievalIntent(
        search_notebook=False,
        reason="no notebook-oriented keywords detected",
    )
