from app.channels.runtime_state import ChannelRuntimeState


def test_runtime_state_is_observational_and_tracks_heartbeat_and_errors():
    state = ChannelRuntimeState()
    state.mark_started("telegram", {"supports_streaming": False})
    state.mark_error("telegram", "bot token rejected")

    snapshot = state.snapshot()["channels"]["telegram"]

    assert snapshot["running"] is True
    assert snapshot["capabilities"]["supports_streaming"] is False
    assert snapshot["last_heartbeat"] is not None
    assert snapshot["last_error"] == "bot token rejected"
