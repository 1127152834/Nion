from nion.telemetry.models import EventRecord
from nion.telemetry.store import TelemetryStore


def test_event_store_filters_by_run_id(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-1",
            category="tool",
            level="info",
            event_type="task_delegation_requested",
            actor="agent",
            run_id="task-1",
            tool_name="task",
            message="Delegated task requested",
            details={},
        )
    )
    store.record_event(
        EventRecord(
            event_id="evt-2",
            category="tool",
            level="error",
            event_type="task_delegation_failed",
            actor="agent",
            run_id="task-2",
            tool_name="task",
            message="Delegated task failed",
            details={},
        )
    )

    events = store.list_events(limit=10, run_id="task-2")

    assert len(events) == 1
    assert events[0].run_id == "task-2"
    assert events[0].event_type == "task_delegation_failed"
