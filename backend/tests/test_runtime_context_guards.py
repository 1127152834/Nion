import importlib
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.loop_detection_middleware import LoopDetectionMiddleware
from nion.agents.middlewares.memory_middleware import MemoryMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware
from nion.sandbox.exceptions import SandboxRuntimeError
from nion.sandbox.tools import ensure_sandbox_initialized
automation_tool_module = importlib.import_module("nion.tools.builtins.automation_tool")
present_file_tool_module = importlib.import_module("nion.tools.builtins.present_file_tool")


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

    result = middleware.before_model(
        {"messages": [HumanMessage(content="continue the auth fix")]},
        runtime,
    )

    assert result is None


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


def test_automation_service_falls_back_without_runtime_context(monkeypatch):
    sentinel = object()
    automation_tool_module.set_automation_tool_service(None)
    monkeypatch.setattr(
        automation_tool_module,
        "create_default_automation_service",
        lambda: sentinel,
    )

    runtime = SimpleNamespace(context=None)

    try:
        assert automation_tool_module.get_automation_tool_service(runtime) is sentinel
    finally:
        automation_tool_module.set_automation_tool_service(None)


def test_present_file_tool_returns_error_when_runtime_context_is_missing(tmp_path):
    outputs_dir = tmp_path / "threads" / "thread-1" / "user-data" / "outputs"
    outputs_dir.mkdir(parents=True)
    artifact_path = outputs_dir / "report.md"
    artifact_path.write_text("ok")

    runtime = SimpleNamespace(
        state={"thread_data": {"outputs_path": str(outputs_dir)}},
        context=None,
    )

    result = present_file_tool_module.present_file_tool.func(
        runtime=runtime,
        filepaths=[str(artifact_path)],
        tool_call_id="tc-1",
    )

    assert "artifacts" not in result.update
    assert result.update["messages"][0].content == "Error: Thread ID is not available in runtime context"


def test_ensure_sandbox_initialized_raises_clear_error_when_runtime_context_is_none():
    runtime = SimpleNamespace(state={}, context=None)

    with pytest.raises(SandboxRuntimeError, match="Thread ID not available in runtime context"):
        ensure_sandbox_initialized(runtime)
