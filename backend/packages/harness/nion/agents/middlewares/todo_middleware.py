"""Middleware that extends TodoListMiddleware with context-loss detection.

When the message history is truncated (e.g., by SummarizationMiddleware), the
original `write_todos` tool call and its ToolMessage can be scrolled out of the
active context window. This middleware detects that situation and injects a
reminder message so the model still knows about the outstanding todo list.
"""

from __future__ import annotations

from typing import Any, override

from langchain.agents.middleware import TodoListMiddleware
from langchain.agents.middleware.todo import PlanningState, Todo
from langchain.agents.middleware.types import hook_config
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.runtime import Runtime


def _todos_in_messages(messages: list[Any]) -> bool:
    """Return True if any AIMessage in *messages* contains a write_todos tool call."""
    for msg in messages:
        if isinstance(msg, AIMessage) and msg.tool_calls:
            for tc in msg.tool_calls:
                if tc.get("name") == "write_todos":
                    return True
    return False


def _reminder_in_messages(messages: list[Any]) -> bool:
    """Return True if a todo_reminder HumanMessage is already present in *messages*."""
    for msg in messages:
        if isinstance(msg, HumanMessage) and getattr(msg, "name", None) == "todo_reminder":
            return True
    return False


def _completion_reminder_count(messages: list[Any]) -> int:
    """Return the number of todo_completion_reminder HumanMessages in *messages*."""
    return sum(
        1
        for msg in messages
        if isinstance(msg, HumanMessage)
        and getattr(msg, "name", None) == "todo_completion_reminder"
    )


def _format_todos(todos: list[Todo]) -> str:
    """Format a list of Todo items into a human-readable string."""
    lines: list[str] = []
    for todo in todos:
        status = todo.get("status", "pending")
        content = todo.get("content", "")
        lines.append(f"- [{status}] {content}")
    return "\n".join(lines)


class TodoMiddleware(TodoListMiddleware):
    """Extends TodoListMiddleware with `write_todos` context-loss detection.

    When the original `write_todos` tool call has been truncated from the message
    history (e.g., after summarization), the model loses awareness of the current
    todo list. This middleware detects that gap in `before_model` / `abefore_model`
    and injects a reminder message so the model can continue tracking progress.
    """

    _MAX_COMPLETION_REMINDERS = 2

    @override
    def before_model(
        self,
        state: PlanningState,
        runtime: Runtime,  # noqa: ARG002
    ) -> dict[str, Any] | None:
        """Inject a todo-list reminder when write_todos has left the context window."""
        todos: list[Todo] = state.get("todos") or []  # type: ignore[assignment]
        if not todos:
            return None

        messages = state.get("messages") or []
        if _todos_in_messages(messages):
            # write_todos is still visible in context — nothing to do.
            return None

        if _reminder_in_messages(messages):
            # A reminder was already injected and hasn't been truncated yet.
            return None

        # The todo list exists in state but the original write_todos call is gone.
        # Inject a reminder as a HumanMessage so the model stays aware.
        formatted = _format_todos(todos)
        reminder = HumanMessage(
            name="todo_reminder",
            content=(
                "<system_reminder>\n"
                "Your todo list from earlier is no longer visible in the current context window, "
                "but it is still active. Here is the current state:\n\n"
                f"{formatted}\n\n"
                "Continue tracking and updating this todo list as you work. "
                "Call `write_todos` whenever the status of any item changes.\n"
                "</system_reminder>"
            ),
        )
        return {"messages": [reminder]}

    @override
    async def abefore_model(
        self,
        state: PlanningState,
        runtime: Runtime,
    ) -> dict[str, Any] | None:
        """Async version of before_model."""
        return self.before_model(state, runtime)

    @hook_config(can_jump_to=["model"])
    @override
    def after_model(
        self,
        state: PlanningState,
        runtime: Runtime,
    ) -> dict[str, Any] | None:
        """Prevent plan-mode exits while todo items are still incomplete."""
        base_result = super().after_model(state, runtime)
        if base_result is not None:
            return base_result

        messages = state.get("messages") or []
        last_ai = next((msg for msg in reversed(messages) if isinstance(msg, AIMessage)), None)
        if not last_ai or last_ai.tool_calls:
            return None

        todos: list[Todo] = state.get("todos") or []  # type: ignore[assignment]
        if not todos or all(todo.get("status") == "completed" for todo in todos):
            return None

        if _completion_reminder_count(messages) >= self._MAX_COMPLETION_REMINDERS:
            return None

        incomplete = [todo for todo in todos if todo.get("status") != "completed"]
        incomplete_text = "\n".join(
            f"- [{todo.get('status', 'pending')}] {todo.get('content', '')}"
            for todo in incomplete
        )
        reminder = HumanMessage(
            name="todo_completion_reminder",
            content=(
                "<system_reminder>\n"
                "You still have incomplete todo items:\n\n"
                f"{incomplete_text}\n\n"
                "Continue working on them. Call `write_todos` to update progress and only finish once all are completed.\n"
                "</system_reminder>"
            ),
        )
        return {"jump_to": "model", "messages": [reminder]}

    @hook_config(can_jump_to=["model"])
    @override
    async def aafter_model(
        self,
        state: PlanningState,
        runtime: Runtime,
    ) -> dict[str, Any] | None:
        return self.after_model(state, runtime)
