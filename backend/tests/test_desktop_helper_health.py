from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_desktop_health_route_reports_desktop_runtime() -> None:
    client = TestClient(create_app())
    response = client.get("/api/desktop/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "desktop"
    assert payload["service"] == "nion-desktop-helper"
