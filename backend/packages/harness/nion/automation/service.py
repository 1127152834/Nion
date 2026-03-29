import base64
import os
from collections.abc import Callable, Mapping
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

from nion.automation.delivery import AutomationDeliveryService
from nion.automation.event_dispatch import dispatch_automation_event
from nion.automation.executor import (
    REGISTERED_PLUGIN_ACTIONS,
    AutomationExecutor,
    EmbeddedAutomationRunner,
    LangGraphAutomationRunner,
)
from nion.automation.models import (
    AutomationApproval,
    AutomationAuditEvent,
    AutomationJob,
    AutomationRun,
    AutomationTemplate,
)
from nion.automation.packages import (
    create_hook_package,
    delete_hook_package,
    delete_hook_package_files,
    ensure_hook_package_dir,
    write_hook_package_files,
)
from nion.automation.policies import build_automation_session_policy
from nion.automation.repository import AutomationRepository
from nion.automation.schedule_presets import build_schedule_fields, infer_schedule_preset
from nion.automation.scheduler import AutomationScheduler, compute_next_run_at, format_automation_datetime
from nion.client import NionClient
from nion.config.app_config import get_app_config
from nion.config.automation_config import get_automation_config
from nion.config.paths import Paths, get_paths, resolve_path
from nion.threads.repository import ThreadRepository

SUPPORTED_TEMPLATE_MANIFEST_VERSION = "1"
SUPPORTED_TEMPLATE_JOB_KINDS = {"event_task", "workflow"}
SUPPORTED_WORKFLOW_STEP_KINDS = {
    "notify",
    "script",
    "agent_prompt",
    "play_sound",
    "delay",
    "wait_for_user",
}

DEFAULT_AUTOMATION_TEMPLATES = [
    {
        "id": "tpl-official-reply-finished",
        "name": "Reply finished reminder",
        "scope": "official",
        "manifest": {
            "manifest_version": "1",
            "job": {
                "name": "Reply finished reminder",
                "prompt": "Notify me when the assistant finishes a reply.",
                "job_kind": "event_task",
                "schedule_kind": "event",
                "schedule_value": "agent.run.completed",
                "schedule_preset": "event",
                "trigger_kind": "event",
                "trigger_spec": {"event_name": "agent.run.completed"},
                "action_kind": "notify",
                "action_spec": {},
                "delivery_mode": "local",
                "delivery_targets": [],
            },
            "package": {"files": []},
        },
        "files": {},
    },
    {
        "id": "tpl-official-reply-followup-workflow",
        "name": "Reply follow-up workflow",
        "scope": "official",
        "manifest": {
            "manifest_version": "1",
            "job": {
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
            },
            "package": {"files": []},
        },
        "files": {},
    },
]


