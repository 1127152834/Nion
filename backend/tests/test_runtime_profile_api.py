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

