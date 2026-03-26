from __future__ import annotations

import json

import pytest

from nion.config.app_config import ensure_latest_app_config, reload_app_config, reset_app_config
from nion.config.config_repository import ConfigRepository
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def test_get_app_config_reloads_when_store_changes(tmp_path, monkeypatch):
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
        config["models"] = [
            {
                "name": "first-model",
                "use": "langchain_openai:ChatOpenAI",
                "model": "gpt-test",
                "supports_thinking": False,
            }
        ]
        repository.write(config, version)

        initial = ensure_latest_app_config()
        assert initial.models[0].supports_thinking is False

        config, version, _ = repository.read()
        config["models"][0]["supports_thinking"] = True
        repository.write(config, version)

        reloaded = ensure_latest_app_config()
        assert reloaded.models[0].supports_thinking is True
        assert reloaded is not initial
    finally:
        reset_app_config()
        reset_extensions_config()


def test_reload_app_config_rejects_legacy_config_path(tmp_path, monkeypatch):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        with pytest.raises(
            ValueError,
            match="config_path is no longer supported",
        ):
            reload_app_config("/tmp/config.yaml")
    finally:
        reset_app_config()
        reset_extensions_config()
