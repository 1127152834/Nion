from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.bridge_permissions import create_bridge_permission_request


def test_workspace_permission_resolve_route_retries_original_message(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_bridge_permission_request(
        thread_id="thread-1",
        tool_name="codepilot_cli_tools_install",
        tool_input={"command": "brew install stripe/stripe-cli/stripe"},
        original_message_text="帮我安装 stripe CLI",
    )

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-1/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["original_message_text"] == "帮我安装 stripe CLI"
    assert response.json()["tool_name"] == "codepilot_cli_tools_install"
