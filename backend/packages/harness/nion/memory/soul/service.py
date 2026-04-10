from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from nion.memory_os.repository import MemoryOSRepository

_SOUL_LAYER_SPECS = {
    "core": {
        "memory_id": "soul_core_main",
        "canonical_key": "soul:layer:core:agent:main",
        "record_domain": "soul",
        "record_subtype": "core",
        "scope": "agent",
        "freshness_window": None,
    },
    "relationship_stance": {
        "memory_id": "soul_rel_user_default",
        "canonical_key": "soul:layer:relationship_stance:user:default",
        "record_domain": "soul",
        "record_subtype": "relationship_soul",
        "scope": "user",
        "freshness_window": timedelta(days=7),
    },
    "identity_narrative": {
        "memory_id": "agent_self_narrative_main",
        "canonical_key": "soul:layer:identity_narrative:agent:main",
        "record_domain": "agent_self",
        "record_subtype": "identity_narrative",
        "scope": "agent",
        "freshness_window": timedelta(days=7),
    },
    "adaptive_overlay": {
        "memory_id": "soul_overlay_active_main",
        "canonical_key": "soul:layer:adaptive_overlay:agent:main",
        "record_domain": "soul",
        "record_subtype": "adaptive_overlay",
        "scope": "agent",
        "freshness_window": timedelta(days=3),
    },
}

_RELATIONSHIP_CANONICAL_KEY = "relationship:user:default:stance"


@dataclass(frozen=True)
class SoulLayerSnapshot:
    layer: str
    memory_id: str
    summary: str
    created_at: str | None
    updated_at: str
    payload: dict[str, Any]
    source: str


def get_soul_layer_snapshot(
    repository: MemoryOSRepository,
    *,
    layer: str,
    now_z: str,
) -> SoulLayerSnapshot | None:
    spec = _SOUL_LAYER_SPECS[layer]
    now = _parse_z_datetime(now_z)
    canonical = repository.get_memory_node(spec["memory_id"])
    if canonical is None:
        canonical = repository.get_memory_node_by_canonical_key(spec["canonical_key"])
    if canonical is not None and canonical.status == "active" and _is_fresh(
        updated_at=canonical.updated_at,
        freshness_window=spec["freshness_window"],
        now=now,
    ):
        revisions = repository.list_memory_revisions(memory_id=canonical.memory_id)
        payload = dict(revisions[0].payload) if revisions else {}
        return SoulLayerSnapshot(
            layer=layer,
            memory_id=canonical.memory_id,
            summary=canonical.summary,
            created_at=canonical.created_at,
            updated_at=canonical.updated_at,
            payload=payload,
            source="canonical",
        )

    for row in repository.list_memory_records(domain=spec["record_domain"], status="active"):
        if row["subtype"] != spec["record_subtype"]:
            continue
        if str(row["memory_id"]) != spec["memory_id"]:
            continue
        updated_at = str(row.get("updated_at") or row.get("created_at") or "")
        if not updated_at:
            continue
        if not _is_fresh(
            updated_at=updated_at,
            freshness_window=spec["freshness_window"],
            now=now,
        ):
            return None
        return SoulLayerSnapshot(
            layer=layer,
            memory_id=str(row["memory_id"]),
            summary=str(row["summary"]),
            created_at=str(row.get("created_at") or updated_at),
            updated_at=updated_at,
            payload={},
            source="record",
        )
    return None


def write_canonical_soul_layer(
    repository: MemoryOSRepository,
    *,
    layer: str,
    summary: str,
    created_at: str,
    payload: dict[str, Any] | None = None,
    status: str = "active",
) -> dict[str, Any]:
    spec = _SOUL_LAYER_SPECS[layer]
    canonical_payload = {"layer": layer, **dict(payload or {})}
    existing = repository.get_memory_node(spec["memory_id"])
    created_value = existing.created_at if existing is not None else created_at
    repository.save_memory_node(
        {
            "memory_id": spec["memory_id"],
            "canonical_key": spec["canonical_key"],
            "owner_type": "agent",
            "scope": spec["scope"],
            "node_type": "soul_layer",
            "status": status,
            "summary": summary,
            "created_at": created_value,
            "updated_at": created_at,
            "metadata": canonical_payload,
        }
    )
    if status == "active":
        repository.append_memory_revision(
            memory_id=spec["memory_id"],
            summary=summary,
            evidence_ref=None,
            created_at=created_at,
            payload=canonical_payload,
        )
    return {
        "memory_id": spec["memory_id"],
        "canonical_key": spec["canonical_key"],
        "summary": summary,
        "payload": canonical_payload,
    }


