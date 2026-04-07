from __future__ import annotations

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

    def find_user_model(subtype: str) -> dict[str, Any] | None:
        return next(
            (
                row
                for row in records
                if row["domain"] == "user_model" and row["subtype"] == subtype
            ),
            None,
        )

    work = find_user_model("workContext")
    personal = find_user_model("personalContext")
    top_of_mind = find_user_model("topOfMind")
    recent = find_user_model("recentMonths")
    earlier = find_user_model("earlierContext")
    long_term = find_user_model("longTermBackground")

    facts = [
        {
            "id": str(row["memory_id"]),
            "content": str(row["summary"]),
            "category": str(row["subtype"]),
            "confidence": float(row["confidence"]),
            "createdAt": str(row["created_at"]),
            "source": str((row.get("provenance") or {}).get("source_ref") or "memory_os"),
        }
        for row in records
        if row["domain"] == "user_model"
    ]

    last_updated = max(
        (str(row["updated_at"]) for row in records),
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
    return build_legacy_memory_view(repo)


def clear_memory_os_memory() -> dict[str, Any]:
    repo = get_memory_os_repository()
    for row in repo.list_memory_records(status="active"):
        repo.update_memory_status(str(row["memory_id"]), "invalidated", updated_at=utcnow_z())
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
        imported_soul = 1

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
    index = 1
    while True:
        candidate = f"fact_{index}"
        if candidate not in existing:
            return candidate
        index += 1
