from __future__ import annotations

from pathlib import Path

from nion.automation.models import AutomationJob

from .learning import create_learning_topic
from .procedures import create_procedure_draft
from .projections import record_soul_automation_created
from .repository import MemoryOSRepository
from .soul_reflection import reflect_soul_growth


def run_growth_orchestrator(
    *,
    repository: MemoryOSRepository,
    base_dir: str | Path,
    created_at: str,
    repeated_needs: list[str],
    evidence_days: int,
) -> dict[str, object]:
    soul = reflect_soul_growth(
        repository=repository,
        base_dir=base_dir,
        repeated_needs=repeated_needs,
        evidence_days=evidence_days,
        created_at=created_at,
    )

    learning_created = False
    procedure_created = False
    automation_projected = False

    if _should_project_growth_outputs(soul):
        summary = repeated_needs[0]
        learning = create_learning_topic(
            repository,
            title="低刺激支持策略",
            summary=f"围绕“{summary}”形成长期学习主题。",
        )
        learning_created = True

        procedure = create_procedure_draft(
            repository,
            title="低刺激陪伴流程草案",
            summary=f"把“{summary}”沉淀为可复用的服务流程草案。",
        )
        procedure_created = True

        record_soul_automation_created(
            repository=repository,
            job=AutomationJob(
                id="job_soul_growth_projection",
                name="低刺激陪伴提醒",
                prompt=f"在类似“{summary}”场景下提供低刺激、少施压的陪伴提醒。",
                schedule_kind="interval",
                schedule_value="1440",
                created_at=created_at,
                updated_at=created_at,
                owner_type="agent",
                owner_id="agent:main",
                mutability="pause_only",
                provenance_memory_id="soul_overlay_active_main" if soul["proposal_created"] else None,
                provenance_learning_id=str(learning["memory_id"]),
            ),
            created_at=created_at,
        )
        automation_projected = True

    return {
        "soul": soul,
        "learning_created": learning_created,
        "procedure_created": procedure_created,
        "automation_projected": automation_projected,
    }


def _should_project_growth_outputs(soul_result: dict[str, object]) -> bool:
    return bool(soul_result.get("proposal_created"))
