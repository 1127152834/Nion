from __future__ import annotations

from nion.automation.models import AutomationJob

from .models import AutomationProjection
from .repository import MemoryOSRepository
from .soul_events import record_soul_event


def build_automation_projection(job: AutomationJob) -> AutomationProjection:
    return AutomationProjection(
        job_id=job.id,
        owner_type=job.owner_type,
        owner_id=job.owner_id,
        mutability=job.mutability,
        provenance_memory_id=job.provenance_memory_id,
        provenance_learning_id=job.provenance_learning_id,
        retention_policy=job.retention_policy,
        visible_in_ui=job.visible_in_ui,
        policy_flags=job.policy_flags,
    )


def record_soul_automation_created(
    *,
    repository: MemoryOSRepository,
    job: AutomationJob,
    created_at: str,
) -> None:
    if job.owner_type != "agent":
        return
    summary = f"智能体把稳定服务方式外化成自动化：{job.name}"
    record_soul_event(
        repository,
        event_type="soul_automation_created",
        memory_id=job.id,
        related_memory_id=job.provenance_memory_id,
        summary=summary,
        created_at=created_at,
        source="automation_projection",
        metadata={
            "job_id": job.id,
            "job_name": job.name,
            "provenance_memory_id": job.provenance_memory_id,
            "provenance_learning_id": job.provenance_learning_id,
            "mutability": job.mutability,
        },
    )
