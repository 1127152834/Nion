from __future__ import annotations

from app.channels.db import ChannelDatabase
from app.channels.repository import ChannelRepository


def test_channel_repository_round_trips_config_pairing_and_authorization(tmp_path):
    db = ChannelDatabase(tmp_path / "channels.db")
    repo = ChannelRepository(db)

    config = repo.upsert_channel_config(
        "lark",
        enabled=True,
        mode="webhook",
        credentials={"app_id": "cli_123", "app_secret": "secret"},
        default_workspace_id="default",
        session={"assistant_id": "lead_agent"},
    )

    assert config["platform"] == "lark"
    assert config["enabled"] is True
    assert config["credentials"]["app_id"] == "cli_123"
    assert config["session"]["assistant_id"] == "lead_agent"

    pairing = repo.create_pairing_code(
        "lark",
        code="123456",
        expires_at="2099-01-01T00:00:00+00:00",
    )
    assert pairing["platform"] == "lark"
    assert pairing["code"] == "123456"

    request = repo.create_pair_request(
        "lark",
        code="123456",
        external_user_id="ou_123",
        external_user_name="Alice",
        chat_id="oc_123",
        conversation_type="group",
        source_event_id="evt_1",
    )
    assert request["status"] == "pending"

    approved = repo.decide_pair_request(
        request["id"],
        status="approved",
        handled_by="tester",
        workspace_id="default",
    )
    assert approved["status"] == "approved"

    users = repo.list_authorized_users("lark")
    assert len(users) == 1
    assert users[0]["external_user_name"] == "Alice"
    assert users[0]["workspace_id"] == "default"

    updated_user = repo.update_authorized_user_session_override(
        users[0]["id"],
        {
            "assistant_id": "channel-agent",
            "context": {"thinking_enabled": False},
        },
    )
    assert updated_user["session_override"]["assistant_id"] == "channel-agent"
    assert updated_user["session_override"]["context"]["thinking_enabled"] is False

    revoked = repo.revoke_authorized_user(users[0]["id"])
    assert revoked["revoked_at"] is not None


def test_channel_repository_filters_pair_requests_by_status(tmp_path):
    db = ChannelDatabase(tmp_path / "channels.db")
    repo = ChannelRepository(db)

    first = repo.create_pair_request(
        "telegram",
        code="111111",
        external_user_id="u1",
        external_user_name="User 1",
        chat_id="c1",
        conversation_type="direct",
        source_event_id=None,
    )
    second = repo.create_pair_request(
        "telegram",
        code="222222",
        external_user_id="u2",
        external_user_name="User 2",
        chat_id="c2",
        conversation_type="direct",
        source_event_id=None,
    )

    repo.decide_pair_request(second["id"], status="rejected")

    pending = repo.list_pair_requests("telegram", status="pending")
    rejected = repo.list_pair_requests("telegram", status="rejected")

    assert [item["id"] for item in pending] == [first["id"]]
    assert [item["id"] for item in rejected] == [second["id"]]
