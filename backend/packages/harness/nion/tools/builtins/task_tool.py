"""Task tool for delegating work to subagents."""

import logging
import time
import uuid
from dataclasses import replace
from typing import Annotated, Literal

from langchain.tools import InjectedToolCallId, ToolRuntime, tool
from langgraph.config import get_stream_writer
from langgraph.typing import ContextT

from nion.agents.lead_agent.prompt import get_skills_prompt_section
from nion.agents.thread_state import ThreadState
from nion.config.paths import get_paths
from nion.subagents import SubagentExecutor, get_subagent_config
from nion.subagents.executor import SubagentStatus, cleanup_background_task, get_background_task_result
from nion.telemetry.logger import make_event
from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore

logger = logging.getLogger(__name__)


def _telemetry_store() -> TelemetryStore:
    return TelemetryStore(get_paths().telemetry_db_file)


def _task_details(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
    status: str,
    poll_count: int = 0,
    ai_message_count: int = 0,
    error: str | None = None,
) -> dict[str, str | int | None]:
    return {
        "task_id": task_id,
        "thread_id": thread_id,
        "description": description,
        "subagent_type": subagent_type,
        "trace_id": trace_id,
        "status": status,
        "poll_count": poll_count,
        "ai_message_count": ai_message_count,
        "error": error,
    }


def _record_task_state(
    *,
    event_type: str,
    level: Literal["info", "warning", "error"],
    message: str,
    snapshot_status: Literal["healthy", "degraded", "error"],
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
    status: str,
    poll_count: int = 0,
    ai_message_count: int = 0,
    error: str | None = None,
) -> None:
    details = _task_details(
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status=status,
        poll_count=poll_count,
        ai_message_count=ai_message_count,
        error=error,
    )
    store = _telemetry_store()
    store.record_event(
        make_event(
            category="tool",
            level=level,
            event_type=event_type,
            actor="agent",
            message=message,
            thread_id=thread_id,
            run_id=task_id,
            tool_name="task",
            details=details,
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id=task_id,
            status=snapshot_status,
            summary=message,
            details=details,
        )
    )


def _record_task_requested(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
) -> None:
    _record_task_state(
        event_type="task_delegation_requested",
        level="info",
        message=f"Delegated task '{description}' requested",
        snapshot_status="degraded",
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status="requested",
    )


def _record_task_started(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
) -> None:
    _record_task_state(
        event_type="task_delegation_started",
        level="info",
        message=f"Delegated task '{description}' started",
        snapshot_status="degraded",
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status="started",
    )


def _record_task_running(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
    poll_count: int,
    ai_message_count: int,
) -> None:
    _record_task_state(
        event_type="task_delegation_running",
        level="info",
        message=f"Delegated task '{description}' is running",
        snapshot_status="degraded",
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status="running",
        poll_count=poll_count,
        ai_message_count=ai_message_count,
    )


def _record_task_completed(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
    poll_count: int,
    ai_message_count: int,
) -> None:
    _record_task_state(
        event_type="task_delegation_completed",
        level="info",
        message=f"Delegated task '{description}' completed",
        snapshot_status="healthy",
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status="completed",
        poll_count=poll_count,
        ai_message_count=ai_message_count,
    )


def _record_task_failure(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
    error: str,
    poll_count: int = 0,
    ai_message_count: int = 0,
) -> None:
    _record_task_state(
        event_type="task_delegation_failed",
        level="error",
        message=f"Delegated task '{description}' failed",
        snapshot_status="error",
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status="failed",
        poll_count=poll_count,
        ai_message_count=ai_message_count,
        error=error,
    )


def _record_task_timed_out(
    *,
    task_id: str,
    thread_id: str | None,
    description: str,
    subagent_type: str,
    trace_id: str,
    error: str,
    poll_count: int = 0,
    ai_message_count: int = 0,
) -> None:
    _record_task_state(
        event_type="task_delegation_timed_out",
        level="warning",
        message=f"Delegated task '{description}' timed out",
        snapshot_status="error",
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
        status="timed_out",
        poll_count=poll_count,
        ai_message_count=ai_message_count,
        error=error,
    )


