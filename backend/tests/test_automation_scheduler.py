from datetime import UTC, datetime

from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def _job(
    job_id: str,
    *,
    schedule_kind: str = "interval",
    schedule_value: str = "900",
    schedule_preset: str = "interval",
    schedule_timezone: str = "UTC",
    state: str = "scheduled",
    enabled: bool = True,
    next_run_at: str | None = "2026-03-24T01:00:00Z",
) -> AutomationJob:
    return AutomationJob(
        id=job_id,
        name=f"Job {job_id}",
        prompt="Summarize updates",
        job_kind="scheduled_task",
        schedule_kind=schedule_kind,
        schedule_value=schedule_value,
        schedule_preset=schedule_preset,
        schedule_timezone=schedule_timezone,
        schedule_metadata={},
        enabled=enabled,
        state=state,
        delivery_mode="local",
        delivery_targets=[],
        skills=[],
        session_policy={},
        toolset_profile="automation",
        next_run_at=next_run_at,
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )


def test_due_jobs_are_selected_without_duplicates(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(_job("job-1", next_run_at="2026-03-24T00:30:00Z"))
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    now = _dt("2026-03-24T01:00:00Z")

    first_due = scheduler.get_due_jobs(now=now)
    second_due = scheduler.get_due_jobs(now=now)

    assert [job.id for job in first_due] == ["job-1"]
    assert second_due == []


def test_run_now_makes_future_job_immediately_due(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(_job("job-1", next_run_at="2026-03-24T08:00:00Z"))
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    now = _dt("2026-03-24T01:00:00Z")

    updated = scheduler.run_now("job-1", now=now)
    due_jobs = scheduler.get_due_jobs(now=now)

    assert updated.next_run_at == "2026-03-24T01:00:00Z"
    assert [job.id for job in due_jobs] == ["job-1"]


def test_pause_and_resume_cron_job_recomputes_next_run(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(
        _job(
            "job-1",
            schedule_kind="cron",
            schedule_value="*/15 * * * *",
            state="paused",
            enabled=False,
            next_run_at=None,
        )
    )
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    paused = scheduler.pause_job("job-1")
    resumed = scheduler.resume_job("job-1", now=_dt("2026-03-24T01:07:00Z"))

    assert paused.state == "paused"
    assert paused.enabled is False
    assert resumed.state == "scheduled"
    assert resumed.enabled is True
    assert resumed.next_run_at == "2026-03-24T01:15:00Z"


def test_mark_run_finished_updates_interval_job_schedule(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(_job("job-1", schedule_kind="interval", schedule_value="1800"))
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)
    run = AutomationRun(
        id="run-1",
        job_id="job-1",
        started_at="2026-03-24T01:00:00Z",
        finished_at="2026-03-24T01:02:00Z",
        status="succeeded",
        result_summary="Delivered update",
    )

    updated = scheduler.mark_run_finished(
        "job-1",
        run,
        finished_at=_dt("2026-03-24T01:02:00Z"),
    )

    assert updated.last_status == "succeeded"
    assert updated.last_result_summary == "Delivered update"
    assert updated.next_run_at == "2026-03-24T01:32:00Z"


def test_resume_job_uses_schedule_timezone_for_cron_jobs(tmp_path):
    repo = AutomationRepository(tmp_path / "automation.db")
    repo.save_job(
        _job(
            "job-1",
            schedule_kind="cron",
            schedule_value="30 9 * * *",
            schedule_preset="daily",
            schedule_timezone="Asia/Shanghai",
            state="paused",
            enabled=False,
            next_run_at=None,
        )
    )
    scheduler = AutomationScheduler(repo, lock_timeout_seconds=300)

    resumed = scheduler.resume_job("job-1", now=_dt("2026-03-24T01:07:00Z"))

    assert resumed.state == "scheduled"
    assert resumed.enabled is True
    assert resumed.next_run_at == "2026-03-24T01:30:00Z"
