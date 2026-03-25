from nion.cli.tui.app import NionTuiApp


class StreamingStubClient:
    def get_runtime_info(self):
        return {"mode": "local-daemon"}

    def search_threads(self, limit=50):
        return [{"thread_id": "thread-1", "values": {"title": "Demo"}}]

    def get_thread_state(self, thread_id):
        return {"thread_id": thread_id, "values": {"messages": []}}

    def list_skills(self):
        return []

    def list_cli_tools(self):
        return []

    def list_thread_files(self, thread_id, depth=3):
        return []

    def stream_thread(self, thread_id, payload):
        yield {"event": "created", "thread_id": thread_id}
        yield {"event": "messages-tuple", "content": "hello"}
        yield {"event": "values", "messages": [{"type": "ai", "content": "hello"}]}


def test_send_current_draft_streams_into_transcript() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=StreamingStubClient())
    app.state.set_selected_thread("thread-1")
    app.state.set_draft("hello")

    events = list(app._stream_current_draft())

    assert events[0]["thread_id"] == "thread-1"
    assert app.state.streaming is False
    assert app.state.draft_text == ""
    assert "Assistant: hello" in app._rendered_history_lines
