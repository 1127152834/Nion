import asyncio

from app.channels.service import ChannelService
from nion.telemetry.store import TelemetryStore


def test_channel_service_records_channel_started_event(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    from app.channels.telemetry import record_channel_started

    record_channel_started("feishu")

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, category="channel")
    snapshot = store.get_snapshot("channel", "feishu")

    assert events[0].event_type == "channel_started"
    assert events[0].actor == "feishu"
    assert snapshot.status == "healthy"


def test_channel_service_stop_records_channel_stopped_snapshot(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    class FakeChannel:
        is_running = True

        async def stop(self) -> None:
            return None

    async def fake_manager_stop() -> None:
        return None

    service = ChannelService(channels_config={})
    service._channels = {"feishu": FakeChannel()}
    service._running = True
    service.manager.stop = fake_manager_stop  # type: ignore[method-assign]

    asyncio.run(service.stop())

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    snapshot = store.get_snapshot("channel", "feishu")

    assert snapshot.status == "degraded"
    assert snapshot.summary == "Channel 'feishu' stopped"


def test_channel_service_stop_records_channel_stop_failed_event(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    class FailingChannel:
        is_running = True

        async def stop(self) -> None:
            raise RuntimeError("boom")

    async def fake_manager_stop() -> None:
        return None

    service = ChannelService(channels_config={})
    service._channels = {"feishu": FailingChannel()}
    service._running = True
    service.manager.stop = fake_manager_stop  # type: ignore[method-assign]

    asyncio.run(service.stop())

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, category="channel")
    snapshot = store.get_snapshot("channel", "feishu")

    assert any(event.event_type == "channel_stop_failed" for event in events)
    assert snapshot.status == "error"
