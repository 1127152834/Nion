from datetime import UTC, datetime

from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.policies import is_recursive_schedule_blocked
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def test_automation_cannot_schedule_automation_from_inside_automation():
    assert is_recursive_schedule_blocked({"session_mode": "automation"}) is True
    assert is_recursive_schedule_blocked({"session_mode": "chat"}) is False


def test_service_status_exposes_diagnostics_and_future_hooks(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_run(
        AutomationRun(
            id="run-1",
            job_id="job-1",
            started_at="2026-03-24T01:00:00Z",
            finished_at="2026-03-24T01:01:00Z",
            status="failed",
            result_summary="runner unavailable",
        )
    )
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    scheduler.get_due_jobs(now=_dt("2026-03-24T02:00:00Z"))
    service = AutomationService(repository=repo, scheduler=scheduler)

    status = service.get_status()

    assert status["scheduler_running"] is True
    assert status["failed_runs_count"] == 1
    assert status["last_tick_at"] == "2026-03-24T02:00:00Z"
    assert status["future_hooks"]["openviking_archive"] == "deferred"
    assert status["future_hooks"]["relationship_aware_routines"] == "deferred"


def test_service_persists_failed_runs_when_execution_raises(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(
        AutomationJob(
            id="job-1",
            name="Morning summary",
            prompt="Summarize updates",
            schedule_kind="interval",
            schedule_value="900",
            delivery_mode="local",
            delivery_targets=[],
            created_at="2026-03-24T00:00:00Z",
            updated_at="2026-03-24T00:00:00Z",
        )
    )
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    class FailingExecutor:
        def execute_job(self, job, *, run_id: str):
            raise RuntimeError("runner unavailable")

    service = AutomationService(repository=repo, scheduler=scheduler, executor=FailingExecutor())

    run = service.run_job("job-1")

    assert run.status == "failed"
    assert repo.list_runs()[0].status == "failed"
    assert service.get_job("job-1").last_status == "failed"
