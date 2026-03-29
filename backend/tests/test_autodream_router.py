from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.paths import reset_paths


def test_autodream_router_can_run_manual_dream(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.post("/api/autodream/run", json={"query": "onboarding quality"})
        assert response.status_code == 200
        payload = response.json()
        assert "entry" in payload
        assert "entry_path" in payload
