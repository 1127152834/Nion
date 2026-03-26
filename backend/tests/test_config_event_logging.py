import json

from fastapi.testclient import TestClient

from app.daemon.app import create_app
from app.gateway.app import create_app as create_gateway_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths
from nion.telemetry.store import TelemetryStore


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


def test_config_update_records_human_readable_event(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            read_response = client.get("/api/config")
            payload = read_response.json()

            update_response = client.put(
                "/api/config",
                json={"version": payload["version"], "config": _updated_config()},
            )
            assert update_response.status_code == 200

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="config")
        assert any(
            event.event_type == "config_update_applied"
            and event.message == "Config update applied"
            for event in events
        )
    finally:
        reset_app_config()
        reset_extensions_config()


def test_provider_creation_records_human_readable_event(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    _write_extensions_config(extensions_path)

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_MODEL_MANAGEMENT_SECRET", "test-secret")
    import nion.config.paths as paths_module

    paths_module._paths = None
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_gateway_app()) as client:
            templates_response = client.get("/api/model-admin/templates?category=global")
            template = next(
                item
                for item in templates_response.json()["templates"]
                if item["code"] == "openrouter"
            )

            create_response = client.post(
                "/api/model-admin/providers",
                json={
                    "provider_template_id": template["id"],
                    "display_name": "OpenRouter Main",
                    "api_key": "sk-test-1234",
                },
            )
            assert create_response.status_code == 200
            provider = create_response.json()["provider"]

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="model")
        create_event = next(event for event in events if event.event_type == "provider_created")
        assert create_event.message == "Created provider 'OpenRouter Main'"
        assert create_event.details["provider_id"] == provider["id"]
        assert create_event.details["provider_kind"] == provider["kind"]
    finally:
        reset_app_config()
        reset_extensions_config()
