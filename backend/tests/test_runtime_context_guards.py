import importlib
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.loop_detection_middleware import LoopDetectionMiddleware
from nion.agents.middlewares.memory_middleware import MemoryMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware
from nion.sandbox.exceptions import SandboxRuntimeError
from nion.sandbox.tools import ensure_sandbox_initialized, sandbox_from_runtime

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


def test_ensure_sandbox_initialized_uses_configurable_thread_id_when_context_missing():
    provider = MagicMock()
    provider.acquire.return_value = "sandbox-1"
    provider.get.return_value = SimpleNamespace(id="sandbox-1")
    runtime = SimpleNamespace(
        state={},
        context=None,
        config={"configurable": {"thread_id": "thread-from-configurable"}},
    )

    with patch("nion.sandbox.tools.get_sandbox_provider", return_value=provider):
        sandbox = ensure_sandbox_initialized(runtime)

    assert sandbox.id == "sandbox-1"
    provider.acquire.assert_called_once_with("thread-from-configurable")


def test_sandbox_from_runtime_returns_sandbox_without_writing_context_when_missing():
    provider = MagicMock()
    provider.get.return_value = SimpleNamespace(id="sandbox-1")
    runtime = SimpleNamespace(
        state={"sandbox": {"sandbox_id": "sandbox-1"}},
        context=None,
    )

    with patch("nion.sandbox.tools.get_sandbox_provider", return_value=provider):
        sandbox = sandbox_from_runtime(runtime)

    assert sandbox.id == "sandbox-1"
    provider.get.assert_called_once_with("sandbox-1")
