from __future__ import annotations

from typing import Any

from nion.memory.soul.service import derive_relationship_stance_snapshot, get_soul_layer_snapshot
from nion.memory_os.repository import MemoryOSRepository

_DEFAULT_CORE_IDENTITY = "目前还没有稳定的核心人格设置。"
_DEFAULT_SPEECH_STYLE = "目前还没有稳定的说话方式设置。"
_DEFAULT_VALUES_AND_BOUNDARIES = "目前还没有稳定的价值观与边界设置。"
_DEFAULT_RELATIONSHIP_STANCE = "目前还没有稳定的关系基调设置。"


def build_soul_settings_payload(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> dict[str, Any]:
    core = get_soul_layer_snapshot(repository, layer="core", now_z=now_z)
    identity = get_soul_layer_snapshot(repository, layer="identity_narrative", now_z=now_z)
    relationship = derive_relationship_stance_snapshot(repository, now_z=now_z)
    overlay = get_soul_layer_snapshot(repository, layer="adaptive_overlay", now_z=now_z)

    # The approved Settings contract exposes stable product-facing slots.
    # Until the backend stores dedicated speech/value fragments separately,
    # the stable core layer remains the source of values/boundaries.
    return {
        "core_identity": _summary_or_default(core, _DEFAULT_CORE_IDENTITY),
        "speech_style": _summary_or_default(identity, _DEFAULT_SPEECH_STYLE),
        "values_and_boundaries": _summary_or_default(core, _DEFAULT_VALUES_AND_BOUNDARIES),
        "relationship_stance": _summary_or_default(
            relationship,
            _DEFAULT_RELATIONSHIP_STANCE,
        ),
        "has_active_overlay": overlay is not None,
        "adaptive_overlay_summary": overlay.summary if overlay is not None else None,
    }


def _summary_or_default(snapshot: Any | None, default_text: str) -> str:
    if snapshot is None:
        return default_text
    summary = str(getattr(snapshot, "summary", "")).strip()
    return summary or default_text
