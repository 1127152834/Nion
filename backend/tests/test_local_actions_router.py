from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def test_local_actions_router_creates_a_plan_record(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(tmp_path / ".nion-data"))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            response = client.post(
                "/api/local-actions/plan",
                json={
                    "source_surface": "bridge",
                    "source_channel": "telegram",
                    "user_input": "Organize my Downloads folder",
                },
            )

        assert response.status_code == 201
        payload = response.json()
        assert payload["goal"]["status"] in {"blocked", "awaiting_review", "executing"}
        assert payload["plan"]["goal_id"] == payload["goal"]["goal_id"]
        assert payload["execution"]["goal_id"] == payload["goal"]["goal_id"]
    finally:
        reset_app_config()
        reset_extensions_config()
