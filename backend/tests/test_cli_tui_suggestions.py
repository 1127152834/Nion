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

    def list_thread_files(self, thread_id, depth=3):
        return ["/mnt/user-data/workspace/notes.md"]


def test_reference_suggestions_match_skill_prefix() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=SuggestionStubClient())
    app._available_skills = ["research-helper"]

    suggestions = app.get_reference_suggestions("Use @skill:res")

    assert suggestions == ["research-helper"]


def test_command_suggestions_are_stored_in_state() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=SuggestionStubClient())

    suggestions = app.get_command_suggestions("/st")

    assert suggestions == ["/status", "/stop"]
    assert app.state.command_suggestions == suggestions
