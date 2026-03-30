from nion.heartbeat.service import HeartbeatService


def test_heartbeat_service_records_tick_result(tmp_path):
    service = HeartbeatService(base_dir=tmp_path)

    did_run = service.tick()

    assert did_run in {True, False}
    status = service.status()
    assert "running" in status
    assert "last_tick_at" in status


def test_heartbeat_service_tick_runs_maintenance_action(tmp_path):
    calls: list[str] = []
    service = HeartbeatService(
        base_dir=tmp_path,
        run_maintenance=lambda: calls.append("maintenance") or False,
    )

    did_run = service.tick()

    assert did_run is True
    assert calls == ["maintenance"]
    logs = service.list_logs(limit=10, offset=0)
    assert len(logs) == 1
    assert logs[0].details["maintenance_triggered"] is True
