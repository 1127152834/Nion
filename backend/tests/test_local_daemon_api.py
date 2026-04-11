from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import reset_paths


def test_local_daemon_exposes_runtime_and_threads_routes() -> None:
    with TestClient(create_app()) as client:
        health = client.get("/health")
        runtime = client.get("/api/daemon/runtime-info")
        threads = client.post("/api/threads/search", json={"limit": 1})
        memory = client.get("/api/memory")
        recall = client.get("/api/recall/search", params={"q": "test", "limit": 1})

        assert health.status_code == 200
        assert runtime.status_code == 200
        assert runtime.json()["host"] == "127.0.0.1"
        assert runtime.json()["mode"] == "local-daemon"
        assert threads.status_code == 200
        assert memory.status_code == 200
        assert recall.status_code == 200


def test_local_daemon_keeps_memory_and_notebook_without_new_memory_surfaces() -> None:
    with TestClient(create_app()) as client:
        memory = client.get("/api/memory")
        notebook = client.get("/api/notebook/tree")
        memory_os = client.get("/api/memory-os/providers/families")
        maintenance = client.get("/api/self-maintenance/status")

        assert memory.status_code == 200
        assert notebook.status_code in {200, 204}
        assert memory_os.status_code == 404
        assert maintenance.status_code == 404


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


def test_local_daemon_exposes_user_identity_route(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()
    with TestClient(create_app()) as client:
        response = client.get("/api/user-identity")

    assert response.status_code == 200
    assert response.json()["user_name"] == ""


def test_local_daemon_heartbeat_can_recover_a_missing_client_session() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/daemon/clients/electron-recovered/heartbeat",
            json={"client_type": "electron"},
        )
        runtime = client.get("/api/daemon/runtime-info")

    assert response.status_code == 204
    assert runtime.status_code == 200
    assert runtime.json()["clients"]["electron"] == 1


def test_local_daemon_exposes_artifacts_and_uploads_routes() -> None:
    with TestClient(create_app()) as client:
        uploads = client.get("/api/threads/test-thread/uploads/list")
        artifact = client.get(
            "/api/threads/test-thread/artifacts/mnt/user-data/outputs/missing.txt",
        )

        assert uploads.status_code == 200
        assert artifact.status_code == 404
        assert "Artifact not found" in artifact.json()["detail"]


def test_local_daemon_wires_shutdown_callback_when_provided() -> None:
    async def shutdown_callback() -> None:
        return None

    with TestClient(create_app(shutdown_callback=shutdown_callback)) as client:
        service = client.app.state.daemon_service
        assert service._shutdown_callback is shutdown_callback


def test_local_daemon_starts_channel_service_in_lifespan(monkeypatch) -> None:
    started = {"count": 0}

    async def fake_start_channel_service():
        started["count"] += 1

        class FakeChannelService:
            def get_status(self):
                return {"service_running": True, "channels": {}}

        return FakeChannelService()

    async def fake_stop_channel_service() -> None:
        return None

    monkeypatch.setattr("app.daemon.app.start_channel_service", fake_start_channel_service)
    monkeypatch.setattr("app.daemon.app.stop_channel_service", fake_stop_channel_service)

    with TestClient(create_app()):
        pass

    assert started["count"] == 1


def test_local_daemon_survives_channel_service_start_failure(monkeypatch) -> None:
    started = {"count": 0}
    stopped = {"count": 0}
    daemon_stopped = {"count": 0}

    async def fake_start_channel_service():
        started["count"] += 1
        raise RuntimeError("boom")

    async def fake_stop_channel_service() -> None:
        stopped["count"] += 1

    async def fake_daemon_stop(_self) -> None:
        daemon_stopped["count"] += 1

    monkeypatch.setattr("app.daemon.app.start_channel_service", fake_start_channel_service)
    monkeypatch.setattr("app.daemon.app.stop_channel_service", fake_stop_channel_service)
    monkeypatch.setattr("app.daemon.app.LocalDaemonService.stop", fake_daemon_stop)

    with TestClient(create_app()) as client:
        runtime = client.get("/api/daemon/runtime-info")
        assert runtime.status_code == 200
        assert runtime.json()["mode"] == "local-daemon"

    assert started["count"] == 1
    assert stopped["count"] == 1
    assert daemon_stopped["count"] == 1


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
