from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_rebuild_router_exposes_rebuild_logs_and_status(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        rebuild_response = client.post("/api/memory/rebuild")
        logs_response = client.get("/api/memory/rebuild/logs")
        status_response = client.get("/api/memory/status")

    assert rebuild_response.status_code == 200
    assert logs_response.status_code == 200
    assert status_response.status_code == 200
