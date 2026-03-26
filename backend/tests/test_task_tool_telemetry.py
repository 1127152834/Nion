from nion.telemetry.store import TelemetryStore


def test_task_tool_records_delegation_failure(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    from nion.tools.builtins.task_tool import _record_task_failure

    _record_task_failure(
        task_id="task-1",
        thread_id="thread-1",
        description="inspect logs",
        subagent_type="general-purpose",
        trace_id="trace-1",
        error="Task disappeared from background tasks",
    )

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, run_id="task-1")
    snapshot = store.get_snapshot("task", "task-1")

    assert events[0].event_type == "task_delegation_failed"
    assert events[0].category == "tool"
    assert events[0].tool_name == "task"
    assert snapshot.status == "error"
    assert snapshot.details["description"] == "inspect logs"
