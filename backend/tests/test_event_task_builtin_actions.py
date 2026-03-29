from nion.automation.delivery import AutomationDeliveryService
from nion.automation.executor import AutomationExecutor
from nion.automation.models import AutomationJob
from nion.notebook.service import NotebookService


class _UnusedRunner:
    def run(self, *, prompt: str, thread_id: str, context: dict, config: dict):
        raise AssertionError("Runtime runner should not be used for built-in actions")


def test_notebook_write_action_creates_a_note(tmp_path):
    job = AutomationJob(
        id="hook-1",
        name="Archive finance message",
        prompt="Archive this event",
        job_kind="event_task",
        schedule_kind="event",
        schedule_value="thread.finished",
        schedule_preset="event",
        trigger_kind="event",
        trigger_spec={"event_name": "thread.finished"},
        action_kind="notebook_write",
        action_spec={
            "directory": "automation",
            "title": "Finance event note",
            "body": "Archived from automation",
        },
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )

    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
        notebook_service=NotebookService(base_dir=tmp_path),
    )

    run = executor.execute_job(job, run_id="run-1", trigger_event_name="thread.finished")

    assert run.status == "succeeded"
    assert "Finance event note" in run.result_summary
    notes = NotebookService(base_dir=tmp_path).list_note_summaries()
    assert len(notes) == 1
    assert notes[0].title == "Finance event note"


def test_notify_action_returns_successful_summary():
    job = AutomationJob(
        id="hook-1",
        name="Notify on failure",
        prompt="Notify me",
        job_kind="event_task",
        schedule_kind="event",
        schedule_value="agent.run.failed",
        schedule_preset="event",
        trigger_kind="event",
        trigger_spec={"event_name": "agent.run.failed"},
        action_kind="notify",
        action_spec={"title": "Automation failed", "body": "Check the failed run"},
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )

    executor = AutomationExecutor(
        runtime_runner=_UnusedRunner(),
        delivery_service=AutomationDeliveryService(),
    )

    run = executor.execute_job(job, run_id="run-1", trigger_event_name="agent.run.failed")

    assert run.status == "succeeded"
    assert "Automation failed" in run.result_summary
