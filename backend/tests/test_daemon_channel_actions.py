from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.channels.repository import ChannelRepository
from app.channels.telemetry import record_channel_restart_completed
from app.daemon.app import create_app
from nion.config import paths as paths_module
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config
from nion.config.paths import get_paths
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


def test_daemon_channel_restart_action_returns_result_and_logs_event(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    class FakeChannelService:
        async def restart_channel(self, name: str) -> bool:
            assert name == "feishu"
            record_channel_restart_completed(name)
            return True

    monkeypatch.setattr("app.channels.service.get_channel_service", lambda: FakeChannelService())

    try:
        with TestClient(create_app()) as client:
            response = client.post("/api/daemon/channels/feishu/restart")

        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="channel")
        assert any(event.event_type == "channel_restart_completed" for event in events)
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_restart_action_returns_503_without_channel_service(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)
    monkeypatch.setattr("app.channels.service.get_channel_service", lambda: None)

    try:
        with TestClient(create_app()) as client:
            response = client.post("/api/daemon/channels/feishu/restart")

        assert response.status_code == 503
        assert response.json()["detail"] == "Channel service is not running"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_pairing_code_action_issues_code_and_logs_event(monkeypatch, tmp_path) -> None:
    _configure_test_env(monkeypatch, tmp_path)
    _stub_daemon_channel_lifecycle(monkeypatch)

    try:
        with TestClient(create_app()) as client:
            response = client.post("/api/daemon/channels/lark/pairing-code", json={"ttl_minutes": 15})

        assert response.status_code == 201
        payload = response.json()
        assert payload["platform"] == "lark"
        assert len(payload["code"]) == 6

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="channel")
        assert any(event.event_type == "channel_pairing_code_issued" for event in events)
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_approve_pair_request_returns_request_and_logs_event(monkeypatch, tmp_path) -> None:
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
            response = client.post(
                f"/api/daemon/channels/lark/pair-requests/{seeded['id']}/approve",
                json={"handled_by": "daemon", "workspace_id": "default"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "approved"

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="channel")
        assert any(event.event_type == "channel_pair_request_approved" for event in events)
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_approve_pair_request_rejects_cross_platform_mismatch(monkeypatch, tmp_path) -> None:
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
            response = client.post(
                f"/api/daemon/channels/telegram/pair-requests/{seeded['id']}/approve",
                json={"handled_by": "daemon", "workspace_id": "default"},
            )

        assert response.status_code == 404
        request = repo.get_pair_request(seeded["id"])
        assert request["status"] == "pending"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_reject_pair_request_returns_request_and_logs_event(monkeypatch, tmp_path) -> None:
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
            response = client.post(
                f"/api/daemon/channels/lark/pair-requests/{seeded['id']}/reject",
                json={"handled_by": "daemon", "note": "denied"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "rejected"

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="channel")
        assert any(event.event_type == "channel_pair_request_rejected" for event in events)
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_reject_pair_request_rejects_cross_platform_mismatch(monkeypatch, tmp_path) -> None:
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
            response = client.post(
                f"/api/daemon/channels/telegram/pair-requests/{seeded['id']}/reject",
                json={"handled_by": "daemon", "note": "denied"},
            )

        assert response.status_code == 404
        request = repo.get_pair_request(seeded["id"])
        assert request["status"] == "pending"
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_revoke_authorized_user_returns_result_and_logs_event(monkeypatch, tmp_path) -> None:
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
        approved = repo.decide_pair_request(
            seeded["id"],
            status="approved",
            handled_by="daemon",
            workspace_id="default",
        )
        users = repo.list_authorized_users("lark")
        user_id = users[0]["id"]

        with TestClient(create_app()) as client:
            response = client.post(
                f"/api/daemon/channels/lark/authorized-users/{user_id}/revoke",
                json={"handled_by": "daemon"},
            )

        assert approved["status"] == "approved"
        assert response.status_code == 200
        payload = response.json()
        assert payload["revoked"] is True

        store = TelemetryStore(get_paths().telemetry_db_file)
        events = store.list_events(limit=10, category="channel")
        assert any(event.event_type == "channel_authorized_user_revoked" for event in events)
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()


def test_daemon_channel_revoke_authorized_user_rejects_cross_platform_mismatch(
    monkeypatch,
    tmp_path,
) -> None:
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
            handled_by="daemon",
            workspace_id="default",
        )
        users = repo.list_authorized_users("lark")
        user_id = users[0]["id"]

        with TestClient(create_app()) as client:
            response = client.post(
                f"/api/daemon/channels/telegram/authorized-users/{user_id}/revoke",
                json={"handled_by": "daemon"},
            )

        assert response.status_code == 404
        user = repo.get_authorized_user(user_id)
        assert user["revoked_at"] is None
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()