def archive_canonical_soul_layer(
    repository: MemoryOSRepository,
    *,
    layer: str,
    updated_at: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    spec = _SOUL_LAYER_SPECS[layer]
    node = repository.get_memory_node(spec["memory_id"])
    if node is None:
        node = repository.get_memory_node_by_canonical_key(spec["canonical_key"])
    if node is None:
        return None
    merged_metadata = {**dict(node.metadata), **dict(metadata or {})}
    repository.save_memory_node(
        {
            "memory_id": node.memory_id,
            "canonical_key": node.canonical_key,
            "owner_type": node.owner_type,
            "scope": node.scope,
            "node_type": node.node_type,
            "status": "archived",
            "summary": node.summary,
            "created_at": node.created_at,
            "updated_at": updated_at,
            "metadata": merged_metadata,
        }
    )
    return {
        "memory_id": node.memory_id,
        "canonical_key": node.canonical_key,
        "summary": node.summary,
        "payload": merged_metadata,
    }


def derive_relationship_stance_snapshot(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> SoulLayerSnapshot | None:
    return get_soul_layer_snapshot(
        repository,
        layer="relationship_stance",
        now_z=now_z,
    )


def derive_relationship_signal_snapshot(
    repository: MemoryOSRepository,
    *,
    now_z: str,
) -> SoulLayerSnapshot | None:
    now = _parse_z_datetime(now_z)
    node = repository.get_memory_node_by_canonical_key(_RELATIONSHIP_CANONICAL_KEY)
    if node is not None and node.status == "active" and _is_fresh(
        updated_at=node.updated_at,
        freshness_window=_SOUL_LAYER_SPECS["relationship_stance"]["freshness_window"],
        now=now,
    ):
        revisions = repository.list_memory_revisions(memory_id=node.memory_id)
        payload = dict(revisions[0].payload) if revisions else dict(node.metadata)
        summary = str(payload.get("stance_summary") or node.summary).strip()
        if summary:
            return SoulLayerSnapshot(
                layer="relationship_stance",
                memory_id=node.memory_id,
                summary=summary,
                created_at=node.created_at,
                updated_at=node.updated_at,
                payload=payload,
                source="relationship_canonical",
            )

    summaries: list[str] = []
    source_ids: list[str] = []
    for row in repository.list_memory_records(domain="relationship", status="active"):
        summary = str(row.get("summary") or "").strip()
        if not summary:
            continue
        summaries.append(summary)
        source_ids.append(str(row["memory_id"]))
        if len(summaries) == 2:
            break
    if summaries:
        summary = "；".join(summaries)
        return SoulLayerSnapshot(
            layer="relationship_stance",
            memory_id="relationship_soul_user_default",
            summary=summary,
            created_at=None,
            updated_at=now_z,
            payload={"layer": "relationship_stance", "source_relationship_ids": source_ids},
            source="relationship_records",
        )

    for row in repository.list_memory_records(domain="soul", status="active"):
        if row["subtype"] != "relationship_soul":
            continue
        if str(row["memory_id"]) != "relationship_soul_user_default":
            continue
        updated_at = str(row.get("updated_at") or row.get("created_at") or "")
        if not updated_at:
            continue
        if not _is_fresh(
            updated_at=updated_at,
            freshness_window=_SOUL_LAYER_SPECS["relationship_stance"]["freshness_window"],
            now=now,
        ):
            return None
        return SoulLayerSnapshot(
            layer="relationship_stance",
            memory_id=str(row["memory_id"]),
            summary=str(row["summary"]),
            created_at=str(row.get("created_at") or updated_at),
            updated_at=updated_at,
            payload={},
            source="relationship_soul_record",
        )
    return None


def write_canonical_relationship_memory(
    repository: MemoryOSRepository,
    *,
    summary: str,
    created_at: str,
    source_relationship_ids: list[str] | None = None,
) -> dict[str, Any]:
    memory_id = "relationship_user_default_main"
    payload = {
        "stance_summary": summary,
        "source_relationship_ids": list(source_relationship_ids or []),
        "layer": "relationship_stance",
    }
    existing = repository.get_memory_node(memory_id)
    created_value = existing.created_at if existing is not None else created_at
    repository.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": _RELATIONSHIP_CANONICAL_KEY,
            "owner_type": "agent",
            "scope": "user",
            "node_type": "relationship_memory",
            "status": "active",
            "summary": summary,
            "created_at": created_value,
            "updated_at": created_at,
            "metadata": payload,
        }
    )
    repository.append_memory_revision(
        memory_id=memory_id,
        summary=summary,
        evidence_ref=None,
        created_at=created_at,
        payload=payload,
    )
    return {
        "memory_id": memory_id,
        "canonical_key": _RELATIONSHIP_CANONICAL_KEY,
        "summary": summary,
        "payload": payload,
    }


def _is_fresh(*, updated_at: str, freshness_window: timedelta | None, now: datetime) -> bool:
    if freshness_window is None:
        return True
    return now - _parse_z_datetime(updated_at) <= freshness_window


def _parse_z_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
