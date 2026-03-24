from typing import Any, Literal

from langchain.tools import ToolRuntime, tool
from langgraph.typing import ContextT

from nion.agents.thread_state import ThreadState
from nion.automation.models import AutomationDeliveryMode, AutomationScheduleKind
from nion.automation.policies import automation_tool_enabled
from nion.automation.service import create_default_automation_service

_automation_tool_service = None


def set_automation_tool_service(service) -> None:
    global _automation_tool_service
    _automation_tool_service = service


def get_automation_tool_service(runtime: ToolRuntime[ContextT, ThreadState] | None = None):
    if runtime is not None:
        service = runtime.context.get("automation_tool_service")
        if service is not None:
            return service
    global _automation_tool_service
    if _automation_tool_service is None:
        _automation_tool_service = create_default_automation_service()
    return _automation_tool_service


@tool("automation", parse_docstring=True)
def automation_tool(
    runtime: ToolRuntime[ContextT, ThreadState],
    action: Literal["create", "list", "pause", "resume", "run", "remove"],
    job_id: str | None = None,
    name: str | None = None,
    prompt: str | None = None,
    schedule_kind: AutomationScheduleKind | None = None,
    schedule_value: str | None = None,
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
                "schedule_kind": schedule_kind,
                "schedule_value": schedule_value,
                "delivery_mode": delivery_mode,
                "delivery_targets": delivery_targets or [],
                "skills": skills or [],
            }
        )
        return {"ok": True, "job": job.model_dump()}

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
