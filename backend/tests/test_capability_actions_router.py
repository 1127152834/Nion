from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_capability_actions_route_returns_bridge_actions(monkeypatch):
    monkeypatch.setattr(
        "app.gateway.routers.capability_actions.build_capability_bridge_actions",
        lambda: [
            {"id": "bridge:notebook-to-memory"},
            {"id": "bridge:workspace-to-notebook"},
        ],
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/capabilities/actions")

    assert response.status_code == 200
    payload = response.json()
    assert payload["actions"][0]["id"] == "bridge:notebook-to-memory"
