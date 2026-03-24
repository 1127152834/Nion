from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from nion.automation.delivery import AutomationDeliveryService
from nion.automation.executor import AutomationExecutor, LangGraphAutomationRunner
from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.policies import build_automation_session_policy
from nion.automation.repository import AutomationRepository
from nion.automation.schedule_presets import build_schedule_fields, infer_schedule_preset
from nion.automation.scheduler import AutomationScheduler, compute_next_run_at, format_automation_datetime
from nion.config.app_config import get_app_config
from nion.config.automation_config import get_automation_config
from nion.config.paths import resolve_path


class AutomationService:
    def __init__(
        self,
        *,
        repository: AutomationRepository,
        scheduler: AutomationScheduler,
        executor: AutomationExecutor | None = None,
        clock: Callable[[], datetime] | None = None,
    ):
        self._repository = repository
        self._scheduler = scheduler
        self._executor = executor
        self._clock = clock or (lambda: datetime.now(UTC))

    def list_jobs(self) -> list[AutomationJob]:
        return self._repository.list_jobs()

    def create_job(self, payload: Mapping[str, Any]) -> AutomationJob:
        now = self._clock()
        enabled = bool(payload.get("enabled", True))
        schedule_timezone = str(payload.get("schedule_timezone") or "UTC")
        schedule_preset = str(
            payload.get("schedule_preset") or infer_schedule_preset(payload.get("schedule_kind"))
        )
        schedule_metadata = self._coerce_schedule_metadata(payload.get("schedule_metadata"))
        schedule_kind = payload.get("schedule_kind")
        schedule_value = payload.get("schedule_value")

        if schedule_kind is None or schedule_value is None:
            schedule_fields = build_schedule_fields(
                preset=schedule_preset,
                timezone=schedule_timezone,
                time_of_day=_maybe_str(schedule_metadata.get("time_of_day")),
                interval_minutes=_maybe_int(schedule_metadata.get("interval_minutes")),
                weekdays=_maybe_int_list(schedule_metadata.get("weekdays")),
                day_of_week=_maybe_int(schedule_metadata.get("day_of_week")),
                run_at=_maybe_str(schedule_metadata.get("run_at")),
                cron_expression=_maybe_str(schedule_metadata.get("cron_expression")),
            )
            schedule_kind = schedule_fields.schedule_kind
            schedule_value = schedule_fields.schedule_value
            schedule_timezone = schedule_fields.schedule_timezone
            if not schedule_metadata:
                schedule_metadata = schedule_fields.schedule_metadata

        draft = AutomationJob(
            id=str(payload.get("id") or f"job-{uuid4().hex[:8]}"),
            name=str(payload["name"]),
            prompt=str(payload["prompt"]),
            job_kind=str(payload.get("job_kind") or "scheduled_task"),
            schedule_kind=schedule_kind,
            schedule_value=str(schedule_value),
            schedule_preset=schedule_preset,
            schedule_timezone=schedule_timezone,
            schedule_metadata=schedule_metadata,
            enabled=enabled,
            state=str(payload.get("state") or ("scheduled" if enabled else "paused")),
            delivery_mode=payload.get("delivery_mode") or "local",
            delivery_targets=list(payload.get("delivery_targets") or []),
            skills=list(payload.get("skills") or []),
            session_policy=build_automation_session_policy(payload.get("session_policy")),
            toolset_profile=str(payload.get("toolset_profile") or get_automation_config().default_toolset_profile),
            next_run_at=payload.get("next_run_at"),
            created_at=format_automation_datetime(now),
            updated_at=format_automation_datetime(now),
        )

        if draft.next_run_at is None and enabled:
            draft.next_run_at = compute_next_run_at(draft, now=now)

        return self._repository.save_job(draft)

    def get_job(self, job_id: str) -> AutomationJob:
        job = self._repository.get_job(job_id)
        if job is None:
            raise KeyError(job_id)
        return job

    def pause_job(self, job_id: str) -> AutomationJob:
        return self._scheduler.pause_job(job_id)

    def resume_job(self, job_id: str, *, now: datetime | None = None) -> AutomationJob:
        return self._scheduler.resume_job(job_id, now=now or self._clock())

    def run_job(self, job_id: str) -> AutomationRun:
        if self._executor is None:
            raise RuntimeError("Automation executor is not configured")

        job = self.get_job(job_id)
        run_id = f"run-{uuid4().hex[:8]}"
        try:
            run = self._executor.execute_job(job, run_id=run_id)
        except Exception as exc:
            finished_at = self._clock()
            run = AutomationRun(
                id=run_id,
                job_id=job.id,
                started_at=format_automation_datetime(finished_at),
                finished_at=format_automation_datetime(finished_at),
                status="failed",
                result_summary=str(exc),
            )

        self._repository.save_run(run)
        if run.finished_at:
            finished_at = datetime.fromisoformat(run.finished_at.replace("Z", "+00:00")).astimezone(UTC)
            self._scheduler.mark_run_finished(job.id, run, finished_at=finished_at)
        return run

    def delete_job(self, job_id: str) -> bool:
        self._repository.release_job_claim(job_id)
        return self._repository.delete_job(job_id)

    def list_runs(self) -> list[AutomationRun]:
        return self._repository.list_runs()

    def get_status(self) -> dict[str, Any]:
        jobs = self._repository.list_jobs()
        runs = self._repository.list_runs()
        return {
            "scheduler_running": True,
            "total_jobs_count": len(jobs),
            "active_jobs_count": sum(1 for job in jobs if job.enabled and job.state in {"scheduled", "running"}),
            "paused_jobs_count": sum(1 for job in jobs if job.state == "paused" or not job.enabled),
            "error_jobs_count": sum(1 for job in jobs if job.state == "error"),
            "run_count": len(runs),
            "failed_runs_count": sum(1 for run in runs if run.status == "failed"),
            "last_tick_at": self._scheduler.last_tick_at,
            "last_success_at": next(
                (
                    run.finished_at or run.started_at
                    for run in runs
                    if run.status == "succeeded"
                ),
                None,
            ),
        }

    @staticmethod
    def _coerce_schedule_metadata(raw_metadata: Any) -> dict[str, Any]:
        if isinstance(raw_metadata, Mapping):
            return dict(raw_metadata)
        return {}


