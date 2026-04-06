from __future__ import annotations

from pathlib import Path

from .repository import MemoryOSRepository
from .soul import create_soul_proposal
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
        repeated_needs=repeated_needs,
        created_at=created_at,
    )

    proposal_created = False
    if _meets_proposal_threshold(repeated_needs, evidence_days):
        summary = repeated_needs[0]
        create_soul_proposal(
            repository,
            title="调整陪伴与支持方式",
            summary=f"基于长期重复信号，建议围绕“{summary}”调整当前陪伴与支持方式。",
        )
        proposal_created = True

    return {
        "journal_path": journal_path,
        "proposal_created": proposal_created,
    }


def _meets_proposal_threshold(repeated_needs: list[str], evidence_days: int) -> bool:
    if evidence_days < 2:
        return False
    if len(repeated_needs) < 3:
        return False
    return len(set(repeated_needs)) == 1
