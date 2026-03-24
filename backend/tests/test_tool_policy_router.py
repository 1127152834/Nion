from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_tool_policy_endpoint_returns_rules_and_configured_catalog():
    client = TestClient(create_app())
    response = client.get("/api/tool-policy")

    assert response.status_code == 200
    body = response.json()
    assert "rules" in body
    assert "catalog" in body
    assert body["scope"] == "configured-tools-v1"
