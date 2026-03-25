from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path):
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _updated_config() -> dict:
    return {
        "models": [
            {
                "name": "gateway-model",
                "use": "langchain_openai:ChatOpenAI",
                "model": "gpt-test",
            }
        ],
        "tools": [],
        "tool_groups": [],
        "sandbox": {"use": "nion.sandbox.local:LocalSandboxProvider"},
    }


def test_gateway_config_api_round_trip(monkeypatch, tmp_path):
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
            assert read_payload["version"] == "1"
            assert read_payload["config"]["sandbox"]["use"] == "nion.sandbox.local:LocalSandboxProvider"

            schema_response = client.get("/api/config/schema")
            assert schema_response.status_code == 200
            schema_payload = schema_response.json()
            assert "daemon" in schema_payload["sections"]
            assert "daemon" in schema_payload["order"]
            assert "models" in schema_payload["sections"]
            assert "sandbox" in schema_payload["order"]

            validate_response = client.post("/api/config/validate", json={"config": _updated_config()})
            assert validate_response.status_code == 200
            assert validate_response.json()["valid"] is True

            update_response = client.put(
                "/api/config",
                json={"version": "1", "config": _updated_config()},
            )
            assert update_response.status_code == 200
            update_payload = update_response.json()
            assert update_payload["version"] == "2"
            assert update_payload["config"]["models"][0]["name"] == "gateway-model"

            conflict_response = client.put(
                "/api/config",
                json={"version": "1", "config": _updated_config()},
            )
            assert conflict_response.status_code == 409

            runtime_response = client.get("/api/config/runtime-status")
            assert runtime_response.status_code == 200
            runtime_payload = runtime_response.json()
            assert runtime_payload["store_version"] == "2"
            assert runtime_payload["loaded_version"] == "2"
            assert runtime_payload["is_in_sync"] is True
    finally:
        reset_app_config()
        reset_extensions_config()
