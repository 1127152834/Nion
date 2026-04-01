from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import models as models_router
from nion.config.app_config import reset_app_config
from nion.config.config_store import resolve_config_db_path
from nion.config.extensions_config import reset_extensions_config
from nion.model_management import ModelManagementRepository


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_store(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)
    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_MODEL_MANAGEMENT_SECRET", "test-secret")
    reset_app_config()
    reset_extensions_config()


def _create_provider(client: TestClient, *, category: str = "global", code: str = "openrouter") -> dict:
    templates_response = client.get(f"/api/model-admin/templates?category={category}")
    assert templates_response.status_code == 200
    template = next(item for item in templates_response.json()["templates"] if item["code"] == code)

    response = client.post(
        "/api/model-admin/providers",
        json={
            "provider_template_id": template["id"],
            "display_name": "OpenRouter Main",
            "api_key": "sk-test-1234",
        },
    )
    assert response.status_code == 200
    return response.json()["provider"]


def _create_provider_model(client: TestClient, provider_id: str) -> dict:
    response = client.post(
        f"/api/model-admin/providers/{provider_id}/models",
        json={
            "models": [
                {
                    "model_id": "gpt-4.1",
                    "display_name": "GPT-4.1",
                    "source": "manual",
                    "is_primary": True,
                    "supports_thinking": True,
                    "supports_reasoning_effort": True,
                    "supports_vision": True,
                }
            ]
        },
    )
    assert response.status_code == 200
    return response.json()["models"][0]


def test_list_templates_by_category(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        with TestClient(create_app()) as client:
            response = client.get("/api/model-admin/templates?category=domestic")

        assert response.status_code == 200
        assert any(item["code"] == "minimax-cn" for item in response.json()["templates"])
    finally:
        reset_app_config()
        reset_extensions_config()


def test_provider_and_binding_crud_flow(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        with TestClient(create_app()) as client:
            provider = _create_provider(client)
            model = _create_provider_model(client, provider["id"])

            bindings_response = client.put(
                "/api/model-admin/bindings/chat.default",
                json={"provider_model_id": model["id"]},
            )
            providers_response = client.get("/api/model-admin/providers")
            runtime_models_response = client.get("/api/models")

        assert bindings_response.status_code == 200
        assert bindings_response.json()["binding"]["provider_model_id"] == model["id"]
        assert providers_response.status_code == 200
        assert providers_response.json()["providers"][0]["id"] == provider["id"]
        assert providers_response.json()["providers"][0]["models"][0]["model_id"] == "gpt-4.1"
        assert runtime_models_response.status_code == 200
        assert runtime_models_response.json()["models"][0]["model"] == "gpt-4.1"

        repo = ModelManagementRepository(resolve_config_db_path())
        persisted_provider = repo.get_provider_instance(provider["id"])
        assert persisted_provider is not None
        assert persisted_provider.api_key_encrypted
        assert persisted_provider.api_key_encrypted != "sk-test-1234"
        assert persisted_provider.api_key_masked is not None
    finally:
        reset_app_config()
        reset_extensions_config()


def test_provider_test_updates_status(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    async def _fake_provider_models(*, api_base, api_key, timeout_seconds):
        assert api_base is None
        assert api_key == "sk-test-1234"
        assert timeout_seconds == 7.0
        return [{"id": "gpt-4.1", "name": "GPT-4.1"}]

    monkeypatch.setattr(models_router, "_fetch_provider_models_openai_compatible", _fake_provider_models)

    try:
        with TestClient(create_app()) as client:
            provider = _create_provider(client)
            response = client.post(
                f"/api/model-admin/providers/{provider['id']}/test",
                json={"timeout_seconds": 7},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["result"]["success"] is True
        assert payload["provider"]["provider_test_status"] == "success"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_provider_connection_changes_reset_test_status(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    async def _fake_provider_models(*, api_base, api_key, timeout_seconds):
        assert api_key == "sk-test-1234"
        return [{"id": "gpt-4.1", "name": "GPT-4.1"}]

    monkeypatch.setattr(models_router, "_fetch_provider_models_openai_compatible", _fake_provider_models)

    try:
        with TestClient(create_app()) as client:
            provider = _create_provider(client)
            tested = client.post(
                f"/api/model-admin/providers/{provider['id']}/test",
                json={"timeout_seconds": 7},
            )
            assert tested.status_code == 200

            updated = client.patch(
                f"/api/model-admin/providers/{provider['id']}",
                json={"base_url_override": "https://example.com/v2"},
            )

        assert updated.status_code == 200
        payload = updated.json()["provider"]
        assert payload["provider_test_status"] == "untested"
        assert payload["provider_last_tested_at"] is None
        assert payload["provider_test_message"] is None
    finally:
        reset_app_config()
        reset_extensions_config()


def test_model_test_updates_status(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    class _FakeResponse:
        content = "pong from provider"

    class _FakeChatModel:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def invoke(self, messages):
            assert self.kwargs["model"] == "gpt-4.1"
            assert messages[0].content == "ping"
            return _FakeResponse()

    monkeypatch.setattr(models_router, "resolve_class", lambda use, base_class: _FakeChatModel)

    try:
        with TestClient(create_app()) as client:
            provider = _create_provider(client)
            model = _create_provider_model(client, provider["id"])
            response = client.post(
                f"/api/model-admin/models/{model['id']}/test",
                json={"probe_message": "ping"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["result"]["success"] is True
        assert payload["result"]["response_preview"] == "pong from provider"
        assert payload["model"]["model_test_status"] == "success"
    finally:
        reset_app_config()
        reset_extensions_config()
