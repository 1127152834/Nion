from __future__ import annotations

from nion.automation.models import AutomationJob

from .models import AutomationProjection


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
