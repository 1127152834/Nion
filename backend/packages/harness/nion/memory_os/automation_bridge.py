from __future__ import annotations

from typing import Any

from nion.automation.models import AutomationJob

from .repository import MemoryOSRepository
from .soul_events import record_soul_event


def create_agent_owned_job(
    *,
    job_id: str,
    name: str,
    prompt: str,
    created_at: str,
    provenance_memory_id: str | None,
    provenance_learning_id: str | None,
) -> AutomationJob:
    return AutomationJob(
        id=job_id,
        name=name,
        prompt=prompt,
        schedule_kind="interval",
        schedule_value="1440",
        created_at=created_at,
        updated_at=created_at,
        owner_type="agent",
        owner_id="agent:main",
        mutability="pause_only",
        provenance_memory_id=provenance_memory_id,
        provenance_learning_id=provenance_learning_id,
    )


def record_agent_owned_job_created(
    *,
    repository: MemoryOSRepository,
    job: AutomationJob,
    created_at: str,
    provenance_learning_revision_id: str | None = None,
    procedure_memory_id: str | None = None,
    source: str = "automation_bridge",
    extra_metadata: dict[str, Any] | None = None,
) -> None:
    if job.owner_type != "agent":
        return
    metadata: dict[str, Any] = {
        "job_id": job.id,
        "job_name": job.name,
        "provenance_memory_id": job.provenance_memory_id,
        "provenance_learning_id": job.provenance_learning_id,
        "mutability": job.mutability,
    }
    if provenance_learning_revision_id is not None:
        metadata["provenance_learning_revision_id"] = provenance_learning_revision_id
    if procedure_memory_id is not None:
        metadata["procedure_memory_id"] = procedure_memory_id
    if extra_metadata:
        metadata.update(extra_metadata)
    record_soul_event(
        repository,
        event_type="soul_automation_created",
        memory_id=job.id,
        related_memory_id=procedure_memory_id or job.provenance_memory_id,
        summary=f"智能体把稳定服务方式外化成自动化：{job.name}",
        created_at=created_at,
        source=source,
        metadata=metadata,
    )
