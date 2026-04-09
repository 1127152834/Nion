from __future__ import annotations

from pathlib import Path

from .repository import MemoryOSRepository
from .soul_artifacts import MemoryOSSoulArtifactStore
from .soul_events import record_soul_event
from .soul_journal import write_soul_journal


def reflect_soul_growth(
    *,
    repository: MemoryOSRepository,
    base_dir: str | Path,
    repeated_needs: list[str],
    evidence_days: int,
    created_at: str,
) -> dict[str, object]:
    journal_path = write_soul_journal(
        base_dir=base_dir,
        repository=repository,
        repeated_needs=repeated_needs,
        created_at=created_at,
    )

    overlay_updated = False
    if _meets_proposal_threshold(repeated_needs, evidence_days):
        summary = repeated_needs[0]
        overlay_summary = f"基于长期重复信号，当前临时表达模式会围绕“{summary}”调整陪伴与支持方式。"
        current_overlay = _find_active_overlay(repository)
        if current_overlay is None or str(current_overlay["summary"]).strip() != overlay_summary:
            artifact = MemoryOSSoulArtifactStore(
                repository=repository,
                base_dir=base_dir,
            ).write_active_overlay(
                body="\n".join(
                    [
                        "# Active Soul Overlay",
                        "",
                        "## Expression Adjustments",
                        overlay_summary,
                    ]
                ),
                created_at=created_at,
            )
            record_soul_event(
                repository,
                event_type="adaptive_overlay_refreshed",
                memory_id=str(artifact["memory_record"]["memory_id"]),
                summary=f"当前临时表达模式已更新：{overlay_summary}",
                created_at=created_at,
                source="soul_reflection",
                metadata={
                    "artifact_uri": artifact["memory_record"]["artifact_uri"],
                    "trigger_kind": "repeated_need",
                    "trigger_summary": summary,
                },
            )
            overlay_updated = True

    return {
        "journal_path": journal_path,
        "overlay_updated": overlay_updated,
    }


def _meets_proposal_threshold(repeated_needs: list[str], evidence_days: int) -> bool:
    if evidence_days < 2:
        return False
    if len(repeated_needs) < 3:
        return False
    return len(set(repeated_needs)) == 1


def _find_active_overlay(
    repository: MemoryOSRepository,
) -> dict[str, object] | None:
    return next(
        (
            row
            for row in repository.list_memory_records(domain="soul", status="active")
            if str(row["memory_id"]) == "soul_overlay_active_main"
            and str(row["subtype"]) == "adaptive_overlay"
        ),
        None,
    )