def create_default_automation_service(
    *,
    langgraph_url: str | None = None,
    channel_publisher: Any | None = None,
) -> AutomationService:
    config = get_automation_config()
    repository = AutomationRepository(resolve_path(config.storage_path))
    scheduler = AutomationScheduler(repository, lock_timeout_seconds=config.lock_timeout_seconds)
    runner = LangGraphAutomationRunner(langgraph_url=langgraph_url or _resolve_langgraph_url_from_config())
    delivery_service = AutomationDeliveryService(
        thread_client=runner.client.threads,
        channel_publisher=channel_publisher,
    )
    executor = AutomationExecutor(runtime_runner=runner, delivery_service=delivery_service)
    return AutomationService(
        repository=repository,
        scheduler=scheduler,
        executor=executor,
    )


def _resolve_langgraph_url_from_config() -> str:
    config = get_app_config()
    extra = config.model_extra or {}
    channels = extra.get("channels") if isinstance(extra, dict) else None
    if isinstance(channels, dict):
        langgraph_url = channels.get("langgraph_url")
        if isinstance(langgraph_url, str) and langgraph_url.strip():
            return langgraph_url
    return "http://localhost:2024"


def _maybe_str(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def _maybe_int(value: Any) -> int | None:
    if value is None:
        return None
    return int(value)


def _maybe_int_list(value: Any) -> list[int] | None:
    if value is None:
        return None
    return [int(item) for item in value]
