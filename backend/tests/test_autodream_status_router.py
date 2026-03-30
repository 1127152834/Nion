from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_autodream_status_route_returns_current_state(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/autodream/status")
        assert response.status_code == 200
        payload = response.json()
        assert "running" in payload
        assert "last_run_status" in payload
        assert "last_run_summary" in payload
        assert "session_count_since_last_run" in payload
        assert "next_eligibility_hint" in payload
