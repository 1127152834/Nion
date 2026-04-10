from __future__ import annotations

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, confloat

class SoulLayerEnum(StrEnum):
    CONSTITUTION = "constitution"
    IDENTITY_NARRATIVE = "identity_narrative"
    RELATIONSHIP_STANCE = "relationship_stance"
    ADAPTIVE_OVERLAY = "adaptive_overlay"

SOUL_LAYERS = (
    SoulLayerEnum.CONSTITUTION.value,
    SoulLayerEnum.IDENTITY_NARRATIVE.value,
    SoulLayerEnum.RELATIONSHIP_STANCE.value,
    SoulLayerEnum.ADAPTIVE_OVERLAY.value,
)
SOUL_JUDGE_ACTIONS = (
    "accept_overlay",
    "extend_overlay",
    "promote_to_identity_narrative",
    "reject",
    "expire_existing_overlay",
)

SoulLayer = Literal[
    SoulLayerEnum.CONSTITUTION.value,
    SoulLayerEnum.IDENTITY_NARRATIVE.value,
    SoulLayerEnum.RELATIONSHIP_STANCE.value,
    SoulLayerEnum.ADAPTIVE_OVERLAY.value,
]
SoulJudgeAction = Literal[
    "accept_overlay",
    "extend_overlay",
    "promote_to_identity_narrative",
    "reject",
    "expire_existing_overlay",
]
Score = confloat(ge=0.0, le=1.0, allow_inf_nan=False)


class SoulSignal(BaseModel):
    signal_id: str
    source_memory_ids: list[str] = Field(default_factory=list)
    suggested_layer: SoulLayer
    summary: str
    confidence: Score
    evidence_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SoulJudgeDecision(BaseModel):
    action: SoulJudgeAction
    target_layer: SoulLayer | None = None
    rationale: str
    metadata: dict[str, Any] = Field(default_factory=dict)
