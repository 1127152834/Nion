from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_capability_catalog_route_returns_runtime_surface(monkeypatch):
    monkeypatch.setattr(
        "app.gateway.routers.capabilities.build_system_capability_catalog",
        lambda **kwargs: {
            "categories": ["cli", "skills", "mcp"],
            "capabilities": [
                {"category": "cli", "label": "CLI tool management"},
                {"category": "skills", "label": "Skill execution"},
                {"category": "mcp", "label": "Slack MCP"},
            ],
            "discoverability": {
                "catalog_tool": "get_capability_catalog",
                "actions_tool": "get_capability_actions",
                "guidance": "Use the catalog tool first.",
            },
            "objects": [],
        },
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/capabilities/catalog")

    assert response.status_code == 200
    payload = response.json()
    assert payload["categories"] == ["cli", "skills", "mcp"]
    assert payload["capabilities"][2]["label"] == "Slack MCP"
    assert payload["discoverability"]["catalog_tool"] == "get_capability_catalog"
