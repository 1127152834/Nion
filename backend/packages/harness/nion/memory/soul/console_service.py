from __future__ import annotations

from typing import Any

from nion.memory.soul.service import get_soul_layer_snapshot
from nion.memory_os.models import UserOverrideRecord
from nion.memory_os.repository import MemoryOSRepository

_DEFAULT_CORE_IDENTITY = "目前还没有稳定的核心人格设置。"
_DEFAULT_SPEECH_STYLE = "目前还没有稳定的说话方式设置。"
_DEFAULT_VALUES_AND_BOUNDARIES = "目前还没有稳定的价值观与边界设置。"
_DEFAULT_RELATIONSHIP_STANCE = "目前还没有稳定的关系基调设置。"
_VALUES_AND_BOUNDARIES_OVERRIDE_ID = "soul_core_main:values_and_boundaries"
_SOUL_FIELD_CONFIG = {
    "core_identity": {
        "memory_id": "soul_core_main",
        "canonical_key": "soul:layer:core:agent:main",
        "scope": "agent",
        "layer": "core",
    },
    "speech_style": {
        "memory_id": "agent_self_narrative_main",
        "canonical_key": "soul:layer:identity_narrative:agent:main",
        "scope": "agent",
        "layer": "identity_narrative",
    },
    "relationship_stance": {
        "memory_id": "soul_rel_user_default",
        "canonical_key": "soul:layer:relationship_stance:user:default",
        "scope": "user",
        "layer": "relationship_stance",
    },
}


def build_soul_settings_payload(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> dict[str, Any]:
    core = get_soul_layer_snapshot(repository, layer="core", now_z=now_z)
    identity = get_soul_layer_snapshot(repository, layer="identity_narrative", now_z=now_z)
    relationship = get_soul_layer_snapshot(repository, layer="relationship_stance", now_z=now_z)
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
    core_text = patch_soul_setting_value(
        repository,
        field="core_identity",
        value=core_identity,
        created_at=created_at,
        actor=actor,
    )["value"]
    speech_text = patch_soul_setting_value(
        repository,
        field="speech_style",
        value=speech_style,
        created_at=created_at,
        actor=actor,
    )["value"]
    values_text = patch_soul_setting_value(
        repository,
        field="values_and_boundaries",
        value=values_and_boundaries,
        created_at=created_at,
        actor=actor,
    )["value"]
    relationship_text = patch_soul_setting_value(
        repository,
        field="relationship_stance",
        value=relationship_stance,
        created_at=created_at,
        actor=actor,
    )["value"]
    return {
        "action": "apply",
        "core_identity": core_text,
        "speech_style": speech_text,
        "values_and_boundaries": values_text,
        "relationship_stance": relationship_text,
    }


def patch_soul_setting_value(
    repository: MemoryOSRepository,
    *,
    field: str,
    value: str,
    created_at: str,
    actor: str = "user:default",
) -> dict[str, str]:
    text = value.strip()
    if not text:
        raise ValueError("settings")

    if field == "values_and_boundaries":
        repository.save_user_override(
            UserOverrideRecord(
                override_id=_VALUES_AND_BOUNDARIES_OVERRIDE_ID,
                memory_id="soul_core_main",
                field_name="values_and_boundaries",
                value={"text": text},
                reason="Soul Settings patch",
                created_at=created_at,
                updated_at=created_at,
            )
        )
        return {"action": "patch", "field": field, "value": text}

    config = _SOUL_FIELD_CONFIG.get(field)
    if config is None:
        raise ValueError("settings")

    _update_record_summary(
        repository,
        config["memory_id"],
        text,
        created_at,
        actor,
    )
    _upsert_memory_node(
        repository,
        memory_id=config["memory_id"],
        canonical_key=config["canonical_key"],
        scope=config["scope"],
        layer=config["layer"],
        summary=text,
        created_at=created_at,
    )
    return {"action": "patch", "field": field, "value": text}


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


def _upsert_memory_node(
    repository: MemoryOSRepository,
    *,
    memory_id: str,
    canonical_key: str,
    scope: str,
    layer: str,
    summary: str,
    created_at: str,
) -> None:
    node = repository.get_memory_node(memory_id)
    repository.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": canonical_key,
            "owner_type": "agent",
            "scope": scope,
            "node_type": "soul_layer",
            "status": "active",
            "summary": summary,
            "created_at": node.created_at if node is not None else created_at,
            "updated_at": created_at,
            "metadata": {"layer": layer},
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
