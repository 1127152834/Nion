from nion.client import StreamEvent


def test_stream_event_supports_tool_activity():
    event = StreamEvent(
        type="tool-activity",
        data={
            "kind": "tool_batch_summary",
            "summary_label": "Inspected project files",
            "group_id": "group-1",
            "tool_names": ["read_file", "ls"],
        },
    )
    assert event.type == "tool-activity"


def test_tool_activity_summary_message_projection_shape():
    message = {
        "type": "tool_activity_summary",
        "id": "tas-1",
        "content": "Inspected project files",
        "additional_kwargs": {
            "group_id": "group-1",
            "tool_names": ["read_file", "ls"],
            "result_class": "read",
        },
    }

    assert message["type"] == "tool_activity_summary"
    assert message["additional_kwargs"]["result_class"] == "read"
