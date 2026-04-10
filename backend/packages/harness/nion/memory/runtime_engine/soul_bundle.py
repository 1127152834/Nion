from __future__ import annotations

from dataclasses import dataclass

from nion.memory.soul.service import (
    derive_relationship_stance_snapshot,
    get_soul_layer_snapshot,
)
from nion.memory_os.repository import MemoryOSRepository


@dataclass(frozen=True)
class RuntimeSoulBundle:
    core_identity: str | None
    speech_style: str | None
    values_and_boundaries: str | None
    relationship_stance: str | None
    adaptive_overlay: str | None


def build_runtime_soul_bundle(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> RuntimeSoulBundle:
    core = get_soul_layer_snapshot(repository, layer="core", now_z=now_z)
    identity = get_soul_layer_snapshot(
        repository,
        layer="identity_narrative",
        now_z=now_z,
    )
    relationship = derive_relationship_stance_snapshot(repository, now_z=now_z)
    overlay = get_soul_layer_snapshot(
        repository,
        layer="adaptive_overlay",
        now_z=now_z,
    )

    return RuntimeSoulBundle(
        core_identity=_summary_or_none(core),
        speech_style=_summary_or_none(identity),
        values_and_boundaries=_load_values_override(repository)
        or _summary_or_none(core),
        relationship_stance=_summary_or_none(relationship),
        adaptive_overlay=overlay.summary if overlay is not None else None,
    )


def _summary_or_none(snapshot: object | None) -> str | None:
    if snapshot is None:
        return None
    summary = str(getattr(snapshot, "summary", "")).strip()
    return summary or None


def _load_values_override(repository: MemoryOSRepository) -> str | None:
    overrides = repository.list_user_overrides(memory_id="soul_core_main")
    item = next(
        (
            entry
            for entry in overrides
            if entry.field_name == "values_and_boundaries"
        ),
        None,
    )
    if item is None:
        return None
    text = str(item.value.get("text", "")).strip()
    return text or None
