from nion.telemetry.models import EventRecord
from nion.telemetry.store import TelemetryStore


def test_event_store_records_and_filters_structured_events(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-1",
            category="daemon",
            level="info",
            event_type="daemon_started",
            actor="system",
            message="Daemon started",
            details={},
        )
    )
    store.record_event(
        EventRecord(
            event_id="evt-2",
            category="thread",
            level="error",
            event_type="thread_stream_failed",
            actor="agent",
            thread_id="thread-1",
            message="Thread run failed",
            details={"reason": "tool failure"},
        )
    )

    recent = store.list_events(limit=10)
    errors = store.list_events(limit=10, level="error")

    assert len(recent) == 2
    assert len(errors) == 1
    assert errors[0].event_type == "thread_stream_failed"
