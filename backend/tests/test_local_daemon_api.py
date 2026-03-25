from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def test_local_daemon_exposes_runtime_and_threads_routes() -> None:
    with TestClient(create_app()) as client:
        health = client.get("/health")
        runtime = client.get("/api/daemon/runtime-info")
        threads = client.post("/api/threads/search", json={"limit": 1})

        assert health.status_code == 200
        assert runtime.status_code == 200
        assert runtime.json()["host"] == "127.0.0.1"
        assert runtime.json()["mode"] == "local-daemon"
        assert threads.status_code == 200


def test_local_daemon_exposes_runtime_profile_and_model_admin_routes() -> None:
    with TestClient(create_app()) as client:
        runtime_profile = client.get("/api/threads/test-thread/runtime-profile")
        templates = client.get("/api/model-admin/templates?category=domestic")

        assert runtime_profile.status_code == 200
        assert runtime_profile.json()["execution_mode"] == "sandbox"
        assert templates.status_code == 200
        assert any(
            item["code"] == "minimax-cn"
            for item in templates.json()["templates"]
        )


def test_local_daemon_wires_shutdown_callback_when_provided() -> None:
    async def shutdown_callback() -> None:
        return None

    with TestClient(create_app(shutdown_callback=shutdown_callback)) as client:
        service = client.app.state.daemon_service
        assert service._shutdown_callback is shutdown_callback


def test_local_daemon_runtime_info_refreshes_after_config_update(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            before = client.get("/api/daemon/runtime-info")
            assert before.status_code == 200
            assert before.json()["allow_background_running"] is False

            config_response = client.get("/api/config")
            assert config_response.status_code == 200
            payload = config_response.json()
            config = payload["config"]
            daemon_config = config.setdefault("daemon", {})
            daemon_config["allow_background_running"] = True

            update = client.put(
                "/api/config",
                json={"version": payload["version"], "config": config},
            )
            assert update.status_code == 200

            after = client.get("/api/daemon/runtime-info")
            assert after.status_code == 200
            assert after.json()["allow_background_running"] is True
    finally:
        reset_app_config()
        reset_extensions_config()
