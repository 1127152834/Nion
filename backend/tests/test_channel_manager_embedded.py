from app.channels.manager import ChannelManager, EmbeddedRuntimeClient
from app.channels.message_bus import MessageBus
from app.channels.store import ChannelStore


def test_channel_manager_uses_embedded_runtime_when_desktop_mode_enabled(tmp_path) -> None:
    manager = ChannelManager(
        bus=MessageBus(),
        store=ChannelStore(path=tmp_path / "store.json"),
        runtime_mode="embedded",
    )

    assert manager.runtime_mode == "embedded"
    assert isinstance(manager._get_client(), EmbeddedRuntimeClient)
