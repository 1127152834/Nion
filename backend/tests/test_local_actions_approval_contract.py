from __future__ import annotations

from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def test_local_actions_plan_returns_typed_local_action_plan_approval(
    monkeypatch,
    tmp_path,
):
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
        assert payload["execution"]["approval_status"] == "pending"
        approval = payload["approval_request"]
        assert approval["approval_kind"] == "local_action_plan"
        assert (
            approval["local_action_result"]["execution_id"]
            == payload["execution"]["execution_id"]
        )
        assert approval["local_action_result"]["plan_id"] == payload["plan"]["plan_id"]
        assert approval["local_action_result"]["actions"] == payload["plan"]["actions"]
        assert "tool_permission_result" not in approval
    finally:
        reset_app_config()
        reset_extensions_config()
