from nion.compaction.store import CompactionStore


def test_compaction_store_round_trips_logs(tmp_path):
    store = CompactionStore(tmp_path / "telemetry.sqlite3")

    store.append_log(status="succeeded", summary="Compacted memory", message_count=3)

    logs = store.list_logs(limit=10, offset=0)

    assert len(logs) == 1
    assert logs[0].summary == "Compacted memory"
