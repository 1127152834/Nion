from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.channels.repository import ChannelRepository
from app.gateway.app import create_app
from nion.config import paths as paths_module
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def _write_extensions_config(path):
    path.write_text(json.dumps({"mcpServers": {}, "skills": {}}), encoding="utf-8")


def test_channels_api_config_and_runtime(monkeypatch, tmp_path):
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

    try:
        repo = ChannelRepository()
        seed_request = repo.create_pair_request(
            "lark",
            code="654321",
            external_user_id="ou_seeded",
            external_user_name="Seeded User",
            chat_id="oc_seeded",
            conversation_type="group",
            source_event_id="evt_seeded",
        )

        with TestClient(create_app()) as client:
            get_response = client.get("/api/channels/lark/config")
            assert get_response.status_code == 200
            assert get_response.json()["enabled"] is False
            assert get_response.json()["mode"] == "webhook"

            put_response = client.put(
                "/api/channels/lark/config",
                json={
                    "enabled": True,
                    "mode": "stream",
                    "credentials": {
                        "app_id": "cli_123",
                        "app_secret": "secret",
                    },
                    "default_workspace_id": "default",
                    "session": {"assistant_id": "lead_agent"},
                },
            )
            assert put_response.status_code == 200
            updated = put_response.json()
            assert updated["enabled"] is True
            assert updated["credentials"]["app_id"] == "cli_123"
            assert updated["session"]["assistant_id"] == "lead_agent"

            test_response = client.post(
                "/api/channels/lark/test",
                json={"credentials": {"app_id": "cli_123", "app_secret": "secret"}},
            )
            assert test_response.status_code == 200
            assert test_response.json()["success"] is True

            missing_response = client.post(
                "/api/channels/telegram/test",
                json={"credentials": {}},
            )
            assert missing_response.status_code == 200
            assert missing_response.json()["success"] is False

            runtime_response = client.get("/api/channels/lark/runtime")
            assert runtime_response.status_code == 200
            runtime_payload = runtime_response.json()
            assert runtime_payload["platform"] == "lark"
            assert runtime_payload["enabled"] is True
            assert runtime_payload["mode"] == "stream"

            pairing_response = client.post(
                "/api/channels/lark/pairing-code",
                json={"ttl_minutes": 15},
            )
            assert pairing_response.status_code == 201
            pairing_payload = pairing_response.json()
            assert pairing_payload["platform"] == "lark"
            assert len(pairing_payload["code"]) == 6

            list_pending_response = client.get("/api/channels/lark/pair-requests?status=pending")
            assert list_pending_response.status_code == 200
            pending_payload = list_pending_response.json()
            assert len(pending_payload) == 1
            assert pending_payload[0]["id"] == seed_request["id"]

            approve_response = client.post(
                f"/api/channels/lark/pair-requests/{seed_request['id']}/approve",
                json={"handled_by": "ui", "workspace_id": "default"},
            )
            assert approve_response.status_code == 200
            assert approve_response.json()["status"] == "approved"

            users_response = client.get("/api/channels/lark/authorized-users")
            assert users_response.status_code == 200
            users_payload = users_response.json()
            assert len(users_payload) == 1
            assert users_payload[0]["workspace_id"] == "default"

            override_response = client.post(
                f"/api/channels/lark/authorized-users/{users_payload[0]['id']}/session-override",
                json={"assistant_id": "channel-agent", "context": {"thinking_enabled": False}},
            )
            assert override_response.status_code == 200
            assert override_response.json()["session_override"]["assistant_id"] == "channel-agent"

            revoke_response = client.post(
                f"/api/channels/lark/authorized-users/{users_payload[0]['id']}/revoke",
                json={"handled_by": "ui"},
            )
            assert revoke_response.status_code == 200
            assert revoke_response.json()["revoked"] is True
    finally:
        paths_module._paths = None
        reset_app_config()
        reset_extensions_config()
