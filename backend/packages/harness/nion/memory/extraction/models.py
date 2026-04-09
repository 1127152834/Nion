from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, confloat

MEMORY_CHANGE_TYPES = (
    "new",
    "reinforce",
    "revise",
    "contradict",
    "expire",
)
MEMORY_STABILITY_LEVELS = ("ephemeral", "volatile", "stable", "core")
SOUL_LAYERS = (
    "constitution",
    "identity_narrative",
    "relationship_stance",
    "adaptive_overlay",
)

MemoryChangeType = Literal["new", "reinforce", "revise", "contradict", "expire"]
MemoryStability = Literal["ephemeral", "volatile", "stable", "core"]
SoulLayer = Literal["constitution", "identity_narrative", "relationship_stance", "adaptive_overlay"]
Score = confloat(ge=0.0, le=1.0, allow_inf_nan=False)


class MemoryProposal(BaseModel):
    proposal_id: str
    proposed_domain: str
    proposed_kind: str
    candidate_claim: str
    candidate_payload: dict[str, Any] = Field(default_factory=dict)
    supporting_evidence_ids: list[str] = Field(default_factory=list)
    estimated_stability: MemoryStability
    estimated_salience: Score
    estimated_confidence: Score
    change_type: MemoryChangeType
    judge_hints: list[str] = Field(default_factory=list)


class SoulSignal(BaseModel):
    signal_id: str
    source_memory_ids: list[str] = Field(default_factory=list)
    suggested_layer: SoulLayer
    summary: str
    confidence: Score
    evidence_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