@tool("task", parse_docstring=True)
def task_tool(
    runtime: ToolRuntime[ContextT, ThreadState],
    description: str,
    prompt: str,
    subagent_type: Literal["general-purpose", "bash"],
    tool_call_id: Annotated[str, InjectedToolCallId],
    max_turns: int | None = None,
) -> str:
    """Delegate a task to a specialized subagent that runs in its own context.

    Subagents help you:
    - Preserve context by keeping exploration and implementation separate
    - Handle complex multi-step tasks autonomously
    - Execute commands or operations in isolated contexts

    Available subagent types:
    - **general-purpose**: A capable agent for complex, multi-step tasks that require
      both exploration and action. Use when the task requires complex reasoning,
      multiple dependent steps, or would benefit from isolated context.
    - **bash**: Command execution specialist for running bash commands. Use for
      git operations, build processes, or when command output would be verbose.

    When to use this tool:
    - Complex tasks requiring multiple steps or tools
    - Tasks that produce verbose output
    - When you want to isolate context from the main conversation
    - Parallel research or exploration tasks

    When NOT to use this tool:
    - Simple, single-step operations (use tools directly)
    - Tasks requiring user interaction or clarification

    Args:
        description: A short (3-5 word) description of the task for logging/display. ALWAYS PROVIDE THIS PARAMETER FIRST.
        prompt: The task description for the subagent. Be specific and clear about what needs to be done. ALWAYS PROVIDE THIS PARAMETER SECOND.
        subagent_type: The type of subagent to use. ALWAYS PROVIDE THIS PARAMETER THIRD.
        max_turns: Optional maximum number of agent turns. Defaults to subagent's configured max.
    """
    # Get subagent configuration
    config = get_subagent_config(subagent_type)
    if config is None:
        return f"Error: Unknown subagent type '{subagent_type}'. Available: general-purpose, bash"

    # Build config overrides
    overrides: dict = {}

    skills_section = get_skills_prompt_section()
    if skills_section:
        overrides["system_prompt"] = config.system_prompt + "\n\n" + skills_section

    if max_turns is not None:
        overrides["max_turns"] = max_turns

    if overrides:
        config = replace(config, **overrides)

    # Extract parent context from runtime
    sandbox_state = None
    thread_data = None
    thread_id = None
    parent_model = None
    surface = "workspace"
    trace_id = None

    if runtime is not None:
        sandbox_state = runtime.state.get("sandbox")
        thread_data = runtime.state.get("thread_data")
        runtime_context = runtime.context or {}
        thread_id = runtime_context.get("thread_id")
        surface = runtime_context.get("surface", "workspace")

        # Try to get parent model from configurable
        metadata = runtime.config.get("metadata", {})
        parent_model = metadata.get("model_name")

        # Get or generate trace_id for distributed tracing
        trace_id = metadata.get("trace_id") or str(uuid.uuid4())[:8]

    if trace_id is None:
        trace_id = str(uuid.uuid4())[:8]

    task_id = tool_call_id
    _record_task_requested(
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
    )

    # Get available tools (excluding task tool to prevent nesting)
    # Lazy import to avoid circular dependency
    from nion.tools import get_available_tools

    # Subagents should not have subagent tools enabled (prevent recursive nesting)
    tools = get_available_tools(
        model_name=parent_model,
        subagent_enabled=False,
        surface=surface,
    )

    # Create executor
    executor = SubagentExecutor(
        config=config,
        tools=tools,
        parent_model=parent_model,
        sandbox_state=sandbox_state,
        thread_data=thread_data,
        thread_id=thread_id,
        surface=surface,
        trace_id=trace_id,
    )

    # Start background execution (always async to prevent blocking)
    # Use tool_call_id as task_id for better traceability
    task_id = executor.execute_async(prompt, task_id=task_id)
    _record_task_started(
        task_id=task_id,
        thread_id=thread_id,
        description=description,
        subagent_type=subagent_type,
        trace_id=trace_id,
    )

    # Poll for task completion in backend (removes need for LLM to poll)
    poll_count = 0
    last_status = None
    last_message_count = 0  # Track how many AI messages we've already sent
    # Polling timeout: execution timeout + 60s buffer, checked every 5s
    max_poll_count = (config.timeout_seconds + 60) // 5

    logger.info(f"[trace={trace_id}] Started background task {task_id} (subagent={subagent_type}, timeout={config.timeout_seconds}s, polling_limit={max_poll_count} polls)")

    writer = get_stream_writer()
    # Send Task Started message'
    writer({"type": "task_started", "task_id": task_id, "description": description})

    while True:
        result = get_background_task_result(task_id)

        if result is None:
            logger.error(f"[trace={trace_id}] Task {task_id} not found in background tasks")
            _record_task_failure(
                task_id=task_id,
                thread_id=thread_id,
                description=description,
                subagent_type=subagent_type,
                trace_id=trace_id,
                error="Task disappeared from background tasks",
                poll_count=poll_count,
                ai_message_count=last_message_count,
            )
            writer({"type": "task_failed", "task_id": task_id, "error": "Task disappeared from background tasks"})
            cleanup_background_task(task_id)
            return f"Error: Task {task_id} disappeared from background tasks"

        # Log status changes for debugging
        if result.status != last_status:
            logger.info(f"[trace={trace_id}] Task {task_id} status: {result.status.value}")
            last_status = result.status

        # Check for new AI messages and send task_running events
        current_message_count = len(result.ai_messages)
        if current_message_count > last_message_count:
            # Send task_running event for each new message
            for i in range(last_message_count, current_message_count):
                message = result.ai_messages[i]
                writer(
                    {
                        "type": "task_running",
                        "task_id": task_id,
                        "message": message,
                        "message_index": i + 1,  # 1-based index for display
                        "total_messages": current_message_count,
                    }
                )
                logger.info(f"[trace={trace_id}] Task {task_id} sent message #{i + 1}/{current_message_count}")
            last_message_count = current_message_count
            _record_task_running(
                task_id=task_id,
                thread_id=thread_id,
                description=description,
                subagent_type=subagent_type,
                trace_id=trace_id,
                poll_count=poll_count,
                ai_message_count=current_message_count,
            )

        # Check if task completed, failed, or timed out
        if result.status == SubagentStatus.COMPLETED:
            _record_task_completed(
                task_id=task_id,
                thread_id=thread_id,
                description=description,
                subagent_type=subagent_type,
                trace_id=trace_id,
                poll_count=poll_count,
                ai_message_count=current_message_count,
            )
            writer({"type": "task_completed", "task_id": task_id, "result": result.result})
            logger.info(f"[trace={trace_id}] Task {task_id} completed after {poll_count} polls")
            cleanup_background_task(task_id)
            return f"Task Succeeded. Result: {result.result}"
        elif result.status == SubagentStatus.FAILED:
            _record_task_failure(
                task_id=task_id,
                thread_id=thread_id,
                description=description,
                subagent_type=subagent_type,
                trace_id=trace_id,
                error=result.error or "Unknown task failure",
                poll_count=poll_count,
                ai_message_count=current_message_count,
            )
            writer({"type": "task_failed", "task_id": task_id, "error": result.error})
            logger.error(f"[trace={trace_id}] Task {task_id} failed: {result.error}")
            cleanup_background_task(task_id)
            return f"Task failed. Error: {result.error}"
        elif result.status == SubagentStatus.TIMED_OUT:
            _record_task_timed_out(
                task_id=task_id,
                thread_id=thread_id,
                description=description,
                subagent_type=subagent_type,
                trace_id=trace_id,
                error=result.error or "Task timed out",
                poll_count=poll_count,
                ai_message_count=current_message_count,
            )
            writer({"type": "task_timed_out", "task_id": task_id, "error": result.error})
            logger.warning(f"[trace={trace_id}] Task {task_id} timed out: {result.error}")
            cleanup_background_task(task_id)
            return f"Task timed out. Error: {result.error}"

        # Still running, wait before next poll
        time.sleep(5)  # Poll every 5 seconds
        poll_count += 1

        # Polling timeout as a safety net (in case thread pool timeout doesn't work)
        # Set to execution timeout + 60s buffer, in 5s poll intervals
        # This catches edge cases where the background task gets stuck
        # Note: We don't call cleanup_background_task here because the task may
        # still be running in the background. The cleanup will happen when the
        # executor completes and sets a terminal status.
        if poll_count > max_poll_count:
            timeout_minutes = config.timeout_seconds // 60
            logger.error(f"[trace={trace_id}] Task {task_id} polling timed out after {poll_count} polls (should have been caught by thread pool timeout)")
            _record_task_timed_out(
                task_id=task_id,
                thread_id=thread_id,
                description=description,
                subagent_type=subagent_type,
                trace_id=trace_id,
                error=f"Task polling timed out after {timeout_minutes} minutes. Status: {result.status.value}",
                poll_count=poll_count,
                ai_message_count=last_message_count,
            )
            writer({"type": "task_timed_out", "task_id": task_id})
            return f"Task polling timed out after {timeout_minutes} minutes. This may indicate the background task is stuck. Status: {result.status.value}"
