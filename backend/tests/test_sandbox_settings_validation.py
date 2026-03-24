from __future__ import annotations

import json

import pytest

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


def test_config_repository_round_trips_sandbox_and_checkpointer_settings(monkeypatch, tmp_path):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["sandbox"] = {
            "use": "nion.community.aio_sandbox:AioSandboxProvider",
            "strict_mode": True,
            "auto_start": True,
            "image": "ghcr.io/example/sandbox:latest",
            "port": 8080,
            "base_url": "http://localhost:8080",
            "container_prefix": "nion-sandbox",
            "idle_timeout": 600,
        }
        config["checkpointer"] = {
            "type": "sqlite",
            "connection_string": "checkpoints.db",
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
        assert persisted["sandbox"]["strict_mode"] is True
        assert persisted["sandbox"]["base_url"] == "http://localhost:8080"
        assert loaded.sandbox.strict_mode is True
        assert loaded.sandbox.auto_start is True
        assert loaded.checkpointer.type == "sqlite"
        assert loaded.checkpointer.connection_string == "checkpoints.db"
    finally:
        reset_app_config()
        reset_extensions_config()


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        (
            ["sandbox"],
            {
                "use": "nion.sandbox.local:LocalSandboxProvider",
                "strict_mode": True,
            },
        ),
        (
            ["checkpointer"],
            {
                "type": "sqlite",
                "connection_string": "",
            },
        ),
    ],
)
def test_config_repository_rejects_invalid_sandbox_settings(
    monkeypatch,
    tmp_path,
    path: list[str],
    payload,
):
    _configure_store(monkeypatch, tmp_path)

    try:
        repository = ConfigRepository()
        config, version, _ = repository.read()
        config[path[0]] = payload

        with pytest.raises(ConfigValidationError) as exc_info:
            repository.write_with_warnings(config_dict=config, expected_version=version)

        assert exc_info.value.errors
        assert exc_info.value.errors[0]["path"] == path
    finally:
        reset_app_config()
        reset_extensions_config()
