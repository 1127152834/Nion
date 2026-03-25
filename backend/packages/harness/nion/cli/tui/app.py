from __future__ import annotations

from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Footer, Header, Label, ListItem, ListView, RichLog, Static, TextArea

from nion.cli.daemon_client import DaemonApiClient

from .commands import complete_command
from .references import parse_reference_trigger
from .state import TuiState


class NionTuiApp(App[None]):
    CSS = """
    Screen {
        layout: vertical;
    }

    #body {
        height: 1fr;
    }

    #threads {
        width: 28;
        border: round $surface;
    }

    #conversation {
        border: round $surface;
    }

    #composer {
        height: 7;
        border: round $surface;
    }

    #status {
        height: 1;
        color: $text-muted;
        padding: 0 1;
    }
    """

    def __init__(self, base_url: str, daemon_client: DaemonApiClient | None = None) -> None:
        super().__init__()
        self.base_url = base_url
        self.daemon_client = daemon_client or DaemonApiClient(base_url)
        self.state = TuiState()
        self._available_skills: list[str] = []
        self._available_tools: list[str] = []
        self._available_files: list[str] = []

    def compose(self) -> ComposeResult:
        yield Header(show_clock=False)
        with Horizontal(id="body"):
            yield ListView(id="threads")
            with Vertical():
                yield RichLog(id="conversation", wrap=True, highlight=True)
                yield TextArea(id="composer")
                yield Static("daemon: connecting", id="status")
        yield Footer()

    async def on_mount(self) -> None:
        await self.refresh_runtime_info()
        await self.load_threads()
        await self.load_reference_sources()

    async def refresh_runtime_info(self) -> None:
        info = self.daemon_client.get_runtime_info()
        self.query_one("#status", Static).update(
            f"daemon: {info.get('mode', 'unknown')}  thread: {self.state.selected_thread_id or '-'}"
        )

    async def load_threads(self) -> None:
        threads = self.daemon_client.search_threads(limit=50)
        self.state.thread_ids = [item.get("thread_id", "") for item in threads if item.get("thread_id")]
        if self.state.thread_ids and self.state.selected_thread_id is None:
            self.state.set_selected_thread(self.state.thread_ids[0])

        list_view = self.query_one("#threads", ListView)
        list_view.clear()
        for thread_id in self.state.thread_ids:
            list_view.append(ListItem(Label(thread_id)))

    async def load_reference_sources(self) -> None:
        self._available_skills = [
            item.get("name", "")
            for item in self.daemon_client.list_skills()
            if item.get("name")
        ]
        self._available_tools = self.daemon_client.list_cli_tools()
        if self.state.selected_thread_id:
            self._available_files = self.daemon_client.list_thread_files(
                self.state.selected_thread_id,
            )

    def get_command_suggestions(self, query: str) -> list[str]:
        suggestions = complete_command(query)
        self.state.set_command_suggestions(suggestions)
        return suggestions

    def get_reference_suggestions(self, text: str) -> list[str]:
        trigger = parse_reference_trigger(text)
        if trigger is None:
            self.state.set_reference_suggestions([])
            return []

        source: list[str]
        if trigger.kind == "skill":
            source = self._available_skills
        elif trigger.kind == "tool":
            source = self._available_tools
        elif trigger.kind == "file":
            source = self._available_files
        elif trigger.kind == "thread":
            source = self.state.thread_ids
        else:
            source = []

        suggestions = [item for item in source if item.startswith(trigger.query)]
        self.state.set_reference_suggestions(suggestions)
        return suggestions
