from __future__ import annotations

from pathlib import Path

from nion.memory.projections.service import project_learning_outputs

from .learning import create_learning_topic
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
    soul.setdefault("reflection_inputs", [])

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

        projection = project_learning_outputs(
            repository=repository,
            learning_memory_id=str(learning["memory_id"]),
            created_at=created_at,
        )
        soul["reflection_inputs"].append(projection["soul_reflection_input"])
        procedure_created = bool(projection["procedure"].get("memory_id"))
        automation_projected = bool(projection["automation_projection"].get("job_id"))

    return {
        "soul": soul,
        "learning_created": learning_created,
        "procedure_created": procedure_created,
        "automation_projected": automation_projected,
    }


def _should_project_growth_outputs(soul_result: dict[str, object]) -> bool:
    return bool(soul_result.get("overlay_updated"))
