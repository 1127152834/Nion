from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.channels.repository import ChannelRepository
from app.daemon.app import create_app
from nion.config import paths as paths_module
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths
from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore


def _write_extensions_config(path) -> None:
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def _configure_test_env(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    nion_home = tmp_path / "nion-home"
    _write_extensions_config(extensions_path)

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(nion_home))
    paths_module._paths = None
    reset_app_config()
    reset_extensions_config()


def _stub_daemon_channel_lifecycle(monkeypatch) -> None:
    async def fake_start_channel_service():
        return None

    async def fake_stop_channel_service() -> None:
        return None

    monkeypatch.setattr("app.daemon.app.start_channel_service", fake_start_channel_service)
    monkeypatch.setattr("app.daemon.app.stop_channel_service", fake_stop_channel_service)


def test_daemon_channels_status_api_returns_service_status(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    class FakeChannelService:
        def get_status(self):
            return {
                "service_running": True,
                "pending_pair_requests": 1,
                "channels": {
                    "feishu": {
                        "enabled": True,
                        "running": True,
                        "capabilities": {"supports_streaming": True},
                        "last_heartbeat": 123.0,
                        "last_error": None,
                        "authorized_user_count": 2,
                        "pending_pair_request_count": 1,
                        "can_restart": True,
                    }
                },
            }

    monkeypatch.setattr("app.channels.service.get_channel_service", lambda: FakeChannelService())

    try:
        with TestClient(create_app()) as client:
            response = client.get("/api/daemon/channels")

        assert response.status_code == 200
        payload = response.json()
        assert payload["service_running"] is True
        assert "channels" in payload
        assert payload["channels"]["feishu"]["running"] is True
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_diagnostics_api_returns_snapshot(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)
    monkeypatch.setattr("app.channels.service.get_channel_service", lambda: None)

    try:
        store = TelemetryStore(get_paths().telemetry_db_file)
        store.upsert_snapshot(
            DiagnosticSnapshot(
                scope_type="channel",
                scope_id="feishu",
                status="error",
                summary="Channel 'feishu' failed to start",
                details={"channel_name": "feishu", "running": False},
            )
        )

        with TestClient(create_app()) as client:
            response = client.get("/api/daemon/channels/feishu")

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "error"
        assert payload["details"]["channel_name"] == "feishu"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_pair_requests_api_returns_seeded_requests(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        repo = ChannelRepository()
        seeded = repo.create_pair_request(
            "lark",
            code="654321",
            external_user_id="ou_seeded",
            external_user_name="Seeded User",
            chat_id="oc_seeded",
            conversation_type="group",
            source_event_id="evt_seeded",
        )

        with TestClient(create_app()) as client:
            response = client.get("/api/daemon/channels/lark/pair-requests", params={"status": "pending"})

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 1
        assert payload[0]["id"] == seeded["id"]
        assert payload[0]["status"] == "pending"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_authorized_users_api_returns_seeded_users(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        repo = ChannelRepository()
        seeded = repo.create_pair_request(
            "lark",
            code="654321",
            external_user_id="ou_seeded",
            external_user_name="Seeded User",
            chat_id="oc_seeded",
            conversation_type="group",
            source_event_id="evt_seeded",
        )
        repo.decide_pair_request(
            seeded["id"],
            status="approved",
            handled_by="ui",
            workspace_id="default",
        )

        with TestClient(create_app()) as client:
            response = client.get("/api/daemon/channels/lark/authorized-users")

        assert response.status_code == 200
        payload = response.json()
        assert len(payload) == 1
        assert payload[0]["workspace_id"] == "default"
        assert payload[0]["external_user_id"] == "ou_seeded"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()
