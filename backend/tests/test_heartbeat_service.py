from nion.heartbeat.service import HeartbeatService


def test_heartbeat_service_records_tick_result(tmp_path):
    service = HeartbeatService(base_dir=tmp_path)

    did_run = service.tick()

    assert did_run in {True, False}
    status = service.status()
    assert "running" in status
    assert "last_tick_at" in status
