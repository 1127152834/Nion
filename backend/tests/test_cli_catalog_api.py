from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_cli_catalog_api_returns_structured_payload():
    with TestClient(create_app()) as client:
        response = client.get("/api/cli/catalog")

    assert response.status_code == 200
    payload = response.json()
    assert "clis" in payload
    assert isinstance(payload["clis"], dict)

