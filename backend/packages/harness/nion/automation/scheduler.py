from datetime import UTC, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from croniter import croniter

from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.repository import AutomationRepository


def parse_automation_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def format_automation_datetime(value: datetime) -> str:
    return value.astimezone(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def compute_next_run_at(job: AutomationJob, *, now: datetime) -> str | None:
    if job.schedule_kind == "event":
        return None

    if job.schedule_kind == "once":
        if not job.schedule_value:
            return None
        scheduled = parse_automation_datetime(job.schedule_value)
        return format_automation_datetime(scheduled) if scheduled >= now else None

    if job.schedule_kind == "interval":
        return format_automation_datetime(now + timedelta(seconds=int(job.schedule_value)))

    if job.schedule_kind == "cron":
        local_timezone = ZoneInfo(job.schedule_timezone or "UTC")
        local_now = now.astimezone(local_timezone)
        next_local = croniter(job.schedule_value, local_now).get_next(datetime)
        if next_local.tzinfo is None:
            next_local = next_local.replace(tzinfo=local_timezone)
        return format_automation_datetime(next_local.astimezone(UTC))

    raise ValueError(f"Unsupported schedule kind: {job.schedule_kind}")


class AutomationScheduler:
    def __init__(self, repository: AutomationRepository, *, lock_timeout_seconds: int = 300):
        self._repository = repository
        self._lock_timeout_seconds = lock_timeout_seconds
        self._last_tick_at: str | None = None

    @property
    def last_tick_at(self) -> str | None:
        return self._last_tick_at

    def get_due_jobs(self, *, now: datetime, limit: int | None = None) -> list[AutomationJob]:
        self._last_tick_at = format_automation_datetime(now)
        due_jobs: list[AutomationJob] = []
        for job in self._repository.list_jobs():
            if not self._is_due(job, now=now):
                continue
            claimed = self._repository.claim_job(
                job.id,
                run_id=f"claim-{uuid4().hex[:8]}",
                claimed_at=format_automation_datetime(now),
                claimed_until=format_automation_datetime(now + timedelta(seconds=self._lock_timeout_seconds)),
            )
            if claimed:
                due_jobs.append(job)
            if limit is not None and len(due_jobs) >= limit:
                break
        return due_jobs

    def run_now(self, job_id: str, *, now: datetime) -> AutomationJob:
        job = self._require_job(job_id)
        job.enabled = True
        job.state = "scheduled"
        job.next_run_at = format_automation_datetime(now)
        job.updated_at = format_automation_datetime(now)
        self._repository.release_job_claim(job_id)
        return self._repository.save_job(job)

    def pause_job(self, job_id: str) -> AutomationJob:
        job = self._require_job(job_id)
        job.enabled = False
        job.state = "paused"
        job.next_run_at = None
        self._repository.release_job_claim(job_id)
        return self._repository.save_job(job)

    def resume_job(self, job_id: str, *, now: datetime) -> AutomationJob:
        job = self._require_job(job_id)
        job.enabled = True
        job.state = "scheduled"
        job.next_run_at = compute_next_run_at(job, now=now)
        job.updated_at = format_automation_datetime(now)
        self._repository.release_job_claim(job_id)
        return self._repository.save_job(job)

    def mark_run_finished(self, job_id: str, run: AutomationRun, *, finished_at: datetime) -> AutomationJob:
        job = self._require_job(job_id)
        job.last_run_at = format_automation_datetime(finished_at)
        job.last_status = run.status
        job.last_result_summary = run.result_summary
        job.updated_at = format_automation_datetime(finished_at)

        if run.status == "failed":
            job.state = "error"
            job.next_run_at = None
        elif job.schedule_kind == "event":
            job.state = "scheduled"
            job.next_run_at = None
        elif job.schedule_kind == "once":
            job.enabled = False
            job.state = "scheduled"
            job.next_run_at = None
        else:
            job.state = "scheduled"
            job.next_run_at = compute_next_run_at(job, now=finished_at)

        self._repository.release_job_claim(job_id)
        return self._repository.save_job(job)

    def _is_due(self, job: AutomationJob, *, now: datetime) -> bool:
        if not job.enabled or job.state != "scheduled":
            return False
        if not job.next_run_at:
            return False
        return parse_automation_datetime(job.next_run_at) <= now

    def _require_job(self, job_id: str) -> AutomationJob:
        job = self._repository.get_job(job_id)
        if job is None:
            raise KeyError(f"Automation job not found: {job_id}")
        return job
