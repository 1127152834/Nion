from __future__ import annotations

import json
from typing import Any

from nion.automation.models import AutomationJob

from .automation_bridge import record_agent_owned_job_created
from .models import AutomationProjection
from .repository import MemoryOSRepository


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


def save_automation_projection(
    *,
    repository: MemoryOSRepository,
    projection: AutomationProjection,
    created_at: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = projection.model_dump()
    if metadata:
        payload.update(metadata)
    with repository._connect() as conn:
        conn.execute(
            """
            INSERT INTO automation_projections (
                job_id,
                payload_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?)
            ON CONFLICT(job_id) DO UPDATE SET
                payload_json = excluded.payload_json,
                updated_at = excluded.updated_at
            """,
            (
                projection.job_id,
                json.dumps(payload, ensure_ascii=False),
                created_at,
                created_at,
            ),
        )
    return payload


def record_soul_automation_created(
    *,
    repository: MemoryOSRepository,
    job: AutomationJob,
    created_at: str,
    provenance_learning_revision_id: str | None = None,
    procedure_memory_id: str | None = None,
    extra_metadata: dict[str, Any] | None = None,
) -> None:
    record_agent_owned_job_created(
        repository=repository,
        job=job,
        created_at=created_at,
        source="automation_projection",
        provenance_learning_revision_id=provenance_learning_revision_id,
        procedure_memory_id=procedure_memory_id,
        extra_metadata=extra_metadata,
    )
