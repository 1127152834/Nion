from __future__ import annotations

import pytest
from pydantic import ValidationError

from nion.memory.extraction.models import (
    MEMORY_CHANGE_TYPES,
    MEMORY_STABILITY_LEVELS,
    MemoryProposal,
    SoulSignal,
)
from nion.memory.judge.models import JUDGE_ACTIONS, MemoryJudgeDecision


def test_memory_judge_contract_literals_are_stable():
    assert MEMORY_CHANGE_TYPES == (
        "new",
        "reinforce",
        "revise",
        "contradict",
        "expire",
    )
    assert MEMORY_STABILITY_LEVELS == ("ephemeral", "volatile", "stable", "core")
    assert JUDGE_ACTIONS == (
        "accept",
        "accept_as_revision",
        "reinforce_existing",
        "freeze_existing_and_replace",
        "reject",
        "defer",
    )


def test_memory_proposal_captures_change_type_and_evidence():
    proposal = MemoryProposal(
        proposal_id="prop_1",
        proposed_domain="user_model",
        proposed_kind="preference",
        candidate_claim="用户偏好结论先行",
        candidate_payload={"style": "conclusion_first"},
        supporting_evidence_ids=["ev_1"],
        estimated_stability="stable",
        estimated_salience=0.8,
        estimated_confidence=0.9,
        change_type="new",
        judge_hints=["explicit_user_statement"],
    )

    assert proposal.change_type == "new"
    assert proposal.supporting_evidence_ids == ["ev_1"]
    assert proposal.candidate_payload == {"style": "conclusion_first"}


def test_soul_signal_accepts_structured_projection_payload():
    signal = SoulSignal(
        signal_id="sig_1",
        source_memory_ids=["mem_1"],
        suggested_layer="adaptive_overlay",
        summary="最近几轮对话显示应减少鼓励式措辞。",
        confidence=0.82,
        evidence_ids=["ev_1"],
        metadata={"window": "recent_turns"},
    )

    assert signal.suggested_layer == "adaptive_overlay"
    assert signal.metadata == {"window": "recent_turns"}


def test_memory_judge_decision_can_mark_reinforcement():
    decision = MemoryJudgeDecision(
        action="reinforce_existing",
        target_memory_id="mem_1",
        target_revision_id="rev_1",
        rationale="Repeated explicit preference",
        created_revision=None,
        created_decision_id="dec_1",
    )

    assert decision.action == "reinforce_existing"
    assert decision.target_memory_id == "mem_1"


@pytest.mark.parametrize("field_name", ["estimated_salience", "estimated_confidence"])
@pytest.mark.parametrize("invalid_value", [-0.01, 1.01, float("nan"), float("inf"), -float("inf")])
def test_memory_proposal_rejects_invalid_score_values(field_name: str, invalid_value: float):
    payload = {
        "proposal_id": "prop_bad_score",
        "proposed_domain": "user_model",
        "proposed_kind": "preference",
        "candidate_claim": "bad score",
        "candidate_payload": {},
        "supporting_evidence_ids": ["ev_1"],
        "estimated_stability": "stable",
        "estimated_salience": 0.5,
        "estimated_confidence": 0.5,
        "change_type": "new",
        "judge_hints": [],
    }
    payload[field_name] = invalid_value

    with pytest.raises(ValidationError):
        MemoryProposal(**payload)


@pytest.mark.parametrize("invalid_value", [-0.01, 1.01, float("nan"), float("inf"), -float("inf")])
def test_soul_signal_rejects_invalid_confidence(invalid_value: float):
    with pytest.raises(ValidationError):
        SoulSignal(
            signal_id="sig_bad_confidence",
            source_memory_ids=["mem_1"],
            suggested_layer="adaptive_overlay",
            summary="bad confidence",
            confidence=invalid_value,
            evidence_ids=["ev_1"],
            metadata={},
        )


def test_memory_proposal_rejects_unknown_change_type():
    with pytest.raises(ValidationError):
        MemoryProposal(
            proposal_id="prop_bad",
            proposed_domain="user_model",
            proposed_kind="preference",
            candidate_claim="bad",
            candidate_payload={},
            supporting_evidence_ids=["ev_1"],
            estimated_stability="stable",
            estimated_salience=0.5,
            estimated_confidence=0.5,
            change_type="replace",
            judge_hints=[],
        )


def test_soul_signal_rejects_unknown_suggested_layer():
    with pytest.raises(ValidationError):
        SoulSignal(
            signal_id="sig_bad_layer",
            source_memory_ids=["mem_1"],
            suggested_layer="persona",
            summary="bad layer",
            confidence=0.5,
            evidence_ids=["ev_1"],
            metadata={},
        )


def test_memory_judge_decision_rejects_unknown_action():
    with pytest.raises(ValidationError):
        MemoryJudgeDecision(
            action="promote",
            target_memory_id="mem_1",
            target_revision_id=None,
            rationale="unsupported",
            created_revision=None,
            created_decision_id="dec_bad",
        )
