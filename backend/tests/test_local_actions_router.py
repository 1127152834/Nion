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


def test_local_actions_router_lists_history(monkeypatch, tmp_path) -> None:
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
            create_response = client.post(
                "/api/local-actions/plan",
                json={
                    "source_surface": "bridge",
                    "source_channel": "telegram",
                    "user_input": "Capture a screenshot of the current window",
                },
            )
            assert create_response.status_code == 201

            history_response = client.get("/api/local-actions/history")
            assert history_response.status_code == 200
            payload = history_response.json()
            assert payload["items"]
            assert payload["items"][0]["goal"]["goal_id"] == create_response.json()["goal"]["goal_id"]
    finally:
        reset_app_config()
        reset_extensions_config()


def test_local_actions_router_records_execution_result(monkeypatch, tmp_path) -> None:
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
            create_response = client.post(
                "/api/local-actions/plan",
                json={
                    "source_surface": "bridge",
                    "source_channel": "telegram",
                    "user_input": "Capture a screenshot of the current window",
                },
            )
            payload = create_response.json()

            result_response = client.post(
                f"/api/local-actions/executions/{payload['execution']['execution_id']}/result",
                json={
                    "executed_actions": [
                        {
                            **payload["plan"]["actions"][0],
                            "status": "succeeded",
                            "result_summary": "Captured active window",
                        }
                    ]
                },
            )

        assert result_response.status_code == 200
        result_payload = result_response.json()
        assert result_payload["goal"]["status"] == "completed"
        assert result_payload["execution"]["finished_at"] is not None
    finally:
        reset_app_config()
        reset_extensions_config()


def test_local_actions_router_approves_and_rejects_pending_execution(
    monkeypatch,
    tmp_path,
) -> None:
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
            first = client.post(
                "/api/local-actions/plan",
                json={
                    "source_surface": "bridge",
                    "source_channel": "telegram",
                    "user_input": "Organize my Downloads folder",
                },
            ).json()
            approve = client.post(
                f"/api/local-actions/executions/{first['execution']['execution_id']}/approve"
            )

            second = client.post(
                "/api/local-actions/plan",
                json={
                    "source_surface": "bridge",
                    "source_channel": "telegram",
                    "user_input": "Organize my Downloads folder",
                },
            ).json()
            reject = client.post(
                f"/api/local-actions/executions/{second['execution']['execution_id']}/reject"
            )

        assert approve.status_code == 200
        assert approve.json()["goal"]["status"] == "executing"
        assert approve.json()["execution"]["approval_status"] == "approved"
        assert reject.status_code == 200
        assert reject.json()["goal"]["status"] == "blocked"
        assert reject.json()["execution"]["approval_status"] == "rejected"
    finally:
        reset_app_config()
        reset_extensions_config()
