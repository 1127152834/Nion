from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from nion.automation.delivery import AutomationDeliveryService
from nion.automation.executor import AutomationExecutor, LangGraphAutomationRunner
from nion.automation.models import AutomationJob, AutomationRun
from nion.automation.policies import build_automation_session_policy
from nion.automation.repository import AutomationRepository
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
        schedule_kind = payload["schedule_kind"]
        schedule_value = payload["schedule_value"]

        draft = AutomationJob(
            id=str(payload.get("id") or f"job-{uuid4().hex[:8]}"),
            name=str(payload["name"]),
            prompt=str(payload["prompt"]),
            schedule_kind=schedule_kind,
            schedule_value=str(schedule_value),
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
        runs = self._repository.list_runs()
        return {
            "scheduler_running": True,
            "job_count": len(self._repository.list_jobs()),
            "run_count": len(runs),
            "failed_runs_count": sum(1 for run in runs if run.status == "failed"),
            "last_tick_at": self._scheduler.last_tick_at,
            "future_hooks": {
                "openviking_archive": "deferred",
                "relationship_aware_routines": "deferred",
                "self_growth_suggestions": "deferred",
            },
        }


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
