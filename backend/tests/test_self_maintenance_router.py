from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_self_maintenance_router_exposes_run_status_and_logs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        run_response = client.post(
            "/api/self-maintenance/run",
            json={"query": "recent memory drift"},
        )
        status_response = client.get("/api/self-maintenance/status")
        logs_response = client.get("/api/self-maintenance/logs")

    assert run_response.status_code == 200
    assert status_response.status_code == 200
    assert logs_response.status_code == 200
