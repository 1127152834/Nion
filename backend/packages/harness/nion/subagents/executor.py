"""Subagent execution engine."""

import asyncio
import logging
import threading
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeoutError
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any

from langchain.agents import create_agent
from langchain.tools import BaseTool
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.runnables import RunnableConfig

from nion.agents.thread_state import SandboxState, ThreadDataState, ThreadState
from nion.config.paths import get_paths
from nion.models import create_chat_model
from nion.subagents.config import SubagentConfig
from nion.telemetry.logger import make_event
from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore
from nion.telemetry.token_source import aiter_with_token_source

logger = logging.getLogger(__name__)


class SubagentStatus(Enum):
    """Status of a subagent execution."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


@dataclass
class SubagentResult:
    """Result of a subagent execution.

    Attributes:
        task_id: Unique identifier for this execution.
        trace_id: Trace ID for distributed tracing (links parent and subagent logs).
        status: Current status of the execution.
        result: The final result message (if completed).
        error: Error message (if failed).
        started_at: When execution started.
        completed_at: When execution completed.
        ai_messages: List of complete AI messages (as dicts) generated during execution.
    """

    task_id: str
    trace_id: str
    status: SubagentStatus
    result: str | None = None
    error: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    ai_messages: list[dict[str, Any]] | None = None

    def __post_init__(self):
        """Initialize mutable defaults."""
        if self.ai_messages is None:
            self.ai_messages = []


# Global storage for background task results
_background_tasks: dict[str, SubagentResult] = {}
_background_tasks_lock = threading.Lock()

# Thread pool for background task scheduling and orchestration
_scheduler_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="subagent-scheduler-")

# Thread pool for actual subagent execution (with timeout support)
# Larger pool to avoid blocking when scheduler submits execution tasks
_execution_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="subagent-exec-")

# Dedicated pool for sync execute() calls made from an already-running event loop.
_isolated_loop_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="subagent-isolated-")


def _telemetry_store() -> TelemetryStore:
    return TelemetryStore(get_paths().telemetry_db_file)


def _duration_ms(started_at: datetime | None, completed_at: datetime | None = None) -> int | None:
    if started_at is None:
        return None
    end = completed_at or datetime.now()
    return max(int((end - started_at).total_seconds() * 1000), 0)


def _subagent_details(
    *,
    task_id: str | None,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    status: str,
    ai_message_count: int = 0,
    timeout_seconds: int | None = None,
    error: str | None = None,
    duration_ms: int | None = None,
    tool_count: int | None = None,
) -> dict[str, str | int | None]:
    return {
        "task_id": task_id,
        "thread_id": thread_id,
        "subagent_name": subagent_name,
        "trace_id": trace_id,
        "status": status,
        "ai_message_count": ai_message_count,
        "timeout_seconds": timeout_seconds,
        "error": error,
        "duration_ms": duration_ms,
        "tool_count": tool_count,
    }


def _record_subagent_state(
    *,
    event_type: str,
    level: str,
    message: str,
    subagent_name: str,
    trace_id: str,
    status: str,
    task_id: str | None = None,
    thread_id: str | None = None,
    ai_message_count: int = 0,
    timeout_seconds: int | None = None,
    error: str | None = None,
    duration_ms: int | None = None,
    tool_count: int | None = None,
) -> None:
    details = _subagent_details(
        task_id=task_id,
        thread_id=thread_id,
        subagent_name=subagent_name,
        trace_id=trace_id,
        status=status,
        ai_message_count=ai_message_count,
        timeout_seconds=timeout_seconds,
        error=error,
        duration_ms=duration_ms,
        tool_count=tool_count,
    )
    store = _telemetry_store()
    store.record_event(
        make_event(
            category="agent",
            level=level,  # type: ignore[arg-type]
            event_type=event_type,
            actor="agent",
            message=message,
            thread_id=thread_id,
            run_id=task_id,
            details=details,
            duration_ms=duration_ms,
        )
    )


def _upsert_task_snapshot(
    *,
    task_id: str,
    message: str,
    snapshot_status: str,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    status: str,
    ai_message_count: int = 0,
    timeout_seconds: int | None = None,
    error: str | None = None,
    duration_ms: int | None = None,
) -> None:
    _telemetry_store().upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id=task_id,
            status=snapshot_status,  # type: ignore[arg-type]
            summary=message,
            details=_subagent_details(
                task_id=task_id,
                thread_id=thread_id,
                subagent_name=subagent_name,
                trace_id=trace_id,
                status=status,
                ai_message_count=ai_message_count,
                timeout_seconds=timeout_seconds,
                error=error,
                duration_ms=duration_ms,
            ),
        )
    )


def _record_subagent_initialized(
    *,
    subagent_name: str,
    thread_id: str | None,
    trace_id: str,
    tool_count: int,
) -> None:
    _record_subagent_state(
        event_type="subagent_executor_initialized",
        level="info",
        message=f"Subagent '{subagent_name}' initialized",
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="initialized",
        thread_id=thread_id,
        ai_message_count=0,
        timeout_seconds=None,
        duration_ms=None,
        tool_count=tool_count,
    )


def _record_subagent_started(
    *,
    task_id: str,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    timeout_seconds: int,
) -> None:
    _record_subagent_state(
        event_type="subagent_execution_started",
        level="info",
        message=f"Subagent '{subagent_name}' started",
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="running",
        task_id=task_id,
        thread_id=thread_id,
        timeout_seconds=timeout_seconds,
    )
    _upsert_task_snapshot(
        task_id=task_id,
        message=f"Subagent '{subagent_name}' started",
        snapshot_status="degraded",
        thread_id=thread_id,
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="running",
        timeout_seconds=timeout_seconds,
    )


def _record_subagent_ai_message(
    *,
    task_id: str,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    ai_message_count: int,
) -> None:
    _record_subagent_state(
        event_type="subagent_ai_message_captured",
        level="info",
        message=f"Subagent '{subagent_name}' produced message #{ai_message_count}",
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="running",
        task_id=task_id,
        thread_id=thread_id,
        ai_message_count=ai_message_count,
    )
    _upsert_task_snapshot(
        task_id=task_id,
        message=f"Subagent '{subagent_name}' produced message #{ai_message_count}",
        snapshot_status="degraded",
        thread_id=thread_id,
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="running",
        ai_message_count=ai_message_count,
    )


def _record_subagent_completed(
    *,
    task_id: str,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    ai_message_count: int,
    duration_ms: int | None,
) -> None:
    _record_subagent_state(
        event_type="subagent_execution_completed",
        level="info",
        message=f"Subagent '{subagent_name}' completed",
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="completed",
        task_id=task_id,
        thread_id=thread_id,
        ai_message_count=ai_message_count,
        duration_ms=duration_ms,
    )
    _upsert_task_snapshot(
        task_id=task_id,
        message=f"Subagent '{subagent_name}' completed",
        snapshot_status="healthy",
        thread_id=thread_id,
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="completed",
        ai_message_count=ai_message_count,
        duration_ms=duration_ms,
    )


def _record_subagent_failed(
    *,
    task_id: str,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    error: str,
    ai_message_count: int = 0,
    duration_ms: int | None = None,
) -> None:
    _record_subagent_state(
        event_type="subagent_execution_failed",
        level="error",
        message=f"Subagent '{subagent_name}' failed",
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="failed",
        task_id=task_id,
        thread_id=thread_id,
        ai_message_count=ai_message_count,
        error=error,
        duration_ms=duration_ms,
    )
    _upsert_task_snapshot(
        task_id=task_id,
        message=f"Subagent '{subagent_name}' failed",
        snapshot_status="error",
        thread_id=thread_id,
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="failed",
        ai_message_count=ai_message_count,
        error=error,
        duration_ms=duration_ms,
    )


def _record_subagent_timeout(
    *,
    task_id: str,
    thread_id: str | None,
    subagent_name: str,
    trace_id: str,
    timeout_seconds: int,
    ai_message_count: int = 0,
    duration_ms: int | None = None,
) -> None:
    _record_subagent_state(
        event_type="subagent_execution_timed_out",
        level="warning",
        message=f"Subagent '{subagent_name}' timed out after {timeout_seconds}s",
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="timed_out",
        task_id=task_id,
        thread_id=thread_id,
        ai_message_count=ai_message_count,
        timeout_seconds=timeout_seconds,
        duration_ms=duration_ms,
        error=f"Execution timed out after {timeout_seconds} seconds",
    )
    _upsert_task_snapshot(
        task_id=task_id,
        message=f"Subagent '{subagent_name}' timed out after {timeout_seconds}s",
        snapshot_status="error",
        thread_id=thread_id,
        subagent_name=subagent_name,
        trace_id=trace_id,
        status="timed_out",
        ai_message_count=ai_message_count,
        timeout_seconds=timeout_seconds,
        error=f"Execution timed out after {timeout_seconds} seconds",
        duration_ms=duration_ms,
    )


def _filter_tools(
    all_tools: list[BaseTool],
    allowed: list[str] | None,
    disallowed: list[str] | None,
) -> list[BaseTool]:
    """Filter tools based on subagent configuration.

    Args:
        all_tools: List of all available tools.
        allowed: Optional allowlist of tool names. If provided, only these tools are included.
        disallowed: Optional denylist of tool names. These tools are always excluded.

    Returns:
        Filtered list of tools.
    """
    filtered = all_tools

    # Apply allowlist if specified
    if allowed is not None:
        allowed_set = set(allowed)
        filtered = [t for t in filtered if t.name in allowed_set]

    # Apply denylist
    if disallowed is not None:
        disallowed_set = set(disallowed)
        filtered = [t for t in filtered if t.name not in disallowed_set]

    return filtered


def _get_model_name(config: SubagentConfig, parent_model: str | None) -> str | None:
    """Resolve the model name for a subagent.

    Args:
        config: Subagent configuration.
        parent_model: The parent agent's model name.

    Returns:
        Model name to use, or None to use default.
    """
    if config.model == "inherit":
        return parent_model
    return config.model


class SubagentExecutor:
    """Executor for running subagents."""

    def __init__(
        self,
        config: SubagentConfig,
        tools: list[BaseTool],
        parent_model: str | None = None,
        sandbox_state: SandboxState | None = None,
        thread_data: ThreadDataState | None = None,
        thread_id: str | None = None,
        surface: str = "workspace",
        execution_mode: str | None = None,
        host_workdir: str | None = None,
        trace_id: str | None = None,
        active_skill: dict[str, Any] | None = None,
    ):
        """Initialize the executor.

        Args:
            config: Subagent configuration.
            tools: List of all available tools (will be filtered).
            parent_model: The parent agent's model name for inheritance.
            sandbox_state: Sandbox state from parent agent.
            thread_data: Thread data from parent agent.
            thread_id: Thread ID for sandbox operations.
            surface: Runtime surface inherited from parent agent.
            trace_id: Trace ID from parent for distributed tracing.
        """
        self.config = config
        self.parent_model = parent_model
        self.sandbox_state = sandbox_state
        self.thread_data = thread_data
        self.thread_id = thread_id
        self.surface = surface
        self.execution_mode = execution_mode
        self.host_workdir = host_workdir
        self.active_skill = active_skill
        # Generate trace_id if not provided (for top-level calls)
        self.trace_id = trace_id or str(uuid.uuid4())[:8]

        # Filter tools based on config
        self.tools = _filter_tools(
            tools,
            config.tools,
            config.disallowed_tools,
        )

        logger.info(f"[trace={self.trace_id}] SubagentExecutor initialized: {config.name} with {len(self.tools)} tools")
        _record_subagent_initialized(
            subagent_name=config.name,
            thread_id=self.thread_id,
            trace_id=self.trace_id,
            tool_count=len(self.tools),
        )

    def _create_agent(self):
        """Create the agent instance."""
        model_name = _get_model_name(self.config, self.parent_model)
        model_kwargs: dict[str, Any] = {}
        active_skill = self.active_skill if isinstance(self.active_skill, dict) else None
        is_fork_skill = active_skill is not None and active_skill.get("context") == "fork"
        if is_fork_skill:
            skill_model = active_skill.get("model")
            if isinstance(skill_model, str) and skill_model.strip():
                model_name = skill_model.strip()
            skill_effort = active_skill.get("effort")
            if isinstance(skill_effort, str) and skill_effort.strip():
                model_kwargs["reasoning_effort"] = skill_effort.strip()
        model = create_chat_model(name=model_name, thinking_enabled=False, **model_kwargs)

        from nion.agents.middlewares.tool_error_handling_middleware import build_subagent_runtime_middlewares

        # Reuse shared middleware composition with lead agent.
        middlewares = build_subagent_runtime_middlewares(surface=self.surface, lazy_init=True)

        system_prompt = self.config.system_prompt
        if is_fork_skill:
            activation_content = active_skill.get("activation_content")
            if isinstance(activation_content, str) and activation_content.strip():
                system_prompt = f"{system_prompt}\n\n<forked_skill_activation>\n{activation_content.strip()}\n</forked_skill_activation>"

        return create_agent(
            model=model,
            tools=self.tools,
            middleware=middlewares,
            system_prompt=system_prompt,
            state_schema=ThreadState,
        )

    def _build_initial_state(self, task: str) -> dict[str, Any]:
        """Build the initial state for agent execution.

        Args:
            task: The task description.

        Returns:
            Initial state dictionary.
        """
        state: dict[str, Any] = {
            "messages": [HumanMessage(content=task)],
        }

        # Pass through sandbox and thread data from parent
        if self.sandbox_state is not None:
            state["sandbox"] = self.sandbox_state
        if self.thread_data is not None:
            state["thread_data"] = self.thread_data
        if self.active_skill is not None:
            state["active_skill"] = self.active_skill

        return state

    async def _aexecute(self, task: str, result_holder: SubagentResult | None = None) -> SubagentResult:
        """Execute a task asynchronously.

        Args:
            task: The task description for the subagent.
            result_holder: Optional pre-created result object to update during execution.

        Returns:
            SubagentResult with the execution result.
        """
        if result_holder is not None:
            # Use the provided result holder (for async execution with real-time updates)
            result = result_holder
        else:
            # Create a new result for synchronous execution
            task_id = str(uuid.uuid4())[:8]
            result = SubagentResult(
                task_id=task_id,
                trace_id=self.trace_id,
                status=SubagentStatus.RUNNING,
                started_at=datetime.now(),
            )

        try:
            agent = self._create_agent()
            state = self._build_initial_state(task)

            # Build config with thread_id for sandbox access and recursion limit
            run_config: RunnableConfig = {
                "recursion_limit": self.config.max_turns,
            }
            context = {}
            if self.thread_id:
                run_config["configurable"] = {"thread_id": self.thread_id}
                context["thread_id"] = self.thread_id
            if self.execution_mode:
                context["execution_mode"] = self.execution_mode
            if self.host_workdir:
                context["host_workdir"] = self.host_workdir

            logger.info(f"[trace={self.trace_id}] Subagent {self.config.name} starting async execution with max_turns={self.config.max_turns}")
            _record_subagent_started(
                task_id=result.task_id,
                thread_id=self.thread_id,
                subagent_name=self.config.name,
                trace_id=self.trace_id,
                timeout_seconds=self.config.timeout_seconds,
            )

            # Use stream instead of invoke to get real-time updates
            # This allows us to collect AI messages as they are generated
            final_state = None
            async for chunk in aiter_with_token_source(
                "subagent",
                agent.astream(state, config=run_config, context=context, stream_mode="values"),  # type: ignore[arg-type]
            ):
                final_state = chunk

                messages = chunk.get("messages", [])
                if messages:
                    last_message = messages[-1]
                    if isinstance(last_message, AIMessage):
                        message_dict = last_message.model_dump()
                        message_id = message_dict.get("id")
                        is_duplicate = False
                        if message_id:
                            is_duplicate = any(msg.get("id") == message_id for msg in result.ai_messages)
                        else:
                            is_duplicate = message_dict in result.ai_messages

                        if not is_duplicate:
                            result.ai_messages.append(message_dict)
                            logger.info(f"[trace={self.trace_id}] Subagent {self.config.name} captured AI message #{len(result.ai_messages)}")
                            _record_subagent_ai_message(
                                task_id=result.task_id,
                                thread_id=self.thread_id,
                                subagent_name=self.config.name,
                                trace_id=self.trace_id,
                                ai_message_count=len(result.ai_messages),
                            )

            logger.info(f"[trace={self.trace_id}] Subagent {self.config.name} completed async execution")

            if final_state is None:
                logger.warning(f"[trace={self.trace_id}] Subagent {self.config.name} no final state")
                result.result = "No response generated"
            else:
                # Extract the final message - find the last AIMessage
                messages = final_state.get("messages", [])
                logger.info(f"[trace={self.trace_id}] Subagent {self.config.name} final messages count: {len(messages)}")

                # Find the last AIMessage in the conversation
                last_ai_message = None
                for msg in reversed(messages):
                    if isinstance(msg, AIMessage):
                        last_ai_message = msg
                        break

                if last_ai_message is not None:
                    content = last_ai_message.content
                    # Handle both str and list content types for the final result
                    if isinstance(content, str):
                        result.result = content
                    elif isinstance(content, list):
                        # Extract text from list of content blocks for final result only.
                        # Concatenate raw string chunks directly, but preserve separation
                        # between full text blocks for readability.
                        text_parts = []
                        pending_str_parts = []
                        for block in content:
                            if isinstance(block, str):
                                pending_str_parts.append(block)
                            elif isinstance(block, dict):
                                if pending_str_parts:
                                    text_parts.append("".join(pending_str_parts))
                                    pending_str_parts.clear()
                                text_val = block.get("text")
                                if isinstance(text_val, str):
                                    text_parts.append(text_val)
                        if pending_str_parts:
                            text_parts.append("".join(pending_str_parts))
                        result.result = "\n".join(text_parts) if text_parts else "No text content in response"
                    else:
                        result.result = str(content)
                elif messages:
                    # Fallback: use the last message if no AIMessage found
                    last_message = messages[-1]
                    logger.warning(f"[trace={self.trace_id}] Subagent {self.config.name} no AIMessage found, using last message: {type(last_message)}")
                    raw_content = last_message.content if hasattr(last_message, "content") else str(last_message)
                    if isinstance(raw_content, str):
                        result.result = raw_content
                    elif isinstance(raw_content, list):
                        parts = []
                        pending_str_parts = []
                        for block in raw_content:
                            if isinstance(block, str):
                                pending_str_parts.append(block)
                            elif isinstance(block, dict):
                                if pending_str_parts:
                                    parts.append("".join(pending_str_parts))
                                    pending_str_parts.clear()
                                text_val = block.get("text")
                                if isinstance(text_val, str):
                                    parts.append(text_val)
                        if pending_str_parts:
                            parts.append("".join(pending_str_parts))
                        result.result = "\n".join(parts) if parts else "No text content in response"
                    else:
                        result.result = str(raw_content)
                else:
                    logger.warning(f"[trace={self.trace_id}] Subagent {self.config.name} no messages in final state")
                    result.result = "No response generated"

            result.status = SubagentStatus.COMPLETED
            result.completed_at = datetime.now()
            _record_subagent_completed(
                task_id=result.task_id,
                thread_id=self.thread_id,
                subagent_name=self.config.name,
                trace_id=self.trace_id,
                ai_message_count=len(result.ai_messages),
                duration_ms=_duration_ms(result.started_at, result.completed_at),
            )

        except Exception as e:
            logger.exception(f"[trace={self.trace_id}] Subagent {self.config.name} async execution failed")
            result.status = SubagentStatus.FAILED
            result.error = str(e)
            result.completed_at = datetime.now()
            _record_subagent_failed(
                task_id=result.task_id,
                thread_id=self.thread_id,
                subagent_name=self.config.name,
                trace_id=self.trace_id,
                error=str(e),
                ai_message_count=len(result.ai_messages),
                duration_ms=_duration_ms(result.started_at, result.completed_at),
            )

        return result

    def execute(self, task: str, result_holder: SubagentResult | None = None) -> SubagentResult:
        """Execute a task synchronously (wrapper around async execution).

        This method runs the async execution in a new event loop, allowing
        asynchronous tools (like MCP tools) to be used within the thread pool.

        Args:
            task: The task description for the subagent.
            result_holder: Optional pre-created result object to update during execution.

        Returns:
            SubagentResult with the execution result.
        """
        # Run the async execution in a new event loop
        # This is necessary because:
        # 1. We may have async-only tools (like MCP tools)
        # 2. We're running inside a ThreadPoolExecutor which doesn't have an event loop
        #
        # Note: _aexecute() catches all exceptions internally, so this outer
        # try-except only handles asyncio.run() failures (e.g., if called from
        # an async context where an event loop already exists). Subagent execution
        # errors are handled within _aexecute() and returned as FAILED status.
        try:
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                return asyncio.run(self._aexecute(task, result_holder))

            future = _isolated_loop_pool.submit(asyncio.run, self._aexecute(task, result_holder))
            return future.result()
        except Exception as e:
            logger.exception(f"[trace={self.trace_id}] Subagent {self.config.name} execution failed")
            # Create a result with error if we don't have one
            if result_holder is not None:
                result = result_holder
            else:
                result = SubagentResult(
                    task_id=str(uuid.uuid4())[:8],
                    trace_id=self.trace_id,
                    status=SubagentStatus.FAILED,
                )
            result.status = SubagentStatus.FAILED
            result.error = str(e)
            result.completed_at = datetime.now()
            _record_subagent_failed(
                task_id=result.task_id,
                thread_id=self.thread_id,
                subagent_name=self.config.name,
                trace_id=self.trace_id,
                error=str(e),
                ai_message_count=len(result.ai_messages),
                duration_ms=_duration_ms(result.started_at, result.completed_at),
            )
            return result

    def execute_async(self, task: str, task_id: str | None = None) -> str:
        """Start a task execution in the background.

        Args:
            task: The task description for the subagent.
            task_id: Optional task ID to use. If not provided, a random UUID will be generated.

        Returns:
            Task ID that can be used to check status later.
        """
        # Use provided task_id or generate a new one
        if task_id is None:
            task_id = str(uuid.uuid4())[:8]

        # Create initial pending result
        result = SubagentResult(
            task_id=task_id,
            trace_id=self.trace_id,
            status=SubagentStatus.PENDING,
        )

        logger.info(f"[trace={self.trace_id}] Subagent {self.config.name} starting async execution, task_id={task_id}, timeout={self.config.timeout_seconds}s")

        with _background_tasks_lock:
            _background_tasks[task_id] = result

        # Submit to scheduler pool
        def run_task():
            with _background_tasks_lock:
                _background_tasks[task_id].status = SubagentStatus.RUNNING
                _background_tasks[task_id].started_at = datetime.now()
                result_holder = _background_tasks[task_id]

            try:
                # Submit execution to execution pool with timeout
                # Pass result_holder so execute() can update it in real-time
                execution_future: Future = _execution_pool.submit(self.execute, task, result_holder)
                try:
                    # Wait for execution with timeout
                    exec_result = execution_future.result(timeout=self.config.timeout_seconds)
                    with _background_tasks_lock:
                        _background_tasks[task_id].status = exec_result.status
                        _background_tasks[task_id].result = exec_result.result
                        _background_tasks[task_id].error = exec_result.error
                        _background_tasks[task_id].completed_at = datetime.now()
                        _background_tasks[task_id].ai_messages = exec_result.ai_messages
                except FuturesTimeoutError:
                    logger.error(f"[trace={self.trace_id}] Subagent {self.config.name} execution timed out after {self.config.timeout_seconds}s")
                    with _background_tasks_lock:
                        _background_tasks[task_id].status = SubagentStatus.TIMED_OUT
                        _background_tasks[task_id].error = f"Execution timed out after {self.config.timeout_seconds} seconds"
                        _background_tasks[task_id].completed_at = datetime.now()
                        timed_out_result = _background_tasks[task_id]
                    _record_subagent_timeout(
                        task_id=task_id,
                        thread_id=self.thread_id,
                        subagent_name=self.config.name,
                        trace_id=self.trace_id,
                        timeout_seconds=self.config.timeout_seconds,
                        ai_message_count=len(timed_out_result.ai_messages),
                        duration_ms=_duration_ms(timed_out_result.started_at, timed_out_result.completed_at),
                    )
                    # Cancel the future (best effort - may not stop the actual execution)
                    execution_future.cancel()
            except Exception as e:
                logger.exception(f"[trace={self.trace_id}] Subagent {self.config.name} async execution failed")
                with _background_tasks_lock:
                    _background_tasks[task_id].status = SubagentStatus.FAILED
                    _background_tasks[task_id].error = str(e)
                    _background_tasks[task_id].completed_at = datetime.now()
                    failed_result = _background_tasks[task_id]
                _record_subagent_failed(
                    task_id=task_id,
                    thread_id=self.thread_id,
                    subagent_name=self.config.name,
                    trace_id=self.trace_id,
                    error=str(e),
                    ai_message_count=len(failed_result.ai_messages),
                    duration_ms=_duration_ms(failed_result.started_at, failed_result.completed_at),
                )

        _scheduler_pool.submit(run_task)
        return task_id


MAX_CONCURRENT_SUBAGENTS = 3


def get_background_task_result(task_id: str) -> SubagentResult | None:
    """Get the result of a background task.

    Args:
        task_id: The task ID returned by execute_async.

    Returns:
        SubagentResult if found, None otherwise.
    """
    with _background_tasks_lock:
        return _background_tasks.get(task_id)


def list_background_tasks() -> list[SubagentResult]:
    """List all background tasks.

    Returns:
        List of all SubagentResult instances.
    """
    with _background_tasks_lock:
        return list(_background_tasks.values())


def cleanup_background_task(task_id: str) -> None:
    """Remove a completed task from background tasks.

    Should be called by task_tool after it finishes polling and returns the result.
    This prevents memory leaks from accumulated completed tasks.

    Only removes tasks that are in a terminal state (COMPLETED/FAILED/TIMED_OUT)
    to avoid race conditions with the background executor still updating the task entry.

    Args:
        task_id: The task ID to remove.
    """
    with _background_tasks_lock:
        result = _background_tasks.get(task_id)
        if result is None:
            # Nothing to clean up; may have been removed already.
            logger.debug("Requested cleanup for unknown background task %s", task_id)
            return

        # Only clean up tasks that are in a terminal state to avoid races with
        # the background executor still updating the task entry.
        is_terminal_status = result.status in {
            SubagentStatus.COMPLETED,
            SubagentStatus.FAILED,
            SubagentStatus.CANCELLED,
            SubagentStatus.TIMED_OUT,
        }
        if is_terminal_status or result.completed_at is not None:
            del _background_tasks[task_id]
            logger.debug("Cleaned up background task: %s", task_id)
        else:
            logger.debug(
                "Skipping cleanup for non-terminal background task %s (status=%s)",
                task_id,
                result.status.value if hasattr(result.status, "value") else result.status,
            )