class AutomationService:
    def __init__(
        self,
        *,
        repository: AutomationRepository,
        scheduler: AutomationScheduler,
        executor: AutomationExecutor | None = None,
        clock: Callable[[], datetime] | None = None,
        paths: Paths | None = None,
    ):
        self._repository = repository
        self._scheduler = scheduler
        self._executor = executor
        self._clock = clock or (lambda: datetime.now(UTC))
        self._paths = paths or get_paths()

    def list_jobs(self) -> list[AutomationJob]:
        return self._repository.list_jobs()

    def create_job(self, payload: Mapping[str, Any]) -> AutomationJob:
        now = self._clock()
        enabled = bool(payload.get("enabled", True))
        schedule_timezone = str(payload.get("schedule_timezone") or "UTC")
        job_kind = str(payload.get("job_kind") or "scheduled_task")
        trigger_kind = str(payload.get("trigger_kind") or ("event" if job_kind == "event_task" else "schedule"))
        schedule_preset = str(
            payload.get("schedule_preset") or ("event" if job_kind == "event_task" else infer_schedule_preset(payload.get("schedule_kind")))
        )
        schedule_metadata = self._coerce_schedule_metadata(payload.get("schedule_metadata"))
        schedule_kind = payload.get("schedule_kind")
        schedule_value = payload.get("schedule_value")
        trigger_spec = self._coerce_mapping(payload.get("trigger_spec"))
        action_kind = str(payload.get("action_kind") or "agent_prompt")
        action_spec = self._coerce_mapping(payload.get("action_spec"))
        workflow_steps = self._coerce_workflow_steps(payload.get("workflow_steps"))
        package_dir = payload.get("package_dir")
        package_manifest = self._coerce_mapping(payload.get("package_manifest"))
        package_files = self._coerce_package_files(payload.get("package_files"))
        if action_kind == "plugin_action":
            plugin_id = str(action_spec.get("plugin_id") or "")
            if plugin_id not in REGISTERED_PLUGIN_ACTIONS:
                raise ValueError(f"Unknown plugin action: {plugin_id}")

        if job_kind == "event_task":
            schedule_kind = schedule_kind or "event"
            schedule_value = str(schedule_value or trigger_spec.get("event_name") or "")
            schedule_timezone = schedule_timezone or "UTC"
            if not schedule_metadata:
                schedule_metadata = {"event_name": trigger_spec.get("event_name")}
        elif job_kind == "workflow":
            schedule_kind = schedule_kind or "event"
            schedule_value = str(schedule_value or trigger_spec.get("event_name") or "")
            schedule_timezone = schedule_timezone or "UTC"
            if not schedule_metadata:
                schedule_metadata = {"event_name": trigger_spec.get("event_name")}
        elif schedule_kind is None or schedule_value is None:
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
            prompt=str(payload.get("prompt") or ""),
            job_kind=job_kind,
            schedule_kind=schedule_kind,
            schedule_value=str(schedule_value),
            schedule_preset=schedule_preset,
            trigger_kind=trigger_kind,
            trigger_spec=trigger_spec,
            action_kind=action_kind,
            action_spec=action_spec,
            schedule_timezone=schedule_timezone,
            schedule_metadata=schedule_metadata,
            enabled=enabled,
            state=str(payload.get("state") or ("scheduled" if enabled else "paused")),
            delivery_mode=payload.get("delivery_mode") or "local",
            delivery_targets=list(payload.get("delivery_targets") or []),
            skills=list(payload.get("skills") or []),
            session_policy=build_automation_session_policy(payload.get("session_policy")),
            toolset_profile=str(payload.get("toolset_profile") or get_automation_config().default_toolset_profile),
            owner_id=_maybe_str(payload.get("owner_id")),
            visibility=str(payload.get("visibility") or "private"),
            approval_policy=self._coerce_mapping(payload.get("approval_policy")),
            package_dir=str(package_dir) if package_dir else None,
            package_manifest=package_manifest,
            workflow_steps=workflow_steps,
            next_run_at=payload.get("next_run_at"),
            created_at=format_automation_datetime(now),
            updated_at=format_automation_datetime(now),
        )

        if package_files:
            package = create_hook_package(
                hook_id=draft.id,
                package_files=package_files,
                paths=self._paths,
            )
            draft.package_dir = package["package_dir"]
            draft.package_manifest = package["package_manifest"]

        if draft.next_run_at is None and enabled and draft.trigger_kind == "schedule":
            draft.next_run_at = compute_next_run_at(draft, now=now)

        return self._repository.save_job(draft)

    def get_job(self, job_id: str) -> AutomationJob:
        job = self._repository.get_job(job_id)
        if job is None:
            raise KeyError(job_id)
        return job

    def update_job(self, job_id: str, payload: Mapping[str, Any]) -> AutomationJob:
        job = self.get_job(job_id)

        for field in [
            "name",
            "prompt",
            "job_kind",
            "schedule_kind",
            "schedule_value",
            "schedule_preset",
            "trigger_kind",
            "schedule_timezone",
            "enabled",
            "delivery_mode",
            "delivery_targets",
            "skills",
            "toolset_profile",
        ]:
            if field in payload and payload[field] is not None:
                setattr(job, field, payload[field])

        if "trigger_spec" in payload:
            job.trigger_spec = self._coerce_mapping(payload.get("trigger_spec"))
        if "action_kind" in payload and payload.get("action_kind") is not None:
            job.action_kind = str(payload["action_kind"])
        if "action_spec" in payload:
            job.action_spec = self._coerce_mapping(payload.get("action_spec"))
        if "workflow_steps" in payload:
            job.workflow_steps = self._coerce_workflow_steps(payload.get("workflow_steps"))
        if "schedule_metadata" in payload:
            job.schedule_metadata = self._coerce_schedule_metadata(payload.get("schedule_metadata"))
        if "session_policy" in payload:
            job.session_policy = build_automation_session_policy(payload.get("session_policy"))
        if "owner_id" in payload:
            job.owner_id = _maybe_str(payload.get("owner_id"))
        if "visibility" in payload and payload.get("visibility") is not None:
            job.visibility = str(payload.get("visibility"))
        if "approval_policy" in payload:
            job.approval_policy = self._coerce_mapping(payload.get("approval_policy"))

        package_files = self._coerce_package_files(payload.get("package_files"))
        delete_package_files = [
            str(item)
            for item in payload.get("delete_package_files", [])
            if isinstance(item, str)
        ]
        if package_files or delete_package_files:
            package_dir = ensure_hook_package_dir(job.id, paths=self._paths)
            if package_files:
                job.package_manifest = write_hook_package_files(
                    package_dir=package_dir,
                    package_files=package_files,
                )
            if delete_package_files:
                job.package_manifest = delete_hook_package_files(
                    package_dir=package_dir,
                    relative_paths=delete_package_files,
                )
            job.package_dir = str(package_dir)
            if not job.package_manifest.get("files"):
                delete_hook_package(package_dir, paths=self._paths)
                job.package_dir = None
                job.package_manifest = {"files": []}

        job.updated_at = format_automation_datetime(self._clock())
        if job.trigger_kind == "schedule":
            job.next_run_at = compute_next_run_at(job, now=self._clock()) if job.enabled else None
        else:
            job.next_run_at = None

        return self._repository.save_job(job)

    def pause_job(self, job_id: str) -> AutomationJob:
        return self._scheduler.pause_job(job_id)

    def resume_job(self, job_id: str, *, now: datetime | None = None) -> AutomationJob:
        return self._scheduler.resume_job(job_id, now=now or self._clock())

    def run_job(self, job_id: str) -> AutomationRun:
        if self._executor is None:
            raise RuntimeError("Automation executor is not configured")

        job = self.get_job(job_id)
        if bool(job.approval_policy.get("required")):
            approvals = [approval for approval in self._repository.list_approvals() if approval.job_id == job.id]
            latest = approvals[-1] if approvals else None
            if latest is None or latest.status != "approved":
                raise PermissionError("Approval is required before this automation can run")
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
        if run.status == "failed":
            dispatch_automation_event(
                "automation.run.failed",
                {
                    "job_id": job.id,
                    "run_id": run.id,
                    "surface": "automation",
                    "reason": run.result_summary,
                },
            )
        return run

    def handle_event(self, event_name: str, payload: Mapping[str, Any] | None = None) -> list[AutomationRun]:
        if self._executor is None:
            return []

        event_payload = dict(payload or {})
        matching_jobs = [
            job
            for job in self._repository.list_jobs()
            if job.enabled
            and job.job_kind in {"event_task", "workflow"}
            and job.trigger_kind == "event"
            and job.trigger_spec.get("event_name") == event_name
        ]

        runs: list[AutomationRun] = []
        for job in matching_jobs:
            run_id = f"run-{uuid4().hex[:8]}"
            try:
                run = self._executor.execute_job(
                    job,
                    run_id=run_id,
                    trigger_event_name=event_name,
                    trigger_event_payload=event_payload,
                )
            except Exception as exc:
                finished_at = self._clock()
                run = AutomationRun(
                    id=run_id,
                    job_id=job.id,
                    started_at=format_automation_datetime(finished_at),
                    finished_at=format_automation_datetime(finished_at),
                    status="failed",
                    trigger_event_name=event_name,
                    result_summary=str(exc),
                )

            self._repository.save_run(run)
            runs.append(run)
            if run.finished_at:
                finished_at = datetime.fromisoformat(run.finished_at.replace("Z", "+00:00")).astimezone(UTC)
                self._scheduler.mark_run_finished(job.id, run, finished_at=finished_at)

        return runs

    def handle_webhook_event(self, event_name: str, payload: Mapping[str, Any] | None = None) -> list[AutomationRun]:
        if self._executor is None:
            return []

        event_payload = dict(payload or {})
        matching_jobs = [
            job
            for job in self._repository.list_jobs()
            if job.enabled
            and job.job_kind in {"event_task", "workflow"}
            and job.trigger_kind == "webhook"
            and job.trigger_spec.get("event_name") == event_name
        ]

        runs: list[AutomationRun] = []
        for job in matching_jobs:
            run_id = f"run-{uuid4().hex[:8]}"
            run = self._executor.execute_job(
                job,
                run_id=run_id,
                trigger_event_name=event_name,
                trigger_event_payload=event_payload,
            )
            self._repository.save_run(run)
            runs.append(run)
        return runs

    def resume_workflow_run(self, job_id: str, run_id: str, resume_payload: Mapping[str, Any] | None = None) -> AutomationRun:
        if self._executor is None:
            raise RuntimeError("Automation executor is not configured")

        job = self.get_job(job_id)
        run = self._repository.get_run(run_id)
        if run is None or run.job_id != job_id:
            raise KeyError(run_id)
        if run.status != "paused":
            raise ValueError("Only paused workflow runs can be resumed")

        resumed = self._executor.resume_workflow(
            job,
            run,
            resume_payload=dict(resume_payload or {}),
        )
        self._repository.save_run(resumed)
        if resumed.finished_at:
            finished_at = datetime.fromisoformat(resumed.finished_at.replace("Z", "+00:00")).astimezone(UTC)
            self._scheduler.mark_run_finished(job.id, resumed, finished_at=finished_at)
        return resumed

    def export_job_package(self, job_id: str) -> dict[str, Any]:
        job = self.get_job(job_id)
        package_files: dict[str, str] = {}
        manifest = {
            "manifest_version": "1",
            "job": self._exportable_job_payload(job),
            "package": {
                "files": list(job.package_manifest.get("files", [])),
            },
        }
        if job.package_dir and job.package_manifest.get("files"):
            package_dir = Path(job.package_dir)
            for relative_path in job.package_manifest.get("files", []):
                file_path = package_dir / str(relative_path)
                if file_path.is_file():
                    try:
                        package_files[str(relative_path)] = file_path.read_text()
                    except UnicodeDecodeError:
                        package_files[str(relative_path)] = base64.b64encode(file_path.read_bytes()).decode("ascii")
        return {
            "manifest": manifest,
            "files": package_files,
        }

    def import_job_package(self, manifest: Mapping[str, Any], files: Mapping[str, Any] | None = None) -> AutomationJob:
        manifest_payload = dict(manifest)
        manifest_version = str(manifest_payload.get("manifest_version") or "")
        if manifest_version != SUPPORTED_TEMPLATE_MANIFEST_VERSION:
            raise ValueError("Unsupported manifest_version")

        job_payload = manifest_payload.get("job")
        if not isinstance(job_payload, Mapping):
            raise ValueError("Template manifest must include a job payload")
        job_kind = str(job_payload.get("job_kind") or "")
        if job_kind not in SUPPORTED_TEMPLATE_JOB_KINDS:
            raise ValueError("Unsupported job_kind in template manifest")
        if job_kind == "workflow":
            for step in job_payload.get("workflow_steps", []):
                if not isinstance(step, Mapping):
                    raise ValueError("Workflow step payload must be an object")
                step_kind = str(step.get("kind") or "")
                if step_kind not in SUPPORTED_WORKFLOW_STEP_KINDS:
                    raise ValueError(f"Unsupported workflow step kind: {step_kind}")

        package_payload = manifest_payload.get("package")
        package_files: list[dict[str, Any]] = []
        manifest_files = []
        if isinstance(package_payload, Mapping):
            manifest_files = list(package_payload.get("files", []))

        file_map = dict(files or {})
        for relative_path in manifest_files:
            if relative_path not in file_map:
                continue
            package_files.append(
                {
                    "path": str(relative_path),
                    "content": str(file_map[relative_path]),
                }
            )

        create_payload = dict(job_payload)
        create_payload.pop("id", None)
        create_payload.pop("created_at", None)
        create_payload.pop("updated_at", None)
        create_payload.pop("package_dir", None)
        create_payload.pop("package_manifest", None)
        create_payload["package_files"] = package_files
        return self.create_job(create_payload)

    def save_template(self, payload: Mapping[str, Any]) -> AutomationTemplate:
        template = AutomationTemplate(
            id=str(payload["id"]),
            name=str(payload["name"]),
            scope=str(payload["scope"]),
            manifest=dict(payload.get("manifest") or {}),
            files=dict(payload.get("files") or {}),
        )
        return self._repository.save_template(template)

    def list_templates(self) -> dict[str, list[AutomationTemplate]]:
        self._seed_default_templates()
        templates = self._repository.list_templates()
        return {
            "official": [template for template in templates if template.scope == "official"],
            "personal": [template for template in templates if template.scope == "personal"],
        }

    def get_template(self, template_id: str) -> AutomationTemplate:
        template = self._repository.get_template(template_id)
        if template is None:
            raise KeyError(template_id)
        return template

    def activate_template(self, template_id: str) -> AutomationJob:
        template = self.get_template(template_id)
        return self.import_job_package(template.manifest, template.files)

    def request_approval(self, job_id: str, *, actor_id: str, reason: str) -> AutomationApproval:
        job = self.get_job(job_id)
        requested_at = format_automation_datetime(self._clock())
        approval = AutomationApproval(
            id=f"approval-{uuid4().hex[:8]}",
            job_id=job.id,
            status="pending",
            requested_by=actor_id,
            reason=reason,
            requested_at=requested_at,
        )
        self._repository.save_approval(approval)
        self._repository.save_audit_event(
            AutomationAuditEvent(
                id=f"audit-{uuid4().hex[:8]}",
                job_id=job.id,
                action="approval.requested",
                actor_id=actor_id,
                created_at=requested_at,
                details={"reason": reason, "approval_id": approval.id},
            )
        )
        return approval

    def decide_approval(self, approval_id: str, *, actor_id: str, decision: str) -> AutomationApproval:
        approval = self._repository.get_approval(approval_id)
        if approval is None:
            raise KeyError(approval_id)
        approval.status = "approved" if decision == "approved" else "denied"
        approval.decided_by = actor_id
        decided_at_dt = self._clock() + timedelta(seconds=1)
        approval.decided_at = format_automation_datetime(decided_at_dt)
        self._repository.save_approval(approval)
        self._repository.save_audit_event(
            AutomationAuditEvent(
                id=f"audit-{uuid4().hex[:8]}",
                job_id=approval.job_id,
                action=f"approval.{approval.status}",
                actor_id=actor_id,
                created_at=approval.decided_at,
                details={"approval_id": approval.id},
            )
        )
        return approval

    def list_approvals(self) -> list[AutomationApproval]:
        return self._repository.list_approvals()

    def list_audit_events(self) -> list[AutomationAuditEvent]:
        return self._repository.list_audit_events()

    def _seed_default_templates(self) -> None:
        existing_official = self._repository.list_templates(scope="official")
        if existing_official:
            return
        for template in DEFAULT_AUTOMATION_TEMPLATES:
            self.save_template(template)

    def delete_job(self, job_id: str) -> bool:
        job = self._repository.get_job(job_id)
        self._repository.release_job_claim(job_id)
        deleted = self._repository.delete_job(job_id)
        if deleted and job is not None and job.package_dir:
            delete_hook_package(job.package_dir, paths=self._paths)
        return deleted

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

    @staticmethod
    def _coerce_mapping(raw_mapping: Any) -> dict[str, Any]:
        if isinstance(raw_mapping, Mapping):
            return dict(raw_mapping)
        return {}

    @staticmethod
    def _coerce_package_files(raw_package_files: Any) -> list[dict[str, Any]]:
        if not isinstance(raw_package_files, list):
            return []
        files: list[dict[str, Any]] = []
        for item in raw_package_files:
            if isinstance(item, Mapping):
                files.append(dict(item))
        return files

    @staticmethod
    def _coerce_workflow_steps(raw_steps: Any) -> list[dict[str, Any]]:
        if not isinstance(raw_steps, list):
            return []
        steps: list[dict[str, Any]] = []
        for item in raw_steps:
            if isinstance(item, Mapping):
                steps.append(dict(item))
        return steps

    @staticmethod
    def _exportable_job_payload(job: AutomationJob) -> dict[str, Any]:
        payload = job.model_dump()
        payload.pop("id", None)
        payload.pop("created_at", None)
        payload.pop("updated_at", None)
        payload.pop("package_dir", None)
        return payload


