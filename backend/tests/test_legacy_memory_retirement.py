from nion.agents.memory.queue import MemoryUpdateQueue, get_memory_queue
from nion.agents.memory.updater import MemoryUpdater
from nion.agents.middlewares.memory_middleware import MemoryMiddleware
from unittest.mock import MagicMock, patch

from langchain_core.messages import AIMessage, HumanMessage


def test_legacy_memory_queue_is_explicitly_compatibility_only() -> None:
    queue = get_memory_queue()

    assert isinstance(queue, MemoryUpdateQueue)
    assert getattr(queue, "primary_path_enabled", None) is False
    assert "compatibility" in (queue.retirement_notice or "").lower()


def test_legacy_memory_updater_is_explicitly_compatibility_only() -> None:
    updater = MemoryUpdater()

    assert getattr(updater, "primary_path_enabled", None) is False
    assert "canonical memory os" in (updater.retirement_notice or "").lower()


def test_memory_middleware_skips_legacy_queue_when_primary_path_disabled() -> None:
    middleware = MemoryMiddleware(agent_name="lead")
    queue = MemoryUpdateQueue(updater_factory=lambda: MagicMock())
    state = {
        "messages": [
            HumanMessage(content="没错，就是这样"),
            AIMessage(content="收到"),
        ]
    }
    runtime = MagicMock()
    runtime.context = {"thread_id": "thread-1"}

    with (
        patch("nion.agents.middlewares.memory_middleware.get_memory_config", return_value=MagicMock(enabled=True)),
        patch("nion.agents.middlewares.memory_middleware.get_memory_queue", return_value=queue),
    ):
        result = middleware.after_agent(state, runtime)

    assert result is None
    assert queue.pending_count == 0


def test_memory_middleware_can_queue_when_compatibility_path_is_explicitly_enabled() -> None:
    middleware = MemoryMiddleware(agent_name="lead")
    queue = MagicMock()
    queue.primary_path_enabled = True
    state = {
        "messages": [
            HumanMessage(content="没错，就是这样"),
            AIMessage(content="收到"),
        ]
    }
    runtime = MagicMock()
    runtime.context = {"thread_id": "thread-1"}

    with (
        patch("nion.agents.middlewares.memory_middleware.get_memory_config", return_value=MagicMock(enabled=True)),
        patch("nion.agents.middlewares.memory_middleware.get_memory_queue", return_value=queue),
    ):
        middleware.after_agent(state, runtime)

    queue.add.assert_called_once()
