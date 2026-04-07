from nion.automation.models import AutomationJob


def test_automation_bridge_creates_agent_owned_job_from_soul_projection():
    from nion.memory_os.automation_bridge import create_agent_owned_job

    job = create_agent_owned_job(
        job_id="job_01",
        name="月底低打扰复盘提醒",
        prompt="在月底高压期提供低刺激复盘提醒。",
        created_at="2026-04-10T00:00:00Z",
        provenance_memory_id="soul_rel_user_default",
        provenance_learning_id="learning_01",
    )

    assert isinstance(job, AutomationJob)
    assert job.owner_type == "agent"
    assert job.mutability == "pause_only"
    assert job.provenance_memory_id == "soul_rel_user_default"
    assert job.provenance_learning_id == "learning_01"
