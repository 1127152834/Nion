from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_logs_api_filters_by_category_and_level() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/logs", params={"category": "daemon", "level": "info", "limit": 20})
        assert response.status_code == 200
        payload = response.json()
        assert "events" in payload
