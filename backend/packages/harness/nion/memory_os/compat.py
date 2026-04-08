from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from nion.config.paths import get_paths

from .clock import utcnow_z
from .import_legacy import import_legacy_memory_payload
from .repository import MemoryOSRepository
from .soul_artifacts import MemoryOSSoulArtifactStore
from .soul_artifacts import import_legacy_soul_file


def get_memory_os_repository() -> MemoryOSRepository:
    return MemoryOSRepository(get_paths().memory_os_index_db_file)


def build_legacy_memory_view(repository: MemoryOSRepository | None = None) -> dict[str, Any]:
    repo = repository or get_memory_os_repository()
    records = repo.list_memory_records(status="active")
    canonical_items = _list_canonical_projection_items(repo)

    record_contexts = {
        str(row["subtype"]): row
        for row in records
        if row["domain"] == "user_model" and row["subtype"] in _CONTEXT_SUBTYPES
    }
    canonical_contexts = {
        str(item["subtype"]): item
        for item in canonical_items
        if item["domain"] == "user_model" and item["subtype"] in _CONTEXT_SUBTYPES
    }

    work = canonical_contexts.get("workContext") or record_contexts.get("workContext")
    personal = canonical_contexts.get("personalContext") or record_contexts.get("personalContext")
    top_of_mind = canonical_contexts.get("topOfMind") or record_contexts.get("topOfMind")
    recent = canonical_contexts.get("recentMonths") or record_contexts.get("recentMonths")
    earlier = canonical_contexts.get("earlierContext") or record_contexts.get("earlierContext")
    long_term = canonical_contexts.get("longTermBackground") or record_contexts.get("longTermBackground")

    fact_map: dict[str, dict[str, Any]] = {}
    for item in canonical_items:
        if item["domain"] != "user_model" or item["status"] != "active" or item["subtype"] in _CONTEXT_SUBTYPES:
            continue
        fact_map[str(item["memory_id"])] = {
            "id": str(item["memory_id"]),
            "content": str(item["summary"]),
            "category": str(item["category"]),
            "confidence": float(item["confidence"]),
            "createdAt": str(item["created_at"]),
            "source": str(item["source"]),
        }
    for row in records:
        if row["domain"] != "user_model":
            continue
        fact_map.setdefault(
            str(row["memory_id"]),
            {
                "id": str(row["memory_id"]),
                "content": str(row["summary"]),
                "category": str(row["subtype"]),
                "confidence": float(row["confidence"]),
                "createdAt": str(row["created_at"]),
                "source": str((row.get("provenance") or {}).get("source_ref") or "memory_os"),
            },
        )
    facts = list(fact_map.values())

    last_updated = max(
        (
            str(item["updated_at"])
            for item in [*records, *canonical_items]
        ),
        default="",
    )

    return {
        "version": "2.0",
        "lastUpdated": last_updated,
        "user": {
            "workContext": _context_section(work),
            "personalContext": _context_section(personal),
            "topOfMind": _context_section(top_of_mind),
        },
        "history": {
            "recentMonths": _context_section(recent),
            "earlierContext": _context_section(earlier),
            "longTermBackground": _context_section(long_term),
        },
        "facts": facts,
    }


def import_legacy_memory_into_memory_os(payload: dict[str, Any]) -> dict[str, Any]:
    repo = get_memory_os_repository()
    import_legacy_memory_payload(repo, payload)
    return build_legacy_memory_view(repo)


