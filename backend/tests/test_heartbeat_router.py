from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_heartbeat_router_exposes_status_and_logs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        status_response = client.get("/api/heartbeat/status")
        logs_response = client.get("/api/heartbeat/logs")

    assert status_response.status_code == 200
    assert logs_response.status_code == 200
