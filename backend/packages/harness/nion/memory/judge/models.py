from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

JUDGE_ACTIONS = (
    "accept",
    "accept_as_revision",
    "reinforce_existing",
    "freeze_existing_and_replace",
    "reject",
    "defer",
)

JudgeAction = Literal[
    "accept",
    "accept_as_revision",
    "reinforce_existing",
    "freeze_existing_and_replace",
    "reject",
    "defer",
]


class MemoryJudgeDecision(BaseModel):
    action: JudgeAction
    target_memory_id: str | None = None
    target_revision_id: str | None = None
    rationale: str
    created_revision: dict[str, Any] | None = None
    created_decision_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)
