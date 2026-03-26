from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.loop_detection_middleware import LoopDetectionMiddleware
from nion.agents.middlewares.memory_middleware import MemoryMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware
from nion.tools.builtins.automation_tool import get_automation_tool_service


def test_memory_middleware_skips_when_runtime_context_is_none():
    middleware = MemoryMiddleware(agent_name="lead_agent")
    runtime = MagicMock()
    runtime.context = None
    state = {"messages": [HumanMessage(content="hi"), AIMessage(content="hello")]}

    assert middleware.after_agent(state, runtime) is None


def test_recall_capture_skips_when_runtime_context_is_none(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    runtime = MagicMock()
    runtime.context = None

    assert middleware.after_agent({"messages": []}, runtime) is None


def test_continuity_middleware_skips_when_runtime_context_is_none(tmp_path):
    middleware = ContinuityMiddleware(base_dir=tmp_path)
    runtime = MagicMock()
    runtime.context = None
    state = {"messages": [HumanMessage(content="continue the staging fix")]}

    assert middleware.before_model(state, runtime) is None


def test_loop_detection_uses_default_thread_when_runtime_context_is_none():
    middleware = LoopDetectionMiddleware(warn_threshold=2)
    runtime = MagicMock()
    runtime.context = None
    state = {
        "messages": [
            AIMessage(
                content="",
                tool_calls=[{"name": "bash", "id": "call_ls", "args": {"command": "ls"}}],
            )
        ]
    }

    middleware._apply(state, runtime)

    assert "default" in middleware._history


def test_automation_service_falls_back_without_runtime_context():
    runtime = MagicMock()
    runtime.context = None

    assert get_automation_tool_service(runtime) is not None
