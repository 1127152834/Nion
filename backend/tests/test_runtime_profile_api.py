import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path):
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def test_runtime_profile_api_supports_web_host_mode_without_directory(
    monkeypatch, tmp_path
):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(tmp_path / ".nion-data"))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            get_response = client.get("/api/threads/thread-123/runtime-profile")
            assert get_response.status_code == 200
            assert get_response.json()["execution_mode"] == "sandbox"

            update_response = client.put(
                "/api/threads/thread-123/runtime-profile",
                json={"execution_mode": "host", "host_workdir": None},
            )
            assert update_response.status_code == 200
            payload = update_response.json()
            assert payload["execution_mode"] == "host"
            assert payload["host_workdir"] is None
    finally:
        reset_app_config()
        reset_extensions_config()


def test_runtime_profile_api_allows_host_mode_when_strict_sandbox_is_enabled(
    monkeypatch, tmp_path
):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(tmp_path / ".nion-data"))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            config_response = client.get("/api/config")
            payload = config_response.json()
            payload["config"]["sandbox"] = {
                "use": "nion.community.aio_sandbox:AioSandboxProvider",
                "strict_mode": True,
            }

            save_response = client.put("/api/config", json=payload)
            assert save_response.status_code == 200

            update_response = client.put(
                "/api/threads/thread-456/runtime-profile",
                json={"execution_mode": "host", "host_workdir": None},
            )
            assert update_response.status_code == 200
            assert update_response.json()["execution_mode"] == "host"
    finally:
        reset_app_config()
        reset_extensions_config()
