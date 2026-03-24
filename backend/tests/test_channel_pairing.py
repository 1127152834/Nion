from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

from app.channels.message_bus import InboundMessage, InboundMessageType, MessageBus
from app.channels.store import ChannelStore
from app.channels.service import ChannelService


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def test_pair_request_must_be_approved_before_user_is_authorized(tmp_path):
    from app.channels.pairing_service import PairingService

    service = PairingService(base_dir=tmp_path)
    request = service.create_request(
        channel_name="telegram",
        chat_id="chat-1",
        user_id="u-1",
    )

    assert service.is_authorized("telegram", "chat-1", "u-1") is False

    service.approve(request.request_id)

    assert service.is_authorized("telegram", "chat-1", "u-1") is True


def test_authorization_is_per_user_within_a_chat(tmp_path):
    from app.channels.pairing_service import PairingService

    service = PairingService(base_dir=tmp_path)
    request = service.create_request(
        channel_name="telegram",
        chat_id="chat-1",
        user_id="u-1",
    )
    service.approve(request.request_id)

    assert service.is_authorized("telegram", "chat-1", "u-1") is True
    assert service.is_authorized("telegram", "chat-1", "u-2") is False


def test_service_status_includes_real_pairing_counts(tmp_path):
    from app.channels.pairing_service import PairingService

    pairing = PairingService(base_dir=tmp_path)
    approved = pairing.create_request(
        channel_name="telegram",
        chat_id="chat-1",
        user_id="u-1",
    )
    pending = pairing.create_request(
        channel_name="telegram",
        chat_id="chat-1",
        user_id="u-2",
    )
    pairing.approve(approved.request_id)

    service = ChannelService(
        channels_config={"telegram": {"enabled": False}},
        pairing_service=pairing,
    )
    status = service.get_status()

    assert status["pending_pair_requests"] == 1
    assert pending.request_id != approved.request_id
    assert status["channels"]["telegram"]["authorized_user_count"] == 1
    assert status["channels"]["telegram"]["pending_pair_request_count"] == 1


def test_unauthorized_chat_does_not_enter_runtime(tmp_path):
    from app.channels.manager import ChannelManager
    from app.channels.pairing_service import PairingService

    bus = MessageBus()
    store = ChannelStore(path=tmp_path / "store.json")
    pairing = PairingService(base_dir=tmp_path)
    manager = ChannelManager(bus=bus, store=store, pairing_service=pairing)
    manager._semaphore = asyncio.Semaphore(1)
    manager._handle_chat = AsyncMock()

    outbound: list[str] = []

    async def capture(msg):
        outbound.append(msg.text)

    bus.subscribe_outbound(capture)

    async def go():
        await manager._handle_message(
            InboundMessage(
                channel_name="telegram",
                chat_id="chat-1",
                user_id="u-1",
                text="hello",
            )
        )

    _run(go())

    manager._handle_chat.assert_not_awaited()
    assert outbound
    assert "approval" in outbound[0].lower()
    assert store.get_thread_id("telegram", "chat-1") is None


def test_help_command_bypasses_pairing(tmp_path):
    from app.channels.manager import ChannelManager
    from app.channels.pairing_service import PairingService

    bus = MessageBus()
    store = ChannelStore(path=tmp_path / "store.json")
    pairing = PairingService(base_dir=tmp_path)
    manager = ChannelManager(bus=bus, store=store, pairing_service=pairing)
    manager._semaphore = asyncio.Semaphore(1)
    manager._handle_command = AsyncMock()

    async def go():
        await manager._handle_message(
            InboundMessage(
                channel_name="telegram",
                chat_id="chat-1",
                user_id="u-1",
                text="/help",
                msg_type=InboundMessageType.COMMAND,
            )
        )

    _run(go())

    manager._handle_command.assert_awaited_once()


def test_new_command_does_not_bypass_pairing(tmp_path):
    from app.channels.manager import ChannelManager
    from app.channels.pairing_service import PairingService

    bus = MessageBus()
    store = ChannelStore(path=tmp_path / "store.json")
    pairing = PairingService(base_dir=tmp_path)
    manager = ChannelManager(bus=bus, store=store, pairing_service=pairing)
    manager._semaphore = asyncio.Semaphore(1)
    manager._handle_command = AsyncMock()

    outbound: list[str] = []

    async def capture(msg):
        outbound.append(msg.text)

    bus.subscribe_outbound(capture)

    async def go():
        await manager._handle_message(
            InboundMessage(
                channel_name="telegram",
                chat_id="chat-1",
                user_id="u-1",
                text="/new",
                msg_type=InboundMessageType.COMMAND,
            )
        )

    _run(go())

    manager._handle_command.assert_not_awaited()
    assert outbound
    assert "approval" in outbound[0].lower()
    assert store.get_thread_id("telegram", "chat-1") is None


def test_topic_id_does_not_change_authorization_subject(tmp_path):
    from app.channels.manager import ChannelManager
    from app.channels.pairing_service import PairingService

    bus = MessageBus()
    store = ChannelStore(path=tmp_path / "store.json")
    pairing = PairingService(base_dir=tmp_path)
    request = pairing.create_request(
        channel_name="telegram",
        chat_id="chat-1",
        user_id="u-1",
    )
    pairing.approve(request.request_id)

    manager = ChannelManager(bus=bus, store=store, pairing_service=pairing)
    manager._semaphore = asyncio.Semaphore(1)
    manager._handle_chat = AsyncMock()

    async def go():
        await manager._handle_message(
            InboundMessage(
                channel_name="telegram",
                chat_id="chat-1",
                topic_id="topic-1",
                user_id="u-1",
                text="hello",
            )
        )

    _run(go())

    manager._handle_chat.assert_awaited_once()
