from nion.cli.tui.app import NionTuiApp


class SuggestionStubClient:
    def get_runtime_info(self):
        return {"mode": "local-daemon"}

    def search_threads(self, limit=50):
        return []

    def list_skills(self):
        return [{"name": "research-helper"}]

    def list_cli_tools(self):
        return ["git", "uv"]

    def list_thread_paths(self, thread_id, depth=3):
        return ["/mnt/user-data/workspace/notes.md"]


def test_reference_suggestions_match_file_prefix() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=SuggestionStubClient())
    app._available_files = ["/mnt/user-data/workspace/notes.md"]

    suggestions = app.get_reference_suggestions("Use @/mnt/user-data/workspace/no")

    assert suggestions == ["/mnt/user-data/workspace/notes.md"]


def test_palette_items_are_stored_in_state() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=SuggestionStubClient())

    items = app.get_palette_items("/st")

    labels = [item["label"] for item in items]
    assert labels == ["/status", "/stop"]
    assert app.state.palette_items == items
