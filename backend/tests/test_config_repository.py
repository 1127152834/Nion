from __future__ import annotations

import json

import pytest

from nion.config.app_config import get_app_config, reset_app_config
from nion.config.config_repository import ConfigRepository, ConfigValidationError
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path):
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _model_payload(name: str = "test-model") -> dict:
    return {
        "name": name,
        "use": "langchain_openai:ChatOpenAI",
        "model": "gpt-test",
        "supports_thinking": False,
    }


def test_config_repository_round_trips_and_reloads_runtime(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        repository = ConfigRepository()
        config, version, source_path = repository.read()

        assert version == "1"
        assert source_path == db_path.resolve()

        config["models"] = [_model_payload()]
        new_version, warnings = repository.write_with_warnings(
            config_dict=config,
            expected_version=version,
        )

        persisted, persisted_version, _ = repository.read()
        loaded = get_app_config()

        assert warnings == []
        assert new_version == "2"
        assert persisted_version == "2"
        assert persisted["models"][0]["name"] == "test-model"
        assert loaded.models[0].name == "test-model"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_config_repository_raises_validation_error_for_invalid_payload(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["models"] = "broken"

        with pytest.raises(ConfigValidationError) as exc_info:
            repository.write_with_warnings(config_dict=config, expected_version=version)

        assert exc_info.value.errors
        assert exc_info.value.errors[0]["path"] == ["models"]
    finally:
        reset_app_config()
        reset_extensions_config()

