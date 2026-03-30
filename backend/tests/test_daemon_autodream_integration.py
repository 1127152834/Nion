from app.daemon.service import LocalDaemonService


def test_daemon_service_initializes_autodream_scheduler_state(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    service = LocalDaemonService(
        host="127.0.0.1",
        port=12345,
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
    )

    assert service.autodream_status()["session_count_since_last_run"] == 0


def test_daemon_service_records_completed_sessions_for_autodream(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    service = LocalDaemonService(
        host="127.0.0.1",
        port=12345,
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
    )

    service.record_autodream_session_completed()

    assert service.autodream_status()["session_count_since_last_run"] == 1


def test_daemon_service_tracks_active_thread_streams_for_idle_gating(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    service = LocalDaemonService(
        host="127.0.0.1",
        port=12345,
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
    )

    assert service.has_active_runtime_work() is False

    service.record_thread_event(
        level="info",
        event_type="thread_stream_started",
        thread_id="thread-1",
        message="started",
        details={},
    )
    assert service.has_active_runtime_work() is True

    service.record_thread_event(
        level="info",
        event_type="thread_stream_finished",
        thread_id="thread-1",
        message="finished",
        details={},
    )
    assert service.has_active_runtime_work() is False


def test_daemon_service_start_creates_autodream_polling_task(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    service = LocalDaemonService(
        host="127.0.0.1",
        port=12345,
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
    )

    async def scenario() -> None:
        try:
            await service.start()
            assert service._autodream_task is not None
            assert not service._autodream_task.done()
        finally:
            await service.stop()

    import asyncio

    asyncio.run(scenario())


def test_daemon_service_stop_cancels_autodream_polling_task(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    service = LocalDaemonService(
        host="127.0.0.1",
        port=12345,
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
    )

    async def scenario() -> None:
        await service.start()
        task = service._autodream_task
        assert task is not None

        await service.stop()

        assert service._autodream_task is None
        assert task.cancelled() or task.done()

    import asyncio

    asyncio.run(scenario())
