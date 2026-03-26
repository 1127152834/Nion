import sys
from unittest.mock import MagicMock

import pytest

from nion.telemetry.store import TelemetryStore

_MOCKED_MODULE_NAMES = [
    "nion.agents",
    "nion.agents.thread_state",
    "nion.agents.middlewares",
    "nion.agents.middlewares.thread_data_middleware",
    "nion.sandbox",
    "nion.sandbox.middleware",
    "nion.models",
]


@pytest.fixture
def real_executor_module():
    original_modules = {name: sys.modules.get(name) for name in _MOCKED_MODULE_NAMES}
    original_executor = sys.modules.get("nion.subagents.executor")

    if "nion.subagents.executor" in sys.modules:
        del sys.modules["nion.subagents.executor"]

    for name in _MOCKED_MODULE_NAMES:
        sys.modules[name] = MagicMock()

    import nion.subagents.executor as executor_module

    yield executor_module

    for name in _MOCKED_MODULE_NAMES:
        if original_modules[name] is not None:
            sys.modules[name] = original_modules[name]
        elif name in sys.modules:
            del sys.modules[name]

    if original_executor is not None:
        sys.modules["nion.subagents.executor"] = original_executor
    elif "nion.subagents.executor" in sys.modules:
        del sys.modules["nion.subagents.executor"]


def test_subagent_executor_records_timeout_event(tmp_path, monkeypatch, real_executor_module) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    real_executor_module._record_subagent_timeout(
        task_id="task-timeout",
        thread_id="thread-1",
        subagent_name="general-purpose",
        trace_id="trace-1",
        timeout_seconds=300,
    )

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, run_id="task-timeout", category="agent")
    snapshot = store.get_snapshot("task", "task-timeout")

    assert events[0].event_type == "subagent_execution_timed_out"
    assert "timed out" in events[0].message
    assert snapshot.status == "error"
    assert snapshot.details["subagent_name"] == "general-purpose"
