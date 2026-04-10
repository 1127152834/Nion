from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from nion.memory.soul.models import SoulJudgeDecision, SoulSignal


def judge_soul_signal(
    signal: SoulSignal,
    existing_layers: Mapping[str, Sequence[Mapping[str, Any]]],
) -> SoulJudgeDecision:
    active_overlays = [
        overlay
        for overlay in existing_layers.get("adaptive_overlay", [])
        if str(overlay.get("status", "active")).lower() == "active"
    ]

    if signal.suggested_layer == "constitution":
        return SoulJudgeDecision(
            action="reject",
            target_layer="constitution",
            rationale="Constitution cannot be mutated directly from a soul signal.",
            metadata={"signal_id": signal.signal_id},
        )

    if bool(signal.metadata.get("stale_overlay")) and active_overlays:
        return SoulJudgeDecision(
            action="expire_existing_overlay",
            target_layer="adaptive_overlay",
            rationale="The signal indicates the active overlay has gone stale and should expire.",
            metadata={"signal_id": signal.signal_id},
        )

    if signal.suggested_layer == "identity_narrative" and (
        str(signal.metadata.get("stability", "")).lower() == "stable" or signal.confidence >= 0.9
    ):
        return SoulJudgeDecision(
            action="promote_to_identity_narrative",
            target_layer="identity_narrative",
            rationale="Stable, high-confidence self-story should be promoted to identity narrative.",
            metadata={"signal_id": signal.signal_id},
        )

    if signal.suggested_layer == "adaptive_overlay" and active_overlays:
        return SoulJudgeDecision(
            action="extend_overlay",
            target_layer="adaptive_overlay",
            rationale="An active overlay already exists, so the current signal extends it.",
            metadata={"signal_id": signal.signal_id},
        )

    return SoulJudgeDecision(
        action="accept_overlay",
        target_layer="adaptive_overlay" if signal.suggested_layer == "adaptive_overlay" else signal.suggested_layer,
        rationale="The signal is accepted as a temporary adaptive overlay.",
        metadata={"signal_id": signal.signal_id},
    )
