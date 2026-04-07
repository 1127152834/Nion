from nion.automation.models import AutomationJob
from nion.memory_os.projections import build_automation_projection


def test_build_automation_projection_uses_owner_and_mutability_fields():
    job = AutomationJob(
        id="job_1",
        name="Review learning topic",
        prompt="review it",
        schedule_kind="cron",
        schedule_value="0 9 * * 1",
        created_at="2026-04-04T00:00:00Z",
        updated_at="2026-04-04T00:00:00Z",
        owner_type="agent",
        owner_id="agent:main",
        mutability="pause_only",
    )

    projection = build_automation_projection(job)

    assert projection.owner_type == "agent"
    assert projection.mutability == "pause_only"