def create_memory_os_fact(
    *,
    content: str,
    category: str = "context",
    confidence: float = 0.5,
    source: str = "manual",
    provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized_content = content.strip()
    if not normalized_content:
        raise ValueError("content")

    repo = get_memory_os_repository()
    now = utcnow_z()
    fact_id = _build_fact_id(repo)
    repo.save_memory_record(
        {
            "memory_id": fact_id,
            "domain": "user_model",
            "subtype": (category or "context").strip() or "context",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": normalized_content,
            "confidence": confidence,
            "created_at": now,
            "updated_at": now,
            "provenance": {
                "source_type": "memory_os_fact",
                "source_ref": source,
                **(provenance or {}),
            },
        }
    )
    _upsert_canonical_node(
        repo,
        memory_id=fact_id,
        canonical_key=f"user_model:fact:{fact_id}",
        summary=normalized_content,
        node_type="user_model_fact",
        status="active",
        created_at=now,
        updated_at=now,
        metadata={
            "domain": "user_model",
            "subtype": (category or "context").strip() or "context",
            "category": (category or "context").strip() or "context",
            "kind": "fact",
            "confidence": confidence,
            "source": source,
            "created_at": now,
        },
    )
    _append_canonical_revision(
        repo,
        memory_id=fact_id,
        summary=normalized_content,
        created_at=now,
        payload={
            "domain": "user_model",
            "subtype": (category or "context").strip() or "context",
            "category": (category or "context").strip() or "context",
            "kind": "fact",
            "confidence": confidence,
            "source": source,
        },
    )
    return build_legacy_memory_view(repo)


def update_memory_os_fact(
    *,
    fact_id: str,
    content: str | None = None,
    category: str | None = None,
    confidence: float | None = None,
) -> dict[str, Any]:
    repo = get_memory_os_repository()
    record = next(
        (
            row
            for row in repo.list_memory_records(domain="user_model", status="active")
            if row["memory_id"] == fact_id
        ),
        None,
    )
    if record is None:
        raise KeyError(fact_id)

    updated = dict(record)
    if content is not None:
        normalized_content = content.strip()
        if not normalized_content:
            raise ValueError("content")
        updated["summary"] = normalized_content
    if category is not None:
        updated["subtype"] = category.strip() or updated["subtype"]
    if confidence is not None:
        updated["confidence"] = confidence
    updated["updated_at"] = utcnow_z()
    repo.save_memory_record(updated)
    node = repo.get_memory_node(fact_id)
    if node is not None:
        metadata = dict(node.metadata)
        if category is not None:
            metadata["subtype"] = updated["subtype"]
            metadata["category"] = updated["subtype"]
        if confidence is not None:
            metadata["confidence"] = confidence
        _upsert_canonical_node(
            repo,
            memory_id=fact_id,
            canonical_key=node.canonical_key,
            summary=str(updated["summary"]),
            node_type=node.node_type,
            status=str(node.status),
            created_at=str(node.created_at),
            updated_at=str(updated["updated_at"]),
            metadata=metadata,
        )
        _append_canonical_revision(
            repo,
            memory_id=fact_id,
            summary=str(updated["summary"]),
            created_at=str(updated["updated_at"]),
            payload={
                "domain": metadata.get("domain", "user_model"),
                "subtype": metadata.get("subtype", updated["subtype"]),
                "category": metadata.get("category", updated["subtype"]),
                "kind": metadata.get("kind", "fact"),
                "confidence": metadata.get("confidence", updated["confidence"]),
                "source": metadata.get("source", "memory_os"),
            },
        )
    return build_legacy_memory_view(repo)


def delete_memory_os_fact(fact_id: str) -> dict[str, Any]:
    repo = get_memory_os_repository()
    record = next(
        (
            row
            for row in repo.list_memory_records(domain="user_model", status="active")
            if row["memory_id"] == fact_id
        ),
        None,
    )
    if record is None:
        raise KeyError(fact_id)
    repo.update_memory_status(fact_id, "invalidated", updated_at=utcnow_z())
    _update_canonical_node_status(repo, fact_id, "invalidated", updated_at=utcnow_z())
    return build_legacy_memory_view(repo)


def clear_memory_os_memory() -> dict[str, Any]:
    repo = get_memory_os_repository()
    for row in repo.list_memory_records(status="active"):
        if row["domain"] == "soul":
            continue
        repo.update_memory_status(str(row["memory_id"]), "invalidated", updated_at=utcnow_z())
    for item in _list_canonical_projection_items(repo):
        if item["domain"] == "soul":
            continue
        _update_canonical_node_status(repo, str(item["memory_id"]), "invalidated", updated_at=utcnow_z())
    return build_legacy_memory_view(repo)


def get_memory_os_config() -> dict[str, Any]:
    return {
        "enabled": True,
        "storage_path": str(get_paths().memory_os_index_db_file),
        "debounce_seconds": 0,
        "max_facts": 1000,
        "fact_confidence_threshold": 0.0,
        "injection_enabled": True,
        "max_injection_tokens": 2000,
    }


def import_legacy_memory_file_if_present(repository: MemoryOSRepository | None = None) -> dict[str, int]:
    repo = repository or get_memory_os_repository()
    legacy_path = get_paths().memory_file
    if not legacy_path.exists():
        return {"records_created": 0}
    payload = _read_legacy_memory_payload(legacy_path)
    if payload is None:
        return {"records_created": 0}
    return import_legacy_memory_payload(repo, payload)


def finalize_legacy_cutover(repository: MemoryOSRepository | None = None) -> dict[str, int]:
    repo = repository or get_memory_os_repository()
    imported_memory = 0
    imported_soul = 0

    if not repo.list_memory_records():
        imported_memory = import_legacy_memory_file_if_present(repo)["records_created"]

    has_soul_runtime = any(
        row["domain"] == "soul"
        for row in repo.list_memory_records()
    )
    legacy_soul_path = get_paths().base_dir / "SOUL.md"
    if not has_soul_runtime:
        if legacy_soul_path.exists():
            import_legacy_soul_file(
                repository=repo,
                soul_path=legacy_soul_path,
                created_at=utcnow_z(),
            )
        else:
            MemoryOSSoulArtifactStore(
                repository=repo,
                base_dir=get_paths().base_dir,
            ).write_core_soul(
                body=(
                    "# Core Soul\n\n"
                    "## Identity\n"
                    "长期陪伴、克制稳定、结论先行、以用户长期价值为先。\n"
                ),
                created_at=utcnow_z(),
            )
            record = next(
                row
                for row in repo.list_memory_records(domain="soul")
                if row["memory_id"] == "soul_core_main"
            )
            repaired = dict(record)
            repaired["provenance"] = {
                **dict(repaired.get("provenance", {})),
                "initialized": False,
            }
            repo.save_memory_record(repaired)
        imported_soul = 1
    else:
        for row in repo.list_memory_records(domain="soul"):
            if row["memory_id"] == "soul_core_main" and row["status"] != "active":
                repaired = dict(row)
                repaired["status"] = "active"
                repaired["updated_at"] = utcnow_z()
                repo.save_memory_record(repaired)
                break

    return {
        "memory_records_imported": imported_memory,
        "soul_records_imported": imported_soul,
    }


def _context_section(record: dict[str, Any] | None) -> dict[str, str]:
    if record is None:
        return {"summary": "", "updatedAt": ""}
    return {
        "summary": str(record["summary"]),
        "updatedAt": str(record["updated_at"]),
    }


def _read_legacy_memory_payload(path: Path) -> dict[str, Any] | None:
    try:
        import json

        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def _build_fact_id(repository: MemoryOSRepository) -> str:
    existing = {
        str(row["memory_id"])
        for row in repository.list_memory_records(domain="user_model")
    }
    existing.update(
        str(item["memory_id"])
        for item in _list_canonical_projection_items(repository)
        if item["domain"] == "user_model"
    )
    index = 1
    while True:
        candidate = f"fact_{index}"
        if candidate not in existing:
            return candidate
        index += 1


def list_legacy_growth_view(repository: MemoryOSRepository | None = None) -> dict[str, list[dict[str, Any]]]:
    repo = repository or get_memory_os_repository()
    records = repo.list_memory_records()
    canonical_items = _list_canonical_projection_items(repo)
    return {
        "learning": _merge_growth_items(
            canonical_items=canonical_items,
            records=records,
            domain="learning",
        ),
        "procedures": _merge_growth_items(
            canonical_items=canonical_items,
            records=records,
            domain="procedure",
        ),
        "soul_proposals": _merge_growth_items(
            canonical_items=canonical_items,
            records=records,
            domain="soul",
            subtype="proposal",
        ),
    }


def list_legacy_user_model_items(repository: MemoryOSRepository | None = None) -> list[dict[str, Any]]:
    repo = repository or get_memory_os_repository()
    records = repo.list_memory_records(domain="user_model")
    canonical_items = _list_canonical_projection_items(repo)
    merged = _merge_growth_items(
        canonical_items=canonical_items,
        records=records,
        domain="user_model",
    )
    items = [
        item
        for item in merged
        if item["status"] in {"active", "archived", "invalidated", "candidate"}
    ]
    return sorted(
        items,
        key=lambda item: (
            0 if item["subtype"] in _CONTEXT_SUBTYPES else 1,
            _CONTEXT_ORDER.get(item["subtype"], 99),
            str(item["memory_id"]),
        ),
    )


def update_legacy_growth_item_status(
    *,
    memory_id: str,
    status: str,
    expected_domain: str | None = None,
    repository: MemoryOSRepository | None = None,
) -> dict[str, Any]:
    repo = repository or get_memory_os_repository()
    updated_at = utcnow_z()
    record = _find_record_by_id(repo, memory_id, domain=expected_domain)
    if record is not None:
        repo.update_memory_status(memory_id, status, updated_at=updated_at)

    node = repo.get_memory_node(memory_id)
    if node is not None:
        metadata_domain = str(node.metadata.get("domain") or _domain_from_canonical_key(node.canonical_key) or "")
        if expected_domain is None or metadata_domain == expected_domain:
            _update_canonical_node_status(repo, memory_id, status, updated_at=updated_at)
        else:
            node = None

    if record is None and node is None:
        raise KeyError(memory_id)

    return {"memory_id": memory_id, "status": status, "updated_at": updated_at}


def correct_legacy_user_model_item(
    *,
    memory_id: str,
    summary: str,
    repository: MemoryOSRepository | None = None,
) -> dict[str, Any]:
    normalized_summary = summary.strip()
    if not normalized_summary:
        raise ValueError("summary")

    repo = repository or get_memory_os_repository()
    updated_at = utcnow_z()
    record = _find_record_by_id(repo, memory_id, domain="user_model")
    if record is not None:
        corrected = dict(record)
        corrected["summary"] = normalized_summary
        corrected["updated_at"] = updated_at
        repo.save_memory_record(corrected)

    node = repo.get_memory_node(memory_id)
    if node is not None:
        metadata_domain = str(node.metadata.get("domain") or _domain_from_canonical_key(node.canonical_key) or "")
        if metadata_domain != "user_model":
            node = None
        else:
            _upsert_canonical_node(
                repo,
                memory_id=node.memory_id,
                canonical_key=node.canonical_key,
                summary=normalized_summary,
                node_type=node.node_type,
                status=str(node.status),
                created_at=str(node.created_at),
                updated_at=updated_at,
                metadata=dict(node.metadata),
            )
            metadata = dict(node.metadata)
            _append_canonical_revision(
                repo,
                memory_id=node.memory_id,
                summary=normalized_summary,
                created_at=updated_at,
                payload={
                    "domain": metadata.get("domain", "user_model"),
                    "subtype": metadata.get("subtype", "context"),
                    "category": metadata.get("category", metadata.get("subtype", "context")),
                    "kind": metadata.get("kind", "fact"),
                    "confidence": metadata.get("confidence", 0.8),
                    "source": metadata.get("source", "memory_os"),
                },
            )

    if record is None and node is None:
        raise KeyError(memory_id)

    return _build_growth_item_from_memory_id(repo, memory_id, domain="user_model")


_CONTEXT_SUBTYPES = {
    "workContext",
    "personalContext",
    "topOfMind",
    "recentMonths",
    "earlierContext",
    "longTermBackground",
}

_CONTEXT_ORDER = {
    "workContext": 0,
    "personalContext": 1,
    "topOfMind": 2,
    "recentMonths": 3,
    "earlierContext": 4,
    "longTermBackground": 5,
}


def _find_record_by_id(
    repository: MemoryOSRepository,
    memory_id: str,
    *,
    domain: str | None = None,
) -> dict[str, Any] | None:
    for row in repository.list_memory_records(domain=domain):
        if row["memory_id"] == memory_id:
            return row
    return None


def _list_canonical_projection_items(repository: MemoryOSRepository) -> list[dict[str, Any]]:
    revisions = _latest_revision_map(repository)
    with repository._connect() as conn:
        rows = conn.execute(
            """
            SELECT
                memory_id,
                canonical_key,
                owner_type,
                scope,
                node_type,
                status,
                summary,
                created_at,
                updated_at,
                metadata_json
            FROM memory_nodes
            ORDER BY updated_at DESC, memory_id DESC
            """
        ).fetchall()

    items: list[dict[str, Any]] = []
    for row in rows:
        metadata = json.loads(str(row["metadata_json"] or "{}"))
        revision = revisions.get(str(row["memory_id"]), {})
        revision_payload = dict(revision.get("payload") or {})
        domain = str(metadata.get("domain") or revision_payload.get("domain") or _domain_from_canonical_key(str(row["canonical_key"])) or "")
        if not domain:
            continue
        subtype = str(metadata.get("subtype") or revision_payload.get("subtype") or row["node_type"])
        items.append(
            {
                "memory_id": str(row["memory_id"]),
                "canonical_key": str(row["canonical_key"]),
                "domain": domain,
                "subtype": subtype,
                "status": str(row["status"]),
                "title": metadata.get("title") or revision_payload.get("title"),
                "summary": str(revision.get("summary") or row["summary"]),
                "confidence": float(_first_non_null(metadata.get("confidence"), revision_payload.get("confidence"), 0.8)),
                "source": str(metadata.get("source") or revision_payload.get("source") or "memory_os"),
                "category": str(metadata.get("category") or revision_payload.get("category") or subtype),
                "created_at": str(metadata.get("created_at") or revision.get("created_at") or row["created_at"]),
                "updated_at": str(row["updated_at"]),
                "metadata": metadata,
                "revision": revision,
            }
        )
    return items


def _latest_revision_map(repository: MemoryOSRepository) -> dict[str, dict[str, Any]]:
    with repository._connect() as conn:
        rows = conn.execute(
            """
            SELECT
                revision_id,
                memory_id,
                revision_number,
                summary,
                evidence_ref,
                created_at,
                payload_json
            FROM memory_revisions
            ORDER BY memory_id ASC, revision_number DESC, created_at DESC, revision_id DESC
            """
        ).fetchall()
    latest: dict[str, dict[str, Any]] = {}
    for row in rows:
        memory_id = str(row["memory_id"])
        if memory_id in latest:
            continue
        latest[memory_id] = {
            "revision_id": str(row["revision_id"]),
            "memory_id": memory_id,
            "revision_number": int(row["revision_number"]),
            "summary": str(row["summary"]),
            "evidence_ref": row["evidence_ref"],
            "created_at": str(row["created_at"]),
            "payload": json.loads(str(row["payload_json"] or "{}")),
        }
    return latest


def _domain_from_canonical_key(canonical_key: str) -> str | None:
    if ":" not in canonical_key:
        return None
    return canonical_key.split(":", 1)[0]


def _first_non_null(*values: object) -> object:
    for value in values:
        if value is not None:
            return value
    return None


def _merge_growth_items(
    *,
    canonical_items: list[dict[str, Any]],
    records: list[dict[str, Any]],
    domain: str,
    subtype: str | None = None,
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for item in canonical_items:
        if item["domain"] != domain:
            continue
        if subtype is not None and item["subtype"] != subtype:
            continue
        merged[str(item["memory_id"])] = {
            "memory_id": str(item["memory_id"]),
            "domain": str(item["domain"]),
            "subtype": str(item["subtype"]),
            "status": str(item["status"]),
            "title": item.get("title"),
            "summary": str(item["summary"]),
        }
    for row in records:
        if row["domain"] != domain:
            continue
        if subtype is not None and row["subtype"] != subtype:
            continue
        merged.setdefault(
            str(row["memory_id"]),
            {
                "memory_id": str(row["memory_id"]),
                "domain": str(row["domain"]),
                "subtype": str(row["subtype"]),
                "status": str(row["status"]),
                "title": None,
                "summary": str(row["summary"]),
            },
        )
    return list(merged.values())


def _build_growth_item_from_memory_id(
    repository: MemoryOSRepository,
    memory_id: str,
    *,
    domain: str,
) -> dict[str, Any]:
    for item in _list_canonical_projection_items(repository):
        if item["memory_id"] == memory_id and item["domain"] == domain:
            return {
                "memory_id": str(item["memory_id"]),
                "domain": str(item["domain"]),
                "subtype": str(item["subtype"]),
                "status": str(item["status"]),
                "title": item.get("title"),
                "summary": str(item["summary"]),
            }
    record = _find_record_by_id(repository, memory_id, domain=domain)
    if record is None:
        raise KeyError(memory_id)
    return {
        "memory_id": str(record["memory_id"]),
        "domain": str(record["domain"]),
        "subtype": str(record["subtype"]),
        "status": str(record["status"]),
        "title": None,
        "summary": str(record["summary"]),
    }


def _upsert_canonical_node(
    repository: MemoryOSRepository,
    *,
    memory_id: str,
    canonical_key: str,
    summary: str,
    node_type: str,
    status: str,
    created_at: str,
    updated_at: str,
    metadata: dict[str, Any],
) -> None:
    repository.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": canonical_key,
            "owner_type": "agent",
            "scope": "user" if metadata.get("domain") != "soul" else "agent",
            "node_type": node_type,
            "status": status,
            "summary": summary,
            "created_at": created_at,
            "updated_at": updated_at,
            "metadata": metadata,
        }
    )


def _append_canonical_revision(
    repository: MemoryOSRepository,
    *,
    memory_id: str,
    summary: str,
    created_at: str,
    payload: dict[str, Any],
) -> None:
    latest = repository.list_memory_revisions(memory_id=memory_id)
    if latest:
        head = latest[0]
        if head.summary == summary and head.payload == payload:
            return
    repository.append_memory_revision(
        memory_id=memory_id,
        summary=summary,
        evidence_ref=None,
        created_at=created_at,
        payload=payload,
    )


def _update_canonical_node_status(
    repository: MemoryOSRepository,
    memory_id: str,
    status: str,
    *,
    updated_at: str,
) -> None:
    node = repository.get_memory_node(memory_id)
    if node is None:
        return
    repository.save_memory_node(
        {
            "memory_id": node.memory_id,
            "canonical_key": node.canonical_key,
            "owner_type": node.owner_type,
            "scope": node.scope,
            "node_type": node.node_type,
            "status": status,
            "summary": node.summary,
            "created_at": node.created_at,
            "updated_at": updated_at,
            "metadata": dict(node.metadata),
        }
    )
