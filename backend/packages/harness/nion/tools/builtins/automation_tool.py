from typing import Any, Literal

from langchain.tools import ToolRuntime, tool
from langchain_core.messages import ToolMessage
from langgraph.types import Command
from langgraph.typing import ContextT

from nion.agents.thread_state import ThreadState
from nion.automation.models import (
    AutomationActionKind,
    AutomationDeliveryMode,
    AutomationJobKind,
    AutomationScheduleKind,
    AutomationTriggerKind,
)
from nion.automation.policies import automation_tool_enabled
from nion.automation.service import create_default_automation_service

_automation_tool_service = None


def set_automation_tool_service(service) -> None:
    global _automation_tool_service
    _automation_tool_service = service


def get_automation_tool_service(runtime: ToolRuntime[ContextT, ThreadState] | None = None):
    if runtime is not None:
        service = runtime.context.get("automation_tool_service") if runtime.context else None
        if service is not None:
            return service
    global _automation_tool_service
    if _automation_tool_service is None:
        _automation_tool_service = create_default_automation_service()
    return _automation_tool_service


@tool("automation", parse_docstring=True)
def automation_tool(
    runtime: ToolRuntime[ContextT, ThreadState],
    action: Literal["create", "draft", "list", "pause", "resume", "run", "remove"],
    job_id: str | None = None,
    name: str | None = None,
    prompt: str | None = None,
    job_kind: AutomationJobKind = "scheduled_task",
    schedule_kind: AutomationScheduleKind | None = None,
    schedule_value: str | None = None,
    trigger_kind: AutomationTriggerKind | None = None,
    trigger_spec: dict[str, Any] | None = None,
    action_kind: AutomationActionKind | None = None,
    action_spec: dict[str, Any] | None = None,
    workflow_steps: list[dict[str, Any]] | None = None,
    package_files: list[dict[str, Any]] | None = None,
    delivery_mode: AutomationDeliveryMode = "local",
    delivery_targets: list[dict[str, Any]] | None = None,
    skills: list[str] | None = None,
) -> dict[str, Any]:
    """Manage automation jobs through a single action-style tool.

    Use this tool to create, inspect, and operate automation jobs from the companion runtime.
    This tool is disabled during automation runs to prevent recursive scheduling.

    Args:
        action: One of create, list, pause, resume, run, or remove.
        job_id: Required for pause, resume, run, and remove.
        name: Job name for create.
        prompt: Job prompt for create.
        schedule_kind: Schedule kind for create.
        schedule_value: Schedule value for create.
        delivery_mode: Delivery mode for create.
        delivery_targets: Delivery targets for create.
        skills: Attached skills for create.
    """
    if not automation_tool_enabled(runtime.context):
        return {
            "ok": False,
            "code": "automation.recursive_call_blocked",
            "message": "Automation tool is unavailable during automation runs",
        }

    service = get_automation_tool_service(runtime)

    if action == "create":
        job = service.create_job(
            {
                "name": name,
                "prompt": prompt,
                "job_kind": job_kind,
                "schedule_kind": schedule_kind,
                "schedule_value": schedule_value,
                "trigger_kind": trigger_kind,
                "trigger_spec": trigger_spec or {},
                "action_kind": action_kind,
                "action_spec": action_spec or {},
                "workflow_steps": workflow_steps or [],
                "package_files": package_files or [],
                "delivery_mode": delivery_mode,
                "delivery_targets": delivery_targets or [],
                "skills": skills or [],
            }
        )
        return {"ok": True, "job": job.model_dump()}

    if action == "draft":
        draft = {
            "name": name,
            "prompt": prompt,
            "job_kind": job_kind,
            "schedule_kind": schedule_kind,
            "schedule_value": schedule_value,
            "trigger_kind": trigger_kind,
            "trigger_spec": trigger_spec or {},
            "action_kind": action_kind,
            "action_spec": action_spec or {},
            "workflow_steps": workflow_steps or [],
            "package_files": package_files or [],
            "delivery_mode": delivery_mode,
            "delivery_targets": delivery_targets or [],
            "skills": skills or [],
        }
        return Command(
            update={
                "messages": [
                    ToolMessage(
                        content="Prepared event task draft",
                        tool_call_id=runtime.tool_call_id,
                        name="automation",
                        additional_kwargs={
                            "element": "event_task_draft",
                            "draft": draft,
                        },
                    )
                ]
            }
        )

    if action == "list":
        return {"ok": True, "jobs": [job.model_dump() for job in service.list_jobs()]}

    if action == "pause":
        return {"ok": True, "job": service.pause_job(job_id).model_dump()}

    if action == "resume":
        return {"ok": True, "job": service.resume_job(job_id).model_dump()}

    if action == "run":
        return {"ok": True, "run": service.run_job(job_id).model_dump()}

    if action == "remove":
        return {"ok": True, "removed": service.delete_job(job_id)}

    return {"ok": False, "code": "automation.unsupported_action", "message": f"Unsupported action: {action}"}
