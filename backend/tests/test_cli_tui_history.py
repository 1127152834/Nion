from nion.cli.tui.app import NionTuiApp


class StubDaemonClient:
    def get_runtime_info(self):
        return {"mode": "local-daemon"}

    def search_threads(self, limit=50):
        return [
            {"thread_id": "thread-1", "values": {"title": "First thread"}},
            {"thread_id": "thread-2", "values": {"title": "Second thread"}},
        ]

    def get_thread_state(self, thread_id):
        return {
            "thread_id": thread_id,
            "values": {
                "messages": [
                    {"type": "human", "content": "hello"},
                    {"type": "ai", "content": "world"},
                ]
            },
        }

    def list_skills(self):
        return []

    def list_cli_tools(self):
        return []

    def list_thread_files(self, thread_id, depth=3):
        return []


def test_tui_load_threads_prefers_titles_over_raw_ids() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=StubDaemonClient())
    items = app._normalize_thread_items(app.daemon_client.search_threads())

    assert items[0]["label"] == "First thread"
    assert items[1]["label"] == "Second thread"


def test_history_lines_render_human_and_ai_messages() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=StubDaemonClient())
    lines = app._history_lines(app.daemon_client.get_thread_state("thread-1"))

    assert "You: hello" in lines
    assert "Assistant: world" in lines
