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
