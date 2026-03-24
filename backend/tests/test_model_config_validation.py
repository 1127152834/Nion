from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import models as models_router
from nion.config.app_config import get_app_config, reset_app_config
from nion.config.config_repository import ConfigRepository, ConfigValidationError
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_store(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)
    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()


def _extended_model_payload() -> dict:
    return {
        "name": "gateway-model",
        "display_name": "Gateway Model",
        "description": "Config-center managed model",
        "use": "langchain_openai:ChatOpenAI",
        "model": "gpt-4.1",
        "api_key": "$OPENAI_API_KEY",
        "api_base": "https://api.openai.com/v1",
        "use_responses_api": True,
        "output_version": "responses/v1",
        "supports_thinking": True,
        "supports_reasoning_effort": True,
        "supports_vision": True,
        "thinking": {"type": "enabled", "budget_tokens": 4000},
        "when_thinking_enabled": {"extra_body": {"reasoning": {"effort": "medium"}}},
        "temperature": 0.2,
    }


def test_config_repository_round_trips_extended_model_fields(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["models"] = [_extended_model_payload()]

        new_version, warnings = repository.write_with_warnings(
            config_dict=config,
            expected_version=version,
        )

        persisted, persisted_version, _ = repository.read()
        loaded = get_app_config()
        dumped = loaded.models[0].model_dump(exclude_none=True)

        assert warnings == []
        assert new_version == "2"
        assert persisted_version == "2"
        assert persisted["models"][0]["use_responses_api"] is True
        assert persisted["models"][0]["output_version"] == "responses/v1"
        assert persisted["models"][0]["supports_vision"] is True
        assert persisted["models"][0]["thinking"]["budget_tokens"] == 4000
        assert persisted["models"][0]["api_key"] == "$OPENAI_API_KEY"
        assert persisted["models"][0]["api_base"] == "https://api.openai.com/v1"
        assert persisted["models"][0]["temperature"] == 0.2
        assert dumped["use_responses_api"] is True
        assert dumped["output_version"] == "responses/v1"
        assert dumped["supports_reasoning_effort"] is True
        assert dumped["supports_vision"] is True
        assert dumped["api_key"] == "$OPENAI_API_KEY"
        assert dumped["api_base"] == "https://api.openai.com/v1"
        assert dumped["temperature"] == 0.2
    finally:
        reset_app_config()
        reset_extensions_config()


@pytest.mark.parametrize(
    ("field_name", "field_value"),
    [
        ("thinking", "enabled"),
        ("when_thinking_enabled", "enabled"),
    ],
)
def test_config_repository_rejects_invalid_model_settings_shapes(monkeypatch, tmp_path, field_name: str, field_value: str):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        payload = _extended_model_payload()
        payload[field_name] = field_value
        config["models"] = [payload]

        with pytest.raises(ConfigValidationError) as exc_info:
            repository.write_with_warnings(config_dict=config, expected_version=version)

        assert exc_info.value.errors
        assert exc_info.value.errors[0]["path"] == ["models", "0", field_name]
    finally:
        reset_app_config()
        reset_extensions_config()


def test_models_routes_expose_store_backed_capabilities(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["models"] = [_extended_model_payload()]
        repository.write_with_warnings(config_dict=config, expected_version=version)

        with TestClient(create_app()) as client:
            list_response = client.get("/api/models")
            assert list_response.status_code == 200
            list_payload = list_response.json()
            assert list_payload["models"][0]["model"] == "gpt-4.1"
            assert list_payload["models"][0]["supports_reasoning_effort"] is True
            assert list_payload["models"][0]["supports_vision"] is True

            detail_response = client.get("/api/models/gateway-model")
            assert detail_response.status_code == 200
            assert detail_response.json()["supports_vision"] is True
    finally:
        reset_app_config()
        reset_extensions_config()


def test_model_test_connection_uses_provider_listing_probe(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    async def _fake_provider_models(*, api_base, api_key, timeout_seconds):
        assert api_base is None
        assert api_key == "secret-token"
        assert timeout_seconds == 7.0
        return [{"id": "gpt-4.1", "name": "GPT-4.1"}]

    monkeypatch.setattr(models_router, "_fetch_provider_models_openai_compatible", _fake_provider_models)

    try:
        with TestClient(create_app()) as client:
            response = client.post(
                "/api/models/test-connection",
                json={
                    "use": "langchain_openai:ChatOpenAI",
                    "api_key": "secret-token",
                    "timeout_seconds": 7,
                },
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["message"] == "Connection successful"
        assert isinstance(payload["latency_ms"], int)
    finally:
        reset_app_config()
        reset_extensions_config()


def test_model_test_connection_invokes_provider_and_returns_preview(monkeypatch, tmp_path):
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
            response = client.post(
                "/api/models/test-connection",
                json={
                    "use": "langchain_openai:ChatOpenAI",
                    "model": "gpt-4.1",
                    "probe_message": "ping",
                },
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["response_preview"] == "pong from provider"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_provider_models_endpoint_merges_models_dev_metadata(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    async def _fake_provider_models(*, api_base, api_key, timeout_seconds):
        assert api_base is None
        assert api_key is None
        assert timeout_seconds == 15.0
        return [{"id": "gpt-4.1", "name": "GPT 4.1"}]

    async def _fake_models_dev_provider_models(*, provider_key, timeout_seconds):
        assert provider_key == "openai"
        assert timeout_seconds == 15.0
        return {
            "gpt-4.1": {
                "name": "GPT-4.1",
                "reasoning": True,
                "modalities": {"input": ["text", "image"]},
                "limit": {"context": 128000, "output": 16384},
            }
        }

    monkeypatch.setattr(models_router, "_fetch_provider_models_openai_compatible", _fake_provider_models)
    monkeypatch.setattr(models_router, "_fetch_models_dev_provider_models", _fake_models_dev_provider_models)

    try:
        with TestClient(create_app()) as client:
            response = client.post(
                "/api/models/provider-models",
                json={"use": "langchain_openai:ChatOpenAI"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["provider_type"] == "openai-compatible"
        assert payload["models"][0]["id"] == "gpt-4.1"
        assert payload["models"][0]["supports_thinking"] is True
        assert payload["models"][0]["supports_vision"] is True
        assert payload["models"][0]["context_window"] == 128000
        assert payload["models"][0]["source"] == "provider+models.dev"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_model_metadata_endpoint_returns_models_dev_match(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    async def _fake_find_model_metadata(*, model_id, provider_key, timeout_seconds):
        assert model_id == "gpt-4.1"
        assert provider_key == "openai"
        assert timeout_seconds == 10.0
        return (
            "gpt-4.1",
            {
                "name": "GPT-4.1",
                "reasoning": True,
                "modalities": {"input": ["text", "image", "video"]},
                "limit": {"context": 256000, "output": 32768},
            },
        )

    monkeypatch.setattr(models_router, "_find_models_dev_model_metadata", _fake_find_model_metadata)

    try:
        with TestClient(create_app()) as client:
            response = client.post(
                "/api/models/model-metadata",
                json={"model": "gpt-4.1", "use": "langchain_openai:ChatOpenAI"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        assert payload["found"] is True
        assert payload["model"]["id"] == "gpt-4.1"
        assert payload["model"]["supports_video"] is True
        assert payload["model"]["max_output_tokens"] == 32768
    finally:
        reset_app_config()
        reset_extensions_config()
