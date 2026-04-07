from __future__ import annotations

from datetime import datetime, timedelta, timezone

from .clock import utcnow_z
from .repository import MemoryOSRepository

_FRESHNESS_WINDOWS = {
    ("soul", "core"): None,
    ("soul", "relationship_soul"): timedelta(days=7),
    ("agent_self", "identity_narrative"): timedelta(days=7),
    ("soul", "adaptive_overlay"): timedelta(days=7),
}


def compile_soul_runtime(repository: MemoryOSRepository) -> str:
    sections: list[str] = []

    now = _parse_z_datetime(utcnow_z())
    core = _latest_summary(repository, domain="soul", subtype="core", now=now)
    relationship = _latest_summary(repository, domain="soul", subtype="relationship_soul", now=now)
    narrative = _latest_summary(repository, domain="agent_self", subtype="identity_narrative", now=now)
    overlay = _latest_summary(repository, domain="soul", subtype="adaptive_overlay", now=now)

    if core:
        sections.append(f"<core_identity>\n{core}\n</core_identity>")
    if relationship:
        sections.append(f"<relationship_stance>\n{relationship}\n</relationship_stance>")
    if overlay:
        sections.append(f"<active_adaptations>\n{overlay}\n</active_adaptations>")
    if narrative:
        sections.append(f"<current_identity_narrative>\n{narrative}\n</current_identity_narrative>")

    if not sections:
        return ""

    return "<soul_runtime>\n" + "\n".join(sections) + "\n</soul_runtime>\n"


def _latest_summary(
    repository: MemoryOSRepository,
    *,
    domain: str,
    subtype: str,
    now: datetime,
) -> str:
    for row in repository.list_memory_records(domain=domain, status="active"):
        if row["subtype"] == subtype and _is_fresh(row, domain=domain, subtype=subtype, now=now):
            return str(row["summary"])
    return ""


def _is_fresh(
    row: dict[str, object],
    *,
    domain: str,
    subtype: str,
    now: datetime,
) -> bool:
    freshness_window = _FRESHNESS_WINDOWS[(domain, subtype)]
    if freshness_window is None:
        return True

    updated_at = row.get("updated_at")
    if not updated_at:
        return False
    return now - _parse_z_datetime(str(updated_at)) <= freshness_window


def _parse_z_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
