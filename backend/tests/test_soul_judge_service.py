from __future__ import annotations

import pytest
from pydantic import ValidationError

from nion.memory.soul.judge import judge_soul_signal
from nion.memory.soul.models import (
    SOUL_JUDGE_ACTIONS,
    SOUL_LAYERS,
    SoulLayerEnum,
    SoulJudgeDecision,
    SoulSignal,
)


def test_soul_contract_literals_are_stable():
    assert SOUL_LAYERS == (
        "constitution",
        "identity_narrative",
        "relationship_stance",
        "adaptive_overlay",
    )
    assert SOUL_JUDGE_ACTIONS == (
        "accept_overlay",
        "extend_overlay",
        "promote_to_identity_narrative",
        "reject",
        "expire_existing_overlay",
    )
    assert SoulLayerEnum.CONSTITUTION.value == "constitution"
    assert SoulLayerEnum.IDENTITY_NARRATIVE.value == "identity_narrative"
    assert SoulLayerEnum.RELATIONSHIP_STANCE.value == "relationship_stance"
    assert SoulLayerEnum.ADAPTIVE_OVERLAY.value == "adaptive_overlay"


def test_soul_signal_accepts_structured_metadata():
    signal = SoulSignal(
        signal_id="sig_1",
        source_memory_ids=["mem_1"],
        suggested_layer="adaptive_overlay",
        summary="最近减少鼓励式措辞",
        confidence=0.82,
        evidence_ids=["ev_1"],
        metadata={"window": "recent_turns"},
    )

    assert signal.suggested_layer == "adaptive_overlay"
    assert signal.metadata == {"window": "recent_turns"}


def test_soul_judge_decision_rejects_unknown_action():
    with pytest.raises(ValidationError):
        SoulJudgeDecision(
            action="promote",
            target_layer=None,
            rationale="unsupported",
            metadata={},
        )


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


def test_soul_judge_accepts_overlay_for_short_term_adjustment():
    signal = SoulSignal(
        signal_id="sig_overlay_accept",
        source_memory_ids=["mem_1"],
        suggested_layer="adaptive_overlay",
        summary="最近减少鼓励式措辞",
        confidence=0.8,
        evidence_ids=["ev_1"],
    )

    decision = judge_soul_signal(signal, existing_layers={})

    assert decision.action == "accept_overlay"
    assert decision.target_layer == "adaptive_overlay"


def test_soul_judge_extends_existing_overlay_for_similar_signal():
    signal = SoulSignal(
        signal_id="sig_overlay_extend",
        source_memory_ids=["mem_2"],
        suggested_layer="adaptive_overlay",
        summary="继续减少鼓励式措辞",
        confidence=0.81,
        evidence_ids=["ev_2"],
    )

    decision = judge_soul_signal(
        signal,
        existing_layers={
            "adaptive_overlay": [
                {
                    "summary": "最近减少鼓励式措辞",
                    "status": "active",
                }
            ]
        },
    )

    assert decision.action == "extend_overlay"
    assert decision.target_layer == "adaptive_overlay"


def test_soul_judge_keeps_repeated_overlay_signals_inside_overlay_lane():
    signal = SoulSignal(
        signal_id="sig_relationship",
        source_memory_ids=["mem_3"],
        suggested_layer="adaptive_overlay",
        summary="对用户保持低刺激、少说教的支持方式",
        confidence=0.86,
        evidence_ids=["ev_3"],
        metadata={"repeat_count": 3},
    )

    decision = judge_soul_signal(signal, existing_layers={})

    assert decision.action == "accept_overlay"
    assert decision.target_layer == "adaptive_overlay"


def test_soul_judge_promotes_identity_narrative_when_stable_self_story_emerges():
    signal = SoulSignal(
        signal_id="sig_identity",
        source_memory_ids=["mem_4"],
        suggested_layer="identity_narrative",
        summary="长期形成以冷静、低刺激陪伴为核心的自我叙事",
        confidence=0.93,
        evidence_ids=["ev_4"],
        metadata={"stability": "stable"},
    )

    decision = judge_soul_signal(signal, existing_layers={})

    assert decision.action == "promote_to_identity_narrative"
    assert decision.target_layer == "identity_narrative"


def test_soul_judge_rejects_direct_constitution_mutation():
    signal = SoulSignal(
        signal_id="sig_reject",
        source_memory_ids=["mem_5"],
        suggested_layer="constitution",
        summary="因为一次聊天改变核心人格",
        confidence=0.95,
        evidence_ids=["ev_5"],
    )

    decision = judge_soul_signal(signal, existing_layers={})

    assert decision.action == "reject"
    assert decision.target_layer == "constitution"


def test_soul_judge_expires_existing_overlay_when_signal_has_gone_stale():
    signal = SoulSignal(
        signal_id="sig_expire",
        source_memory_ids=["mem_6"],
        suggested_layer="adaptive_overlay",
        summary="之前的低刺激模式已经结束",
        confidence=0.78,
        evidence_ids=["ev_6"],
        metadata={"stale_overlay": True},
    )

    decision = judge_soul_signal(
        signal,
        existing_layers={
            "adaptive_overlay": [
                {
                    "summary": "最近减少鼓励式措辞",
                    "status": "active",
                }
            ]
        },
    )

    assert decision.action == "expire_existing_overlay"
    assert decision.target_layer == "adaptive_overlay"
