from app.daemon.service import LocalDaemonService
from nion.telemetry.store import TelemetryStore


def test_daemon_service_records_client_register_and_unregister(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    service = LocalDaemonService(
        host="127.0.0.1",
        port=43115,
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
    )
    service.attach_telemetry_store(store)

    service.register_client("electron-1", "electron")
    service.unregister_client("electron-1")

    events = store.list_events(limit=10, category="client")
    assert [event.event_type for event in events] == [
        "client_unregistered",
        "client_registered",
    ]
