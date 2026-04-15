from __future__ import annotations

from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_session_policy_options_returns_visible_subagent_registry(monkeypatch) -> None:
    monkeypatch.setattr(
        "nion.subagents.registry.is_host_bash_allowed",
        lambda: False,
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/config/session-policy/options")

    assert response.status_code == 200
    payload = response.json()
    assert "subagents" in payload
    general_purpose = next(
        item for item in payload["subagents"] if item["name"] == "general-purpose"
    )
    assert isinstance(general_purpose["description"], str)
    assert general_purpose["description"]
    assert general_purpose["timeout_seconds"] == 900
    assert all(item["name"] != "bash" for item in payload["subagents"])
