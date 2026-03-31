from nion.tools.activity_models import (
    ToolActivityBatch,
    ToolActivityEvent,
    ToolActivityKind,
)


def test_tool_activity_event_is_first_class_model():
    event = ToolActivityEvent(
        event_id="evt-1",
        kind=ToolActivityKind.TOOL_STARTED,
        tool_name="read_file",
        tool_call_id="call-1",
        thread_id="thread-1",
        timestamp="2026-04-01T00:00:00Z",
        activity_label="Reading file",
        summary_label="Read file",
        result_class="read",
        visibility="full",
    )

    assert event.kind == ToolActivityKind.TOOL_STARTED
    assert event.tool_name == "read_file"
    assert event.result_class == "read"


def test_tool_activity_batch_tracks_group_and_summary():
    batch = ToolActivityBatch(
        group_id="group-1",
        thread_id="thread-1",
        tool_names=["read_file", "ls"],
        events=[],
        summary=None,
    )

    assert batch.group_id == "group-1"
    assert batch.tool_names == ["read_file", "ls"]
