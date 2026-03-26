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