class LocalThreadStateClient:
    def __init__(self, repository: ThreadRepository | None = None):
        self._repository = repository or ThreadRepository()

    def update_state(self, thread_id: str, values: dict, *, as_node: str | None = None):
        del as_node
        self._repository.update_state(thread_id, values)


def create_default_automation_service(
    *,
    langgraph_url: str | None = None,
    channel_publisher: Any | None = None,
) -> AutomationService:
    config = get_automation_config()
    repository = AutomationRepository(resolve_path(config.storage_path))
    scheduler = AutomationScheduler(repository, lock_timeout_seconds=config.lock_timeout_seconds)
    if os.getenv("NION_DESKTOP_HELPER_MODE") == "1":
        runner = EmbeddedAutomationRunner(client=NionClient())
        thread_client = LocalThreadStateClient()
    else:
        runner = LangGraphAutomationRunner(langgraph_url=langgraph_url or _resolve_langgraph_url_from_config())
        thread_client = runner.client.threads
    delivery_service = AutomationDeliveryService(
        thread_client=thread_client,
        channel_publisher=channel_publisher,
    )
    executor = AutomationExecutor(runtime_runner=runner, delivery_service=delivery_service)
    return AutomationService(
        repository=repository,
        scheduler=scheduler,
        executor=executor,
        paths=get_paths(),
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
