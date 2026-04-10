from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.runtime.app_factory import create_runtime_app
from nion.config.paths import reset_paths


def test_user_identity_router_exposes_empty_profile(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/user-identity")

    assert response.status_code == 200
    assert response.json()["user_name"] == ""
    assert response.json()["preferred_address_for_user"] == ""
    assert response.json()["assistant_self_name"] == ""


def test_user_identity_router_is_available_in_desktop_runtime_app() -> None:
    app = create_runtime_app(
        mode="desktop",
        title="test",
        description="test",
        version="0.0.0",
    )

    routes = {route.path for route in app.routes}

    assert "/api/user-identity" in routes


def test_user_identity_router_patches_field_value(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.patch(
            "/api/user-identity",
            json={
                "field": "communication_style_preferences",
                "value": ["先给结论", "直接一点"],
            },
        )

    assert response.status_code == 200
    assert response.json()["communication_style_preferences"] == [
        "先给结论",
        "直接一点",
    ]


def test_user_identity_router_derives_mutual_addressing_rule_from_two_address_fields(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        first = client.patch(
            "/api/user-identity",
            json={"field": "preferred_address_for_user", "value": "大哥"},
        )
        second = client.patch(
            "/api/user-identity",
            json={"field": "assistant_self_name", "value": "小老弟"},
        )
        profile = client.get("/api/user-identity")

    assert first.status_code == 200
    assert second.status_code == 200
    assert profile.status_code == 200
    assert profile.json()["preferred_address_for_user"] == "大哥"
    assert profile.json()["assistant_self_name"] == "小老弟"
    assert profile.json()["mutual_addressing_rule"] == "你叫我大哥，我叫你小老弟"
