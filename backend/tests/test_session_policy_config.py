from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.gateway.app import create_app
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


def test_config_repository_round_trips_session_policy_sections(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["title"] = {
            "enabled": True,
            "model_name": "policy-model",
            "max_words": 8,
            "max_chars": 72,
        }
        config["suggestions"] = {
            "model_name": "suggestions-model",
        }
        config["summarization"] = {
            "enabled": True,
            "model_name": "summary-model",
            "trigger": [{"type": "messages", "value": 24}],
            "keep": {"type": "messages", "value": 8},
            "trim_tokens_to_summarize": 3000,
        }
        config["subagents"] = {
            "timeout_seconds": 1200,
            "agents": {"general-purpose": {"timeout_seconds": 600}},
        }

        new_version, warnings = repository.write_with_warnings(
            config_dict=config,
            expected_version=version,
        )

        persisted, persisted_version, _ = repository.read()
        loaded = get_app_config()

        assert warnings == []
        assert new_version == "2"
        assert persisted_version == "2"
        assert persisted["title"]["model_name"] == "policy-model"
        assert persisted["suggestions"]["model_name"] == "suggestions-model"
        assert persisted["summarization"]["trigger"][0]["value"] == 24
        assert persisted["subagents"]["agents"]["general-purpose"]["timeout_seconds"] == 600
        assert loaded.title.model_name == "policy-model"
        assert loaded.suggestions.model_name == "suggestions-model"
        assert loaded.summarization.keep.value == 8
        assert loaded.subagents.get_timeout_for("general-purpose") == 600
        assert loaded.subagents.timeout_seconds == 1200
    finally:
        reset_app_config()
        reset_extensions_config()


@pytest.mark.parametrize(
    ("section_name", "payload", "expected_path"),
    [
        (
            "title",
            {"enabled": True, "max_words": 0},
            ["title", "max_words"],
        ),
        (
            "summarization",
            {"enabled": True, "keep": "messages"},
            ["summarization", "keep"],
        ),
        (
            "subagents",
            {"timeout_seconds": 0},
            ["subagents", "timeout_seconds"],
        ),
        (
            "suggestions",
            "follow-current-chat-model",
            ["suggestions"],
        ),
    ],
)
def test_config_repository_rejects_invalid_session_policy_shapes(
    monkeypatch,
    tmp_path,
    section_name: str,
    payload,
    expected_path: list[str],
):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config[section_name] = payload

        with pytest.raises(ConfigValidationError) as exc_info:
            repository.write_with_warnings(config_dict=config, expected_version=version)

        assert exc_info.value.errors
        assert exc_info.value.errors[0]["path"] == expected_path
    finally:
        reset_app_config()
        reset_extensions_config()


def test_suggestions_router_prefers_configured_model_name(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    captured: dict[str, str | None] = {"name": None}

    class _FakeResponse:
        content = '["Q1", "Q2"]'

    class _FakeChatModel:
        def invoke(self, prompt):
            assert prompt[-1].content.startswith("Conversation:")
            return _FakeResponse()

    def _fake_create_chat_model(*, name=None, thinking_enabled=False):
        captured["name"] = name
        assert thinking_enabled is False
        return _FakeChatModel()

    monkeypatch.setattr(
        "app.gateway.routers.suggestions.create_chat_model",
        _fake_create_chat_model,
    )

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["suggestions"] = {"model_name": "suggestions-policy-model"}
        repository.write_with_warnings(config_dict=config, expected_version=version)

        with TestClient(create_app()) as client:
            response = client.post(
                "/api/threads/thread-1/suggestions",
                json={
                    "messages": [
                        {"role": "user", "content": "Hi"},
                        {"role": "assistant", "content": "Hello"},
                    ],
                    "n": 2,
                    "model_name": "request-model",
                },
            )

        assert response.status_code == 200
        assert response.json()["suggestions"] == ["Q1", "Q2"]
        assert captured["name"] == "suggestions-policy-model"
    finally:
        reset_app_config()
        reset_extensions_config()
