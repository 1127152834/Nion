from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import get_paths
from nion.telemetry.models import EventRecord
from nion.telemetry.store import TelemetryStore


def test_daemon_logs_api_filters_by_category_and_level() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/logs", params={"category": "daemon", "level": "info", "limit": 20})
        assert response.status_code == 200
        payload = response.json()
        assert "events" in payload


def test_daemon_logs_api_filters_by_run_id(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    store = TelemetryStore(get_paths().telemetry_db_file)
    store.record_event(
        EventRecord(
            event_id="evt-1",
            category="tool",
            level="info",
            event_type="task_delegation_requested",
            actor="agent",
            run_id="task-123",
            tool_name="task",
            message="Delegated task requested",
            details={"description": "inspect logs"},
        )
    )
    store.record_event(
        EventRecord(
            event_id="evt-2",
            category="tool",
            level="info",
            event_type="task_delegation_requested",
            actor="agent",
            run_id="task-456",
            tool_name="task",
            message="Delegated task requested",
            details={"description": "inspect config"},
        )
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/logs", params={"run_id": "task-123", "limit": 20})

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["events"]) == 1
    assert payload["events"][0]["run_id"] == "task-123"
