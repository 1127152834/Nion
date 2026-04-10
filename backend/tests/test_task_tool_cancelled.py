from __future__ import annotations

import importlib.util
import sys
import types
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from types import SimpleNamespace

_MISSING = object()


class FakeSubagentStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


@dataclass
class _SubagentConfig:
    name: str
    description: str
    system_prompt: str
    max_turns: int
    timeout_seconds: int
    tools: list[str] | None = None
    disallowed_tools: list[str] | None = None


def _make_runtime() -> SimpleNamespace:
    return SimpleNamespace(
        state={
            "sandbox": {"sandbox_id": "local"},
            "thread_data": {
                "workspace_path": "/tmp/workspace",
                "uploads_path": "/tmp/uploads",
                "outputs_path": "/tmp/outputs",
            },
        },
        context={"thread_id": "thread-1"},
        config={"metadata": {"model_name": "ark-model", "trace_id": "trace-1"}},
    )


def _load_task_tool_module():
    overridden_modules = [
        "nion.agents.lead_agent.prompt",
        "nion.agents.thread_state",
        "nion.config.paths",
        "nion.subagents",
        "nion.subagents.executor",
        "nion.telemetry.logger",
        "nion.telemetry.models",
        "nion.telemetry.store",
        "nion.tools",
    ]
    originals = {name: sys.modules.get(name, _MISSING) for name in overridden_modules}
    original_nion_pkg = sys.modules.get("nion", _MISSING)
    nion_pkg = sys.modules.setdefault("nion", types.ModuleType("nion"))
    original_nion_tools_attr = getattr(nion_pkg, "tools", _MISSING)

    try:
        lead_prompt_module = types.ModuleType("nion.agents.lead_agent.prompt")
        lead_prompt_module.get_skills_prompt_section = lambda: ""
        sys.modules["nion.agents.lead_agent.prompt"] = lead_prompt_module

        thread_state_module = types.ModuleType("nion.agents.thread_state")
        thread_state_module.ThreadState = dict
        sys.modules["nion.agents.thread_state"] = thread_state_module

        paths_module = types.ModuleType("nion.config.paths")
        paths_module.get_paths = lambda: SimpleNamespace(telemetry_db_file="/tmp/telemetry.sqlite3")
        sys.modules["nion.config.paths"] = paths_module

        subagents_module = types.ModuleType("nion.subagents")
        subagents_module.SubagentExecutor = object
        subagents_module.get_subagent_config = lambda _name: _SubagentConfig(
            name="general-purpose",
            description="General helper",
            system_prompt="Base system prompt",
            max_turns=50,
            timeout_seconds=10,
        )
        sys.modules["nion.subagents"] = subagents_module

        executor_module = types.ModuleType("nion.subagents.executor")
        executor_module.SubagentStatus = FakeSubagentStatus
        executor_module.cleanup_background_task = lambda _task_id: None
        executor_module.get_background_task_result = lambda _task_id: None
        sys.modules["nion.subagents.executor"] = executor_module

        telemetry_logger_module = types.ModuleType("nion.telemetry.logger")
        telemetry_logger_module.make_event = lambda **kwargs: kwargs
        sys.modules["nion.telemetry.logger"] = telemetry_logger_module

        telemetry_models_module = types.ModuleType("nion.telemetry.models")
        telemetry_models_module.DiagnosticSnapshot = lambda **kwargs: kwargs
        sys.modules["nion.telemetry.models"] = telemetry_models_module

        telemetry_store_module = types.ModuleType("nion.telemetry.store")
        telemetry_store_module.TelemetryStore = type(
            "TelemetryStore",
            (),
            {
                "__init__": lambda self, *_args, **_kwargs: None,
                "record_event": lambda self, *_args, **_kwargs: None,
                "upsert_snapshot": lambda self, *_args, **_kwargs: None,
            },
        )
        sys.modules["nion.telemetry.store"] = telemetry_store_module

        tools_module = types.ModuleType("nion.tools")
        tools_module.get_available_tools = lambda **kwargs: []
        sys.modules["nion.tools"] = tools_module
        setattr(nion_pkg, "tools", tools_module)

        module_path = (
            Path(__file__).resolve().parents[1]
            / "packages"
            / "harness"
            / "nion"
            / "tools"
            / "builtins"
            / "task_tool.py"
        )
        spec = importlib.util.spec_from_file_location("test_task_tool_module", module_path)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        for name, original in originals.items():
            if original is _MISSING:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = original

        if original_nion_tools_attr is _MISSING:
            if hasattr(nion_pkg, "tools"):
                delattr(nion_pkg, "tools")
        else:
            setattr(nion_pkg, "tools", original_nion_tools_attr)

        if original_nion_pkg is _MISSING and sys.modules.get("nion") is nion_pkg:
            sys.modules.pop("nion", None)


def test_task_tool_returns_cancelled_message_and_cleans_up(monkeypatch):
    module = _load_task_tool_module()
    events: list[dict] = []
    cleanup_calls: list[str] = []

    monkeypatch.setattr(module, "get_stream_writer", lambda: events.append)
    monkeypatch.setattr(module.time, "sleep", lambda _seconds: None)
    monkeypatch.setattr(
        module,
        "get_background_task_result",
        lambda _task_id: SimpleNamespace(
            status=FakeSubagentStatus.CANCELLED,
            ai_messages=[],
            result=None,
            error="Cancelled by user",
        ),
    )
    monkeypatch.setattr(module, "cleanup_background_task", lambda task_id: cleanup_calls.append(task_id))
    monkeypatch.setattr(
        module,
        "SubagentExecutor",
        type("DummyExecutor", (), {"__init__": lambda self, **kwargs: None, "execute_async": lambda self, prompt, task_id=None: task_id}),
    )

    output = module.task_tool.func(
        runtime=_make_runtime(),
        description="执行任务",
        prompt="cancel task",
        subagent_type="general-purpose",
        tool_call_id="tc-cleanup-cancelled",
    )

    assert output == "Task cancelled by user."
    assert events[-1]["type"] == "task_cancelled"
    assert cleanup_calls == ["tc-cleanup-cancelled"]
