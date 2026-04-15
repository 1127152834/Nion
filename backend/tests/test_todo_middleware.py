import asyncio
from types import SimpleNamespace

from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.todo_middleware import (
    TodoMiddleware,
    _completion_reminder_count,
)


def _runtime():
    return SimpleNamespace()


def _ai_no_tool_calls():
    return AIMessage(content="done")


def _completion_reminder_msg():
    return HumanMessage(name="todo_completion_reminder", content="finish todos")


def _incomplete_todos():
    return [
        {"status": "completed", "content": "Step 1"},
        {"status": "in_progress", "content": "Step 2"},
        {"status": "pending", "content": "Step 3"},
    ]


def test_completion_reminder_count_only_counts_completion_reminders():
    messages = [_completion_reminder_msg(), HumanMessage(name="todo_reminder", content="x")]
    assert _completion_reminder_count(messages) == 1


def test_after_model_reengages_when_incomplete_todos_remain():
    middleware = TodoMiddleware()
    state = {
        "messages": [HumanMessage(content="hi"), _ai_no_tool_calls()],
        "todos": _incomplete_todos(),
    }

    result = middleware.after_model(state, _runtime())

    assert result is not None
    assert result["jump_to"] == "model"
    reminder = result["messages"][0]
    assert isinstance(reminder, HumanMessage)
    assert reminder.name == "todo_completion_reminder"
    assert "Step 2" in reminder.content
    assert "Step 3" in reminder.content


def test_after_model_stops_reengaging_after_cap():
    middleware = TodoMiddleware()
    state = {
        "messages": [
            _completion_reminder_msg(),
            _completion_reminder_msg(),
            _ai_no_tool_calls(),
        ],
        "todos": _incomplete_todos(),
    }

    assert middleware.after_model(state, _runtime()) is None


def test_aafter_model_delegates_to_sync_logic():
    middleware = TodoMiddleware()
    state = {
        "messages": [_ai_no_tool_calls()],
        "todos": _incomplete_todos(),
    }

    result = asyncio.run(middleware.aafter_model(state, _runtime()))

    assert result is not None
    assert result["jump_to"] == "model"
