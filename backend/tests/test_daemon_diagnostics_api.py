from fastapi.testclient import TestClient

from app.daemon.app import create_app
from app.daemon.service import LocalDaemonService
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


def test_thread_diagnostics_reports_running_state_when_thread_stream_is_active() -> None:
    app = create_app()
    with TestClient(app) as client:
        service = app.state.daemon_service
        assert isinstance(service, LocalDaemonService)
        service.record_thread_event(
            level="info",
            event_type="thread_stream_started",
            thread_id="thread-queue",
            message="Thread stream started",
            details={},
        )
        response = client.get("/api/daemon/diagnostics/threads/thread-queue")

    assert response.status_code == 200
    payload = response.json()
    assert payload["details"]["thread_id"] == "thread-queue"
    assert payload["details"]["is_running"] is True
