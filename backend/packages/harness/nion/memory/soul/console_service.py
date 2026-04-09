from __future__ import annotations

import uuid
from typing import Any

from nion.memory.soul.service import derive_relationship_stance_snapshot, get_soul_layer_snapshot
from nion.memory_os.models import UserOverrideRecord
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_events import record_soul_event
from nion.memory_os.soul_governance import list_soul_events


_LAYER_TO_MEMORY_ID = {
    "constitution": "soul_core_main",
    "identity_narrative": "agent_self_narrative_main",
    "relationship_stance": "soul_rel_user_default",
    "adaptive_overlay": "soul_overlay_active_main",
}


def build_soul_console_payload(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> dict[str, Any]:
    constitution = get_soul_layer_snapshot(repository, layer="core", now_z=now_z)
    identity = get_soul_layer_snapshot(repository, layer="identity_narrative", now_z=now_z)
    relationship = derive_relationship_stance_snapshot(repository, now_z=now_z)
    overlay = get_soul_layer_snapshot(repository, layer="adaptive_overlay", now_z=now_z)

    soul_events = list_soul_events(repository)
    layers = [
        _build_layer_payload(
            repository,
            layer_id="constitution",
            label="Constitution",
            snapshot=constitution,
            default_reason="长期稳定证据形成的默认基线，不因单次会话快速重写。",
            editable=False,
        ),
        _build_layer_payload(
            repository,
            layer_id="identity_narrative",
            label="Identity Narrative",
            snapshot=identity,
            default_reason="近期成长信号先沉淀为叙事，再决定是否晋升为长期自我叙事。",
            editable=False,
        ),
        _build_layer_payload(
            repository,
            layer_id="relationship_stance",
            label="Relationship Stance",
            snapshot=relationship,
            default_reason="relationship stance 由长期 relationship 证据与最近稳定信号共同推导。",
            editable=True,
            action_label="编辑 relationship stance",
        ),
        _build_layer_payload(
            repository,
            layer_id="adaptive_overlay",
            label="Adaptive Overlay",
            snapshot=overlay,
            default_reason="这是当前对外表达的活动层，会根据近期上下文快速调整。",
            editable=True,
            action_label="编辑 adaptive overlay",
        ),
    ]
    latest_event = soul_events[0] if soul_events else None
    return {
        "layers": layers,
        "currentRevisionReason": latest_event["summary"] if latest_event else "当前 revision 由最近 soul governance 事件解释。",
        "currentRevisionTime": latest_event["created_at"] if latest_event else now_z,
    }


def update_soul_layer_summary(
    repository: MemoryOSRepository,
    *,
    layer: str,
    summary: str,
    created_at: str,
    actor: str = "user:default",
) -> dict[str, Any]:
    normalized_summary = summary.strip()
    if not normalized_summary:
        raise ValueError("summary")
    if layer not in {"relationship_stance", "adaptive_overlay"}:
        raise ValueError("layer")

    memory_id = _LAYER_TO_MEMORY_ID[layer]
    record = _find_memory_record(repository, memory_id)
    record["summary"] = normalized_summary
    record["updated_at"] = created_at
    provenance = dict(record.get("provenance", {}))
    provenance["source_type"] = "user_override"
    provenance["last_edited_by"] = actor
    record["provenance"] = provenance
    repository.save_memory_record(record)

    node = repository.get_memory_node(memory_id)
    if node is not None:
        metadata = dict(node.metadata)
        metadata["user_edited"] = True
        repository.save_memory_node(
            {
                "memory_id": node.memory_id,
                "canonical_key": node.canonical_key,
                "owner_type": node.owner_type,
                "scope": node.scope,
                "node_type": node.node_type,
                "status": node.status,
                "summary": normalized_summary,
                "created_at": node.created_at,
                "updated_at": created_at,
                "metadata": metadata,
            }
        )
        repository.append_memory_revision(
            memory_id=node.memory_id,
            summary=normalized_summary,
            evidence_ref=None,
            created_at=created_at,
            payload={**metadata, "layer": layer, "governance_action": "manual_edit"},
        )

    repository.save_user_override(
        UserOverrideRecord(
            override_id=f"{memory_id}:override:{uuid.uuid4().hex[:10]}",
            memory_id=memory_id,
            field_name="summary",
            value={"summary": normalized_summary, "layer": layer},
            reason="Soul Console manual edit",
            created_at=created_at,
            updated_at=created_at,
        )
    )
    record_soul_event(
        repository,
        event_type=f"{layer}_edited",
        memory_id=memory_id,
        summary=f"{layer} 已被人工改写：{normalized_summary}",
        created_at=created_at,
        actor=actor,
        source="soul_console",
        metadata={"layer": layer, "governance_action": "manual_edit"},
    )
    return {"memory_id": memory_id, "action": "edit", "layer": layer, "summary": normalized_summary}


def freeze_soul_layer_auto_evolution(
    repository: MemoryOSRepository,
    *,
    layer: str,
    created_at: str,
    actor: str = "user:default",
) -> dict[str, Any]:
    if layer not in _LAYER_TO_MEMORY_ID:
        raise ValueError("layer")
    memory_id = _LAYER_TO_MEMORY_ID[layer]
    node = repository.get_memory_node(memory_id)
    if node is not None:
        metadata = dict(node.metadata)
        metadata["auto_evolution_frozen"] = True
        metadata["auto_evolution_frozen_at"] = created_at
        repository.save_memory_node(
            {
                "memory_id": node.memory_id,
                "canonical_key": node.canonical_key,
                "owner_type": node.owner_type,
                "scope": node.scope,
                "node_type": node.node_type,
                "status": node.status,
                "summary": node.summary,
                "created_at": node.created_at,
                "updated_at": created_at,
                "metadata": metadata,
            }
        )
    repository.save_user_override(
        UserOverrideRecord(
            override_id=f"{memory_id}:override:{uuid.uuid4().hex[:10]}",
            memory_id=memory_id,
            field_name="auto_evolution_frozen",
            value={"value": True, "layer": layer},
            reason="Soul Console freeze auto evolution",
            created_at=created_at,
            updated_at=created_at,
        )
    )
    record_soul_event(
        repository,
        event_type=f"{layer}_frozen",
        memory_id=memory_id,
        summary=f"{layer} 已冻结某层不再自动演化。",
        created_at=created_at,
        actor=actor,
        source="soul_console",
        metadata={"layer": layer, "governance_action": "freeze_auto_evolution"},
    )
    return {"memory_id": memory_id, "action": "freeze_auto_evolution", "layer": layer}


def _build_layer_payload(
    repository: MemoryOSRepository,
    *,
    layer_id: str,
    label: str,
    snapshot: Any | None,
    default_reason: str,
    editable: bool,
    action_label: str | None = None,
) -> dict[str, Any]:
    memory_id = _LAYER_TO_MEMORY_ID[layer_id]
    revisions = repository.list_memory_revisions(memory_id=memory_id)
    latest_revision = revisions[0] if revisions else None
    overrides = repository.list_user_overrides(memory_id=memory_id)
    frozen_override = next(
        (item for item in overrides if item.field_name == "auto_evolution_frozen"),
        None,
    )
    reason = default_reason
    if overrides:
        reason = overrides[0].reason or default_reason
    elif latest_revision and latest_revision.payload.get("governance_action"):
        reason = f"最近治理动作：{latest_revision.payload['governance_action']}"

    return {
        "id": layer_id,
        "label": label,
        "summary": snapshot.summary if snapshot is not None else f"当前还没有稳定的 {label.lower()}。",
        "reason": reason,
        "time": snapshot.updated_at if snapshot is not None else None,
        "revisionLabel": f"r{latest_revision.revision_number}" if latest_revision else "未绑定 revision",
        "revisionId": latest_revision.revision_id if latest_revision else None,
        "memoryId": memory_id,
        "evidenceRef": latest_revision.evidence_ref if latest_revision else None,
        "editable": editable,
        "actionLabel": action_label,
        "isFrozen": frozen_override is not None,
    }


def _find_memory_record(repository: MemoryOSRepository, memory_id: str) -> dict[str, Any]:
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
    raise KeyError(memory_id)
