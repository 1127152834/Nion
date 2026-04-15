from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import get_paths
from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore


def test_daemon_diagnostics_api_returns_daemon_summary() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/diagnostics")
        assert response.status_code == 200
        payload = response.json()
        assert "status" in payload
        assert "summary" in payload


def test_daemon_task_diagnostics_returns_task_snapshot(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    store = TelemetryStore(get_paths().telemetry_db_file)
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id="task-123",
            status="error",
            summary="Delegated task 'inspect logs' failed",
            details={"task_id": "task-123", "status": "failed"},
        )
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/diagnostics/tasks/task-123")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["details"]["task_id"] == "task-123"
