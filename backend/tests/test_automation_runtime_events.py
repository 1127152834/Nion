from unittest.mock import patch

from nion.automation.models import AutomationJob
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


def test_run_job_dispatches_automation_failed_event(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(
        AutomationJob(
            id="job-1",
            name="Nightly digest",
            prompt="Summarize updates",
            job_kind="scheduled_task",
            schedule_kind="interval",
            schedule_value="900",
            schedule_preset="interval",
            delivery_mode="local",
            delivery_targets=[],
            created_at="2026-03-24T00:00:00Z",
            updated_at="2026-03-24T00:00:00Z",
        )
    )
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class FailingExecutor:
        def execute_job(self, job, *, run_id: str, trigger_event_name=None, trigger_event_payload=None):
            raise RuntimeError("runner unavailable")

    service = AutomationService(repository=repo, scheduler=scheduler, executor=FailingExecutor())

    with patch("nion.automation.service.dispatch_automation_event") as dispatch_mock:
        run = service.run_job("job-1")

    assert run.status == "failed"
    dispatch_mock.assert_called_once()
    event_name, payload = dispatch_mock.call_args.args
    assert event_name == "automation.run.failed"
    assert payload["job_id"] == "job-1"
    assert payload["run_id"] == run.id
