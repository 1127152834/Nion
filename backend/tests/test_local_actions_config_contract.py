import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.daemon_config import DaemonConfig
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def test_api_config_exposes_local_actions_permission_mode(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            read_response = client.get("/api/config")
            assert read_response.status_code == 200

            read_payload = read_response.json()
            assert read_payload["config"]["daemon"]["local_actions_permission_mode"] == "review_required"
            assert "local_actions_permission_mode: review_required" in read_payload["yaml_text"]

            config_payload = read_payload["config"]
            config_payload["daemon"]["local_actions_permission_mode"] = "allow_all"

            update_response = client.put(
                "/api/config",
                json={"version": read_payload["version"], "config": config_payload},
            )
            assert update_response.status_code == 200

            update_payload = update_response.json()
            assert update_payload["config"]["daemon"]["local_actions_permission_mode"] == "allow_all"
            assert "local_actions_permission_mode: allow_all" in update_payload["yaml_text"]

            reload_response = client.get("/api/config")
            assert reload_response.status_code == 200
            reload_payload = reload_response.json()
            assert reload_payload["config"]["daemon"]["local_actions_permission_mode"] == "allow_all"
    finally:
        reset_app_config()
        reset_extensions_config()


def test_api_config_adds_only_local_actions_daemon_default(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            response = client.get("/api/config")
            assert response.status_code == 200

            config_payload = response.json()["config"]
            assert config_payload["daemon"] == {
                "local_actions_permission_mode": "review_required"
            }
            assert "document_conversion" not in config_payload
            assert "extensions" not in config_payload
            assert "subagents" not in config_payload
            assert "suggestions" not in config_payload
            assert "tool_search" not in config_payload
    finally:
        reset_app_config()
        reset_extensions_config()


def test_daemon_config_defaults_local_actions_permission_mode() -> None:
    default_config = DaemonConfig()
    explicit_config = DaemonConfig(local_actions_permission_mode="allow_all")

    assert default_config.local_actions_permission_mode == "review_required"
    assert explicit_config.local_actions_permission_mode == "allow_all"
