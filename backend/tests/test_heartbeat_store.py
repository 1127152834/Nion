from nion.heartbeat.store import HeartbeatStore


def test_heartbeat_store_round_trips_logs(tmp_path):
    store = HeartbeatStore(tmp_path / "telemetry.sqlite3")

    store.append_log(bot_id="local-agent", status="succeeded", summary="tick")

    logs = store.list_logs(bot_id="local-agent", limit=10, offset=0)

    assert len(logs) == 1
    assert logs[0].summary == "tick"
