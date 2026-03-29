import time
from datetime import UTC, datetime
from typing import Any, Protocol
from uuid import uuid4

from langgraph_sdk import get_sync_client

from nion.automation.delivery import AutomationDeliveryService
from nion.automation.models import AutomationDeliveryMode, AutomationExecutionOutput, AutomationJob, AutomationRun
from nion.automation.policies import build_automation_session_policy
from nion.automation.script_runner import run_packaged_script
from nion.client import NionClient
from nion.notebook.service import NotebookService

REGISTERED_PLUGIN_ACTIONS = {"echo.plugin"}


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
        if job.job_kind == "workflow":
            return self._execute_workflow(
                job,
                run_id=run_id,
                started_at=started_at,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )

        runtime_config = build_automation_runtime_config(
            job,
            run_id=run_id,
            isolated_thread_id=isolated_thread_id,
            trigger_event_name=trigger_event_name,
            trigger_event_payload=trigger_event_payload,
        )

        if job.action_kind == "script":
            execution_output = run_packaged_script(
                job,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
            execution_output.isolated_thread_id = isolated_thread_id
        elif job.action_kind == "plugin_action":
            execution_output = self._run_plugin_action(
                job,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
            execution_output.isolated_thread_id = isolated_thread_id
        elif job.action_kind in {"notify", "play_sound", "notebook_write"}:
            execution_output = self._run_builtin_action(
                job,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
            execution_output.isolated_thread_id = isolated_thread_id
        else:
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

    def _run_builtin_action(
        self,
        job: AutomationJob,
        *,
        trigger_event_name: str | None = None,
        trigger_event_payload: dict[str, Any] | None = None,
    ) -> AutomationExecutionOutput:
        if job.action_kind == "notify":
            title = str(job.action_spec.get("title") or job.name)
            body = str(job.action_spec.get("body") or job.prompt or "")
            summary = f"{title}: {body}".strip(": ")
            return AutomationExecutionOutput(response_text=summary)

        if job.action_kind == "play_sound":
            sound_name = str(
                job.action_spec.get("sound")
                or job.action_spec.get("filename")
                or "default-sound"
            )
            return AutomationExecutionOutput(response_text=f"Played sound action: {sound_name}")

        if job.action_kind == "notebook_write":
            directory = str(job.action_spec.get("directory") or "")
            title = str(job.action_spec.get("title") or job.name)
            body = str(job.action_spec.get("body") or job.prompt or "")
            if trigger_event_name:
                body = f"{body}\n\nTriggered by: {trigger_event_name}".strip()
            note = self._notebook_service.create_note(
                directory=directory,
                title=title,
                body=body,
            )
            return AutomationExecutionOutput(
                response_text=f"Created notebook note: {note.title}",
                artifacts=[note.absolute_path],
            )

        raise ValueError(f"Unsupported built-in action kind: {job.action_kind}")

    def _run_plugin_action(
        self,
        job: AutomationJob,
        *,
        trigger_event_name: str | None = None,
        trigger_event_payload: dict[str, Any] | None = None,
    ) -> AutomationExecutionOutput:
        plugin_id = str(job.action_spec.get("plugin_id") or "")
        if plugin_id not in REGISTERED_PLUGIN_ACTIONS:
            raise ValueError(f"Unknown plugin action: {plugin_id}")
        if plugin_id == "echo.plugin":
            message = str(job.action_spec.get("message") or "")
            if trigger_event_name:
                return AutomationExecutionOutput(response_text=f"{message} ({trigger_event_name})")
            return AutomationExecutionOutput(response_text=message)
        raise ValueError(f"Unsupported plugin action: {plugin_id}")

    def resume_workflow(
        self,
        job: AutomationJob,
        run: AutomationRun,
        *,
        resume_payload: dict[str, Any],
    ) -> AutomationRun:
        step_results = [dict(item) for item in run.step_results]
        current_step_id = run.current_step_id
        if not current_step_id:
            raise ValueError("Workflow run is not waiting on a step")

        resume_index = -1
        for step_result in step_results:
            if step_result.get("step_id") == current_step_id:
                step_result["status"] = "succeeded"
                step_result["resume_payload"] = dict(resume_payload)
                resume_index = next(
                    (index for index, step in enumerate(job.workflow_steps) if step.get("id") == current_step_id),
                    -1,
                )
                break

        if resume_index >= 0:
            continuation = self._continue_workflow_steps(
                job,
                start_index=resume_index + 1,
                step_results=step_results,
                run_id=run.id,
                started_at=run.started_at,
                trigger_event_name=run.trigger_event_name,
                trigger_event_payload=resume_payload,
            )
            if continuation is not None:
                return continuation

        return AutomationRun(
            id=run.id,
            job_id=job.id,
            started_at=run.started_at,
            finished_at=_utcnow(),
            status="succeeded",
            trigger_event_name=run.trigger_event_name,
            result_summary="Workflow completed",
            current_step_id=None,
            failed_step_id=None,
            step_results=step_results,
            output_artifacts=list(run.output_artifacts),
            delivery_results=list(run.delivery_results),
        )

    def _execute_workflow(
        self,
        job: AutomationJob,
        *,
        run_id: str,
        started_at: str,
        trigger_event_name: str | None = None,
        trigger_event_payload: dict[str, Any] | None = None,
    ) -> AutomationRun:
        return self._continue_workflow_steps(
            job,
            start_index=0,
            step_results=[],
            run_id=run_id,
            started_at=started_at,
            trigger_event_name=trigger_event_name,
            trigger_event_payload=trigger_event_payload,
        ) or AutomationRun(
            id=run_id,
            job_id=job.id,
            started_at=started_at,
            finished_at=_utcnow(),
            status="succeeded",
            trigger_event_name=trigger_event_name,
            result_summary="Workflow completed",
            current_step_id=None,
            failed_step_id=None,
            step_results=[],
            output_artifacts=[],
            delivery_results=[],
        )

    def _continue_workflow_steps(
        self,
        job: AutomationJob,
        *,
        start_index: int,
        step_results: list[dict[str, Any]],
        run_id: str,
        started_at: str,
        trigger_event_name: str | None = None,
        trigger_event_payload: dict[str, Any] | None = None,
    ) -> AutomationRun | None:
        for index in range(start_index, len(job.workflow_steps)):
            step = job.workflow_steps[index]
            step_id = str(step.get("id") or f"step-{len(step_results) + 1}")
            step_kind = str(step.get("kind") or "")
            step_config = dict(step.get("config") or {})
            retry_limit = int(step.get("retry_limit") or 0)

            if step_kind == "wait_for_user":
                step_results.append(
                    {
                        "step_id": step_id,
                        "kind": step_kind,
                        "status": "paused",
                        "attempts": 1,
                    }
                )
                return AutomationRun(
                    id=run_id,
                    job_id=job.id,
                    started_at=started_at,
                    finished_at=None,
                    status="paused",
                    trigger_event_name=trigger_event_name,
                    result_summary="Waiting for user",
                    current_step_id=step_id,
                    failed_step_id=None,
                    step_results=step_results,
                    output_artifacts=[],
                    delivery_results=[],
                )

            attempts = 0
            while True:
                attempts += 1
                try:
                    if step_kind == "delay":
                        time.sleep(float(step_config.get("seconds") or 0))
                        execution_output = AutomationExecutionOutput(response_text=f"Delayed {step_config.get('seconds', 0)}s")
                    else:
                        step_job = job.model_copy(
                            update={
                                "action_kind": step_kind,
                                "action_spec": step_config,
                            }
                        )
                        if step_kind == "script" and not step_job.package_dir:
                            step_job.package_dir = job.package_dir
                            step_job.package_manifest = job.package_manifest
                        execution_output = self._execute_step_action(
                            step_job,
                            trigger_event_name=trigger_event_name,
                            trigger_event_payload=trigger_event_payload,
                        )
                except Exception as exc:
                    if attempts <= retry_limit:
                        continue
                    step_results.append(
                        {
                            "step_id": step_id,
                            "kind": step_kind,
                            "status": "failed",
                            "attempts": attempts,
                            "error": str(exc),
                        }
                    )
                    return AutomationRun(
                        id=run_id,
                        job_id=job.id,
                        started_at=started_at,
                        finished_at=_utcnow(),
                        status="failed",
                        trigger_event_name=trigger_event_name,
                        result_summary=str(exc),
                        current_step_id=None,
                        failed_step_id=step_id,
                        step_results=step_results,
                        output_artifacts=[],
                        delivery_results=[],
                    )

                step_results.append(
                    {
                        "step_id": step_id,
                        "kind": step_kind,
                        "status": "succeeded",
                        "attempts": attempts,
                        "result_summary": execution_output.response_text,
                    }
                )
                break

        return AutomationRun(
            id=run_id,
            job_id=job.id,
            started_at=started_at,
            finished_at=_utcnow(),
            status="succeeded",
            trigger_event_name=trigger_event_name,
            result_summary="Workflow completed",
            current_step_id=None,
            failed_step_id=None,
            step_results=step_results,
            output_artifacts=[],
            delivery_results=[],
        )

    def _execute_step_action(
        self,
        job: AutomationJob,
        *,
        trigger_event_name: str | None = None,
        trigger_event_payload: dict[str, Any] | None = None,
    ) -> AutomationExecutionOutput:
        if job.action_kind == "script":
            return run_packaged_script(
                job,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
        if job.action_kind == "plugin_action":
            return self._run_plugin_action(
                job,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
        if job.action_kind == "agent_prompt":
            runtime_config = build_automation_runtime_config(
                job,
                run_id=f"workflow-step-{uuid4().hex[:8]}",
                isolated_thread_id=str(uuid4()),
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
            prompt = str(job.action_spec.get("prompt") or job.prompt)
            return self._runtime_runner.run(
                prompt=prompt,
                thread_id=runtime_config["thread_id"],
                context=runtime_config["context"],
                config=runtime_config["config"],
            )
        if job.action_kind in {"notify", "play_sound", "notebook_write"}:
            return self._run_builtin_action(
                job,
                trigger_event_name=trigger_event_name,
                trigger_event_payload=trigger_event_payload,
            )
        raise ValueError(f"Unsupported workflow step kind: {job.action_kind}")
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
