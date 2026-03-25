from nion.cli.tui.stream import normalize_stream_event


def test_normalize_stream_event_handles_created_event() -> None:
    event = normalize_stream_event("created", {"thread_id": "thread-1"})
    assert event["thread_id"] == "thread-1"
