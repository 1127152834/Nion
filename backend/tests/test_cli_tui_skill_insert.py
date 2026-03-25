from nion.cli.tui.app import NionTuiApp


class SkillStubClient:
    def get_runtime_info(self):
        return {"mode": "local-daemon"}

    def search_threads(self, limit=50):
        return []

    def list_skills(self):
        return [{"name": "ask", "description": "Async ask"}]

    def list_cli_tools(self):
        return []

    def list_thread_paths(self, thread_id, depth=3):
        return []


def test_selecting_skill_from_palette_inserts_it_into_draft() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=SkillStubClient())
    app.state.set_draft("hello")

    app._insert_skill_token("ask")

    assert "/ask" in app.state.draft_text
