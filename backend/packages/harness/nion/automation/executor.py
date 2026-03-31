from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import uuid4

from langgraph_sdk import get_sync_client

from nion.automation.delivery import AutomationDeliveryService
from nion.automation.models import AutomationDeliveryMode, AutomationExecutionOutput, AutomationJob, AutomationRun
from nion.automation.policies import build_automation_session_policy
from nion.client import NionClient
from nion.notebook.service import NotebookService


class AutomationRuntimeRunner(Protocol):
    def run(self, *, prompt: str, thread_id: str, context: dict[str, Any], config: dict[str, Any]) -> AutomationExecutionOutput: ...


class LangGraphAutomationRunner:
    def __init__(self, *, langgraph_url: str, assistant_id: str = "lead_agent"):
        self.client = get_sync_client(url=langgraph_url)
        self._assistant_id = assistant_id

    def run(self, *, prompt: str, thread_id: str, context: dict[str, Any], config: dict[str, Any]) -> AutomationExecutionOutput:
        result = self.client.runs.wait(
            thread_id,
            self._assistant_id,
            input={"messages": [{"role": "human", "content": prompt}]},
            config=config,
            context=context,
            if_not_exists="create",
        )
        return AutomationExecutionOutput(
            response_text=_extract_response_text(result),
            artifacts=_extract_artifacts(result),
            isolated_thread_id=thread_id,
        )


class EmbeddedAutomationRunner:
    def __init__(self, *, client: NionClient):
        self.client = client

    def run(self, *, prompt: str, thread_id: str, context: dict[str, Any], config: dict[str, Any]) -> AutomationExecutionOutput:
        latest_values: dict[str, Any] | None = None

        for event in self.client.stream(
            prompt,
            thread_id=thread_id,
            model_name=context.get("model_name"),
            thinking_enabled=bool(context.get("thinking_enabled", True)),
            plan_mode=bool(context.get("is_plan_mode", False)),
            subagent_enabled=bool(context.get("subagent_enabled", False)),
            agent_name=context.get("agent_name"),
            recursion_limit=config.get("recursion_limit", 100),
            surface=context.get("surface", "automation"),
        ):
            if event.type == "values":
                latest_values = event.data

        latest_values = latest_values or {}
        result = {
            "messages": latest_values.get("messages", []),
        }
        return AutomationExecutionOutput(
            response_text=_extract_response_text(result),
            artifacts=list(latest_values.get("artifacts", [])),
            isolated_thread_id=thread_id,
        )


def build_automation_runtime_config(
    job: AutomationJob,
    *,
    run_id: str,
    isolated_thread_id: str,
    trigger_event_name: str | None = None,
    trigger_event_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    context = build_automation_session_policy(job.session_policy)
    context.update(
        {
            "thread_id": isolated_thread_id,
            "surface": "automation",
            "automation_job_id": job.id,
            "automation_run_id": run_id,
            "toolset_profile": job.toolset_profile,
            "attached_skills": list(job.skills),
        }
    )
    if trigger_event_name is not None:
        context["trigger_event_name"] = trigger_event_name
    if trigger_event_payload is not None:
        context["trigger_event_payload"] = trigger_event_payload
    return {
        "thread_id": isolated_thread_id,
        "context": context,
        "config": {
            "recursion_limit": 100,
        },
    }


class AutomationExecutor:
    def __init__(
        self,
        *,
        runtime_runner: AutomationRuntimeRunner,
        delivery_service: AutomationDeliveryService,
        notebook_service: NotebookService | None = None,
    ):
        self._runtime_runner = runtime_runner
        self._delivery_service = delivery_service
        self._notebook_service = notebook_service or NotebookService()

    def execute_job(
        self,
        job: AutomationJob,
        *,
        run_id: str,
        trigger_event_name: str | None = None,
        trigger_event_payload: dict[str, Any] | None = None,
    ) -> AutomationRun:
        started_at = _utcnow()
        isolated_thread_id = str(uuid4())

        runtime_config = build_automation_runtime_config(
            job,
            run_id=run_id,
            isolated_thread_id=isolated_thread_id,
            trigger_event_name=trigger_event_name,
            trigger_event_payload=trigger_event_payload,
        )

        execution_output = self._runtime_runner.run(
            prompt=job.prompt,
            thread_id=runtime_config["thread_id"],
            context=runtime_config["context"],
            config=runtime_config["config"],
        )
        if execution_output.isolated_thread_id is None:
            execution_output.isolated_thread_id = isolated_thread_id

        delivery_results = self._delivery_service.deliver(job, execution_output)
        finished_at = _utcnow()
        status = "failed" if _has_failed_delivery(delivery_results) else "succeeded"
        return AutomationRun(
            id=run_id,
            job_id=job.id,
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            trigger_event_name=trigger_event_name,
            result_summary=execution_output.response_text,
            output_artifacts=list(execution_output.artifacts),
            delivery_results=delivery_results,
        )
def _utcnow() -> str:
    return datetime.now(UTC).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def _has_failed_delivery(delivery_results: list[dict[str, AutomationDeliveryMode | str]]) -> bool:
    return any(result.get("status") in {"failed", "error", "unavailable"} for result in delivery_results)


def _extract_response_text(result: dict | list) -> str:
    messages = result if isinstance(result, list) else result.get("messages", [])
    for msg in reversed(messages):
        if not isinstance(msg, dict):
            continue
        if msg.get("type") == "human":
            break
        if msg.get("type") == "tool" and msg.get("name") == "ask_clarification":
            content = msg.get("content", "")
            if isinstance(content, str) and content:
                return content
        if msg.get("type") == "ai":
            content = msg.get("content", "")
            if isinstance(content, str) and content:
                return content
            if isinstance(content, list):
                parts = []
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        parts.append(block.get("text", ""))
                    elif isinstance(block, str):
                        parts.append(block)
                merged = "".join(parts)
                if merged:
                    return merged
    return ""


def _extract_artifacts(result: dict | list) -> list[str]:
    messages = result if isinstance(result, list) else result.get("messages", [])
    artifacts: list[str] = []
    for msg in reversed(messages):
        if not isinstance(msg, dict):
            continue
        if msg.get("type") == "human":
            break
        if msg.get("type") != "ai":
            continue
        for tool_call in msg.get("tool_calls", []):
            if isinstance(tool_call, dict) and tool_call.get("name") == "present_files":
                args = tool_call.get("args", {})
                filepaths = args.get("filepaths", [])
                if isinstance(filepaths, list):
                    artifacts.extend(path for path in filepaths if isinstance(path, str))
    return artifacts
