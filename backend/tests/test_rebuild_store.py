from nion.rebuild.store import RebuildStore


def test_rebuild_store_round_trips_logs(tmp_path):
    store = RebuildStore(tmp_path / "telemetry.sqlite3")

    store.append_log(status="succeeded", summary="Rebuilt memory", source_count=2)

    logs = store.list_logs(limit=10, offset=0)

    assert len(logs) == 1
    assert logs[0].summary == "Rebuilt memory"
