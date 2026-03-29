from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


class _WorkflowExecutor:
    def __init__(self):
        self.resume_calls: list[tuple[str, str, dict]] = []

    def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
        return AutomationRun(
            id=run_id,
            job_id=job.id,
            started_at="2026-03-29T10:00:00Z",
            finished_at=None,
            status="paused",
            trigger_event_name=trigger_event_name,
            result_summary="Waiting for user",
            current_step_id="step-wait",
            step_results=[
                {"step_id": "step-notify", "status": "succeeded", "attempts": 1},
                {"step_id": "step-wait", "status": "paused", "attempts": 1},
            ],
        )

    def resume_workflow(self, job, run, *, resume_payload: dict):
        self.resume_calls.append((job.id, run.id, resume_payload))
        return AutomationRun(
            id=run.id,
            job_id=job.id,
            started_at=run.started_at,
            finished_at="2026-03-29T10:05:00Z",
            status="succeeded",
            result_summary="Workflow completed",
            current_step_id=None,
            step_results=[
                {"step_id": "step-notify", "status": "succeeded", "attempts": 1},
                {"step_id": "step-wait", "status": "succeeded", "attempts": 1},
            ],
        )


def _workflow_job() -> AutomationJob:
    return AutomationJob(
        id="workflow-1",
        name="Reply follow-up workflow",
        prompt="Run workflow",
        job_kind="workflow",
        schedule_kind="event",
        schedule_value="agent.run.completed",
        schedule_preset="event",
        trigger_kind="event",
        trigger_spec={"event_name": "agent.run.completed"},
        action_kind="agent_prompt",
        action_spec={},
        workflow_steps=[
            {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
            {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
        ],
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-29T00:00:00Z",
        updated_at="2026-03-29T00:00:00Z",
    )


def test_workflow_service_resume_updates_paused_run(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    executor = _WorkflowExecutor()
    service = AutomationService(repository=repo, scheduler=scheduler, executor=executor)

    repo.save_job(_workflow_job())
    repo.save_run(
        AutomationRun(
            id="run-1",
            job_id="workflow-1",
            started_at="2026-03-29T10:00:00Z",
            finished_at=None,
            status="paused",
            result_summary="Waiting for user",
            current_step_id="step-wait",
            step_results=[
                {"step_id": "step-notify", "status": "succeeded", "attempts": 1},
                {"step_id": "step-wait", "status": "paused", "attempts": 1},
            ],
        )
    )

    run = service.resume_workflow_run("workflow-1", "run-1", {"answer": "continue"})

    assert run.status == "succeeded"
    assert run.current_step_id is None
    assert executor.resume_calls == [("workflow-1", "run-1", {"answer": "continue"})]


def test_workflow_service_resume_rejects_non_paused_run(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    executor = _WorkflowExecutor()
    service = AutomationService(repository=repo, scheduler=scheduler, executor=executor)

    repo.save_job(_workflow_job())
    repo.save_run(
        AutomationRun(
            id="run-1",
            job_id="workflow-1",
            started_at="2026-03-29T10:00:00Z",
            finished_at="2026-03-29T10:05:00Z",
            status="succeeded",
            result_summary="done",
        )
    )

    try:
        service.resume_workflow_run("workflow-1", "run-1", {"answer": "continue"})
    except ValueError as error:
        assert "paused" in str(error)
    else:
        raise AssertionError("Expected ValueError for non-paused workflow run")
