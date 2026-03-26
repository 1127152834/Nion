from app.daemon.session_registry import SessionRegistry


def test_registry_respects_background_running_and_grace_period() -> None:
    current = 0.0
    registry = SessionRegistry(
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
        now=lambda: current,
    )
    registry.register("electron-1", "electron")

    registry.unregister("electron-1")
    assert registry.should_exit(now=0) is False
    assert registry.should_exit(now=4) is True


def test_registry_exits_after_grace_when_no_clients_ever_attach() -> None:
    current = 0.0
    registry = SessionRegistry(
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
        now=lambda: current,
    )

    assert registry.should_exit(now=0) is False
    assert registry.should_exit(now=4) is True


def test_registry_prunes_stale_sessions_and_exits_after_grace() -> None:
    current = 0.0
    registry = SessionRegistry(
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
        stale_client_timeout_seconds=5,
        now=lambda: current,
    )

    registry.register("electron-1", "electron")
    assert registry.snapshot()["electron"] == 1

    current = 6.0
    assert registry.snapshot()["electron"] == 0
    assert registry.should_exit(now=6.0) is False
    assert registry.should_exit(now=10.0) is True


def test_registry_never_exits_while_background_running_is_enabled() -> None:
    current = 0.0
    registry = SessionRegistry(
        allow_background_running=True,
        shutdown_grace_period_seconds=3,
        now=lambda: current,
    )
    registry.register("electron-1", "electron")
    registry.unregister("electron-1")

    assert registry.should_exit(now=10) is False
