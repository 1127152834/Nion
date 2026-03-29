from nion.automation.event_dispatch import dispatch_automation_event
from nion.automation.models import AutomationRun
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


def test_event_task_handle_event_executes_matching_rule(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    calls: list[tuple[str, str]] = []

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name: str | None = None, trigger_event_payload=None):
            calls.append((job.id, trigger_event_name or ""))
            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-24T01:00:00Z",
                finished_at="2026-03-24T01:00:01Z",
                status="succeeded",
                trigger_event_name=trigger_event_name,
                result_summary="Done",
            )

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    service.create_job(
        {
            "id": "hook-1",
            "name": "Reply finished alert",
            "prompt": "Notify me",
            "job_kind": "event_task",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "action_kind": "agent_prompt",
            "action_spec": {},
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    runs = service.handle_event("agent.run.completed", {"thread_id": "thread-1"})

    assert len(runs) == 1
    assert calls == [("hook-1", "agent.run.completed")]
    assert repo.list_runs()[0].job_id == "hook-1"


def test_event_task_handle_event_ignores_non_matching_rules(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name: str | None = None, trigger_event_payload=None):
            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-24T01:00:00Z",
                finished_at="2026-03-24T01:00:01Z",
                status="succeeded",
                trigger_event_name=trigger_event_name,
                result_summary="Done",
            )

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    service.create_job(
        {
            "id": "hook-1",
            "name": "Reply finished alert",
            "prompt": "Notify me",
            "job_kind": "event_task",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "action_kind": "agent_prompt",
            "action_spec": {},
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    runs = service.handle_event("thread.failed", {"thread_id": "thread-1"})

    assert runs == []
    assert repo.list_runs() == []


def test_dispatch_allows_automation_run_failed_even_from_automation_surface(monkeypatch):
    captured = []

    class DummyService:
        def handle_event(self, event_name: str, payload: dict):
            captured.append((event_name, payload))

    monkeypatch.setattr(
        "nion.automation.service.create_default_automation_service",
        lambda: DummyService(),
    )

    dispatch_automation_event(
        "automation.run.failed",
        {
            "job_id": "job-1",
            "run_id": "run-1",
            "surface": "automation",
        },
    )

    assert captured == [
        (
            "automation.run.failed",
            {
                "job_id": "job-1",
                "run_id": "run-1",
                "surface": "automation",
            },
        )
    ]


def test_workflow_handle_event_executes_matching_rule(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    calls: list[tuple[str, str]] = []

    class DummyExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name: str | None = None, trigger_event_payload=None):
            calls.append((job.id, trigger_event_name or ""))
            return AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at="2026-03-24T01:00:00Z",
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

    service = AutomationService(repository=repo, scheduler=scheduler, executor=DummyExecutor())
    service.create_job(
        {
            "id": "workflow-1",
            "name": "Reply follow-up workflow",
            "prompt": "Run workflow",
            "job_kind": "workflow",
            "schedule_kind": "event",
            "schedule_value": "agent.run.completed",
            "schedule_preset": "event",
            "trigger_kind": "event",
            "trigger_spec": {"event_name": "agent.run.completed"},
            "workflow_steps": [
                {"id": "step-notify", "kind": "notify", "config": {"title": "Reply finished"}},
                {"id": "step-wait", "kind": "wait_for_user", "config": {"prompt": "Continue?"}},
            ],
            "delivery_mode": "local",
            "delivery_targets": [],
        }
    )

    runs = service.handle_event("agent.run.completed", {"thread_id": "thread-1"})

    assert len(runs) == 1
    assert runs[0].status == "paused"
    assert calls == [("workflow-1", "agent.run.completed")]
