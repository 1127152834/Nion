from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_diagnostics_api_returns_daemon_summary() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/diagnostics")
        assert response.status_code == 200
        payload = response.json()
        assert "status" in payload
        assert "summary" in payload
