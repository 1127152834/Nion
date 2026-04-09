from __future__ import annotations

import uuid
from typing import Any

from nion.memory.soul.service import derive_relationship_stance_snapshot, get_soul_layer_snapshot
from nion.memory_os.models import UserOverrideRecord
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

    values_override = _load_values_override(repository)
    return {
        "core_identity": _summary_or_default(core, _DEFAULT_CORE_IDENTITY),
        "speech_style": _summary_or_default(identity, _DEFAULT_SPEECH_STYLE),
        "values_and_boundaries": values_override or _summary_or_default(core, _DEFAULT_VALUES_AND_BOUNDARIES),
        "relationship_stance": _summary_or_default(
            relationship,
            _DEFAULT_RELATIONSHIP_STANCE,
        ),
        "has_active_overlay": overlay is not None,
        "adaptive_overlay_summary": overlay.summary if overlay is not None else None,
    }


def apply_soul_settings(
    repository: MemoryOSRepository,
    *,
    core_identity: str,
    speech_style: str,
    values_and_boundaries: str,
    relationship_stance: str,
    created_at: str,
    actor: str = "user:default",
) -> dict[str, Any]:
    core_text = core_identity.strip()
    speech_text = speech_style.strip()
    values_text = values_and_boundaries.strip()
    relationship_text = relationship_stance.strip()

    if not core_text or not speech_text or not values_text or not relationship_text:
        raise ValueError("settings")

    _update_record_summary(repository, "soul_core_main", core_text, created_at, actor)
    _update_record_summary(repository, "agent_self_narrative_main", speech_text, created_at, actor)
    _update_record_summary(repository, "soul_rel_user_default", relationship_text, created_at, actor)
    _ensure_memory_node(
        repository,
        memory_id="soul_core_main",
        canonical_key="soul:layer:core:agent:main",
        scope="agent",
        summary=core_text,
        created_at=created_at,
    )
    repository.save_user_override(
        UserOverrideRecord(
            override_id=f"soul_core_main:values:{uuid.uuid4().hex[:10]}",
            memory_id="soul_core_main",
            field_name="values_and_boundaries",
            value={"text": values_text},
            reason="Soul Settings apply",
            created_at=created_at,
            updated_at=created_at,
        )
    )
    return {
        "action": "apply",
        "core_identity": core_text,
        "speech_style": speech_text,
        "values_and_boundaries": values_text,
        "relationship_stance": relationship_text,
    }


def _summary_or_default(snapshot: Any | None, default_text: str) -> str:
    if snapshot is None:
        return default_text
    summary = str(getattr(snapshot, "summary", "")).strip()
    return summary or default_text


def _load_values_override(repository: MemoryOSRepository) -> str | None:
    overrides = repository.list_user_overrides(memory_id="soul_core_main")
    item = next((entry for entry in overrides if entry.field_name == "values_and_boundaries"), None)
    if item is None:
        return None
    text = str(item.value.get("text", "")).strip()
    return text or None


def _update_record_summary(
    repository: MemoryOSRepository,
    memory_id: str,
    summary: str,
    created_at: str,
    actor: str,
) -> None:
    record = _find_memory_record(repository, memory_id)
    if record is None:
        record = _build_default_record(memory_id=memory_id, summary=summary, created_at=created_at)
    record["summary"] = summary
    record["updated_at"] = created_at
    provenance = dict(record.get("provenance", {}))
    provenance["source_type"] = "user_override"
    provenance["last_edited_by"] = actor
    record["provenance"] = provenance
    repository.save_memory_record(record)


def _find_memory_record(repository: MemoryOSRepository, memory_id: str) -> dict[str, Any] | None:
    for domain in ("soul", "agent_self"):
        record = next(
            (
                row
                for row in repository.list_memory_records(domain=domain)
                if row["memory_id"] == memory_id
            ),
            None,
        )
        if record is not None:
            return record
    return None


def _ensure_memory_node(
    repository: MemoryOSRepository,
    *,
    memory_id: str,
    canonical_key: str,
    scope: str,
    summary: str,
    created_at: str,
) -> None:
    node = repository.get_memory_node(memory_id)
    if node is not None:
        return
    repository.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": canonical_key,
            "owner_type": "agent",
            "scope": scope,
            "node_type": "soul_layer",
            "status": "active",
            "summary": summary,
            "created_at": created_at,
            "updated_at": created_at,
            "metadata": {"layer": "core"},
        }
    )


def _build_default_record(
    *,
    memory_id: str,
    summary: str,
    created_at: str,
) -> dict[str, Any]:
    if memory_id == "agent_self_narrative_main":
        return {
            "memory_id": memory_id,
            "domain": "agent_self",
            "subtype": "identity_narrative",
            "owner_type": "agent",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": summary,
            "confidence": 0.9,
            "created_at": created_at,
            "updated_at": created_at,
            "provenance": {"source_type": "user_override"},
        }
    if memory_id == "soul_rel_user_default":
        return {
            "memory_id": memory_id,
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": summary,
            "confidence": 0.9,
            "created_at": created_at,
            "updated_at": created_at,
            "provenance": {"source_type": "user_override"},
        }
    return {
        "memory_id": memory_id,
        "domain": "soul",
        "subtype": "core",
        "owner_type": "system",
        "scope": "agent",
        "memory_type": "semantic",
        "subject_id": "agent:main",
        "status": "active",
        "summary": summary,
        "confidence": 1.0,
        "created_at": created_at,
        "updated_at": created_at,
        "provenance": {"source_type": "user_override"},
    }
