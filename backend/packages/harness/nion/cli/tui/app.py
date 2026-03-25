from __future__ import annotations

from textual.app import App, ComposeResult
from textual.containers import Horizontal, Vertical
from textual.widgets import Footer, Header, Label, ListItem, ListView, RichLog, Static, TextArea

from nion.cli.daemon_client import DaemonApiClient

from .commands import complete_command
from .references import parse_reference_trigger
from .state import TuiState


class NionTuiApp(App[None]):
    BINDINGS = [
        ("ctrl+enter", "submit_message", "Send"),
    ]

    CSS = """
    Screen {
        layout: vertical;
        background: #11151c;
    }

    #body {
        height: 1fr;
    }

    #threads {
        width: 28;
        border: round $surface;
        background: #1b2430;
    }

    #conversation {
        border: round $surface;
        background: #161b22;
    }

    #composer {
        height: 7;
        border: round $surface;
        background: #10151d;
    }

    #status {
        height: 1;
        color: $text-muted;
        padding: 0 1;
        background: #0d1320;
    }

    #command-panel, #reference-panel {
        height: auto;
        max-height: 5;
        border: round $surface;
        background: #141c26;
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
        self._rendered_history_lines: list[str] = []

    def compose(self) -> ComposeResult:
        yield Header(show_clock=False)
        with Horizontal(id="body"):
            yield ListView(id="threads")
            with Vertical():
                yield Static("Conversation", id="conversation-title")
                yield RichLog(id="conversation", wrap=True, highlight=True)
                yield Static("", id="command-panel")
                yield Static("", id="reference-panel")
                yield TextArea(id="composer")
                yield Static("daemon: connecting", id="status")
        yield Footer()

    async def on_mount(self) -> None:
        await self.refresh_runtime_info()
        await self.load_threads()
        await self.load_reference_sources()
        self._refresh_suggestion_panels()

    async def refresh_runtime_info(self) -> None:
        info = self.daemon_client.get_runtime_info()
        self.query_one("#status", Static).update(
            f"daemon: {info.get('mode', 'unknown')}  thread: {self.state.selected_thread_label or self.state.selected_thread_id or '-'}  streaming: {'yes' if self.state.streaming else 'no'}"
        )

    async def load_threads(self) -> None:
        threads = self.daemon_client.search_threads(limit=50)
        items = self._normalize_thread_items(threads)
        self.state.thread_items = items
        self.state.thread_ids = [item["thread_id"] for item in items]
        if items and self.state.selected_thread_id is None:
            self.state.set_selected_thread(items[0]["thread_id"])
            self.state.set_selected_thread_label(items[0]["label"])
            thread_state = self.daemon_client.get_thread_state(items[0]["thread_id"])
            self.render_thread_history(thread_state)

        list_view = self.query_one("#threads", ListView)
        list_view.clear()
        for item in items:
            list_view.append(ListItem(Label(item["label"])))

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

    def _normalize_thread_items(self, threads: list[dict]) -> list[dict[str, str]]:
        items: list[dict[str, str]] = []
        for thread in threads:
            thread_id = str(thread.get("thread_id") or "")
            if not thread_id:
                continue
            values = thread.get("values", {}) or {}
            title = str(values.get("title") or thread_id)
            items.append({"thread_id": thread_id, "label": title})
        return items

    def _extract_message_text(self, message: dict) -> str:
        content = message.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts: list[str] = []
            for part in content:
                if isinstance(part, str):
                    parts.append(part)
                elif isinstance(part, dict):
                    text = part.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "\n".join(part for part in parts if part)
        return str(content)

    def _history_lines(self, thread_state: dict) -> list[str]:
        values = thread_state.get("values", {}) or {}
        messages = values.get("messages", []) or []
        lines: list[str] = []
        for message in messages:
            if not isinstance(message, dict):
                continue
            msg_type = message.get("type")
            text = self._extract_message_text(message).strip()
            if not text:
                continue
            if msg_type == "human":
                lines.append(f"You: {text}")
            elif msg_type in {"ai", "assistant"}:
                lines.append(f"Assistant: {text}")
        if not lines:
            lines.append("No messages yet. Start a conversation to see history here.")
        return lines

    def render_thread_history(self, thread_state: dict) -> None:
        self._rendered_history_lines = self._history_lines(thread_state)
        try:
            conversation = self.query_one("#conversation", RichLog)
        except Exception:
            return
        conversation.clear()
        for line in self._rendered_history_lines:
            conversation.write(line)

    def get_command_suggestions(self, query: str) -> list[str]:
        suggestions = complete_command(query)
        self.state.set_command_suggestions(suggestions)
        self._refresh_suggestion_panels()
        return suggestions

    def get_reference_suggestions(self, text: str) -> list[str]:
        trigger = parse_reference_trigger(text)
        if trigger is None:
            self.state.set_reference_suggestions([])
            self._refresh_suggestion_panels()
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
        self._refresh_suggestion_panels()
        return suggestions

    def _refresh_suggestion_panels(self) -> None:
        try:
            command_panel = self.query_one("#command-panel", Static)
            reference_panel = self.query_one("#reference-panel", Static)
        except Exception:
            return

        command_panel.update(
            "Commands: " + ", ".join(self.state.command_suggestions)
            if self.state.command_suggestions
            else ""
        )
        reference_panel.update(
            "References: " + ", ".join(self.state.reference_suggestions)
            if self.state.reference_suggestions
            else ""
        )

    def _build_submit_payload(self) -> dict:
        references = [
            {"kind": reference.kind, "value": reference.value, "display": reference.display}
            for reference in self.state.references
        ]
        message_text = self.state.draft_text
        if references:
            message_text = f"{message_text}\n\nReferences: {references}"
        return {
            "messages": [{"type": "human", "content": message_text}],
            "context": {},
            "config": {},
        }

    def _stream_current_draft(self):
        if not self.state.selected_thread_id:
            return iter(())
        if not self.state.draft_text.strip():
            return iter(())

        payload = self._build_submit_payload()
        self.state.streaming = True

        def _generator():
            latest_values_state: dict | None = None
            try:
                events = []
                for event in self.daemon_client.stream_thread(
                    self.state.selected_thread_id,
                    payload,
                ):
                    events.append(event)
                    content = event.get("content")
                    if isinstance(content, str) and content.strip():
                        self._rendered_history_lines.append(f"Assistant: {content.strip()}")
                    if event.get("event") == "values":
                        latest_values_state = {
                            "thread_id": self.state.selected_thread_id,
                            "values": {
                                "messages": event.get("messages", []),
                            },
                        }
                thread_state = latest_values_state or self.daemon_client.get_thread_state(self.state.selected_thread_id)
                self.render_thread_history(thread_state)
                self.state.set_draft("")
                self.state.references.clear()
                try:
                    composer = self.query_one("#composer", TextArea)
                    composer.text = ""
                except Exception:
                    pass
                for event in events:
                    yield event
            finally:
                self.state.streaming = False
                try:
                    self.query_one("#status", Static).update(
                        f"daemon: local-daemon  thread: {self.state.selected_thread_label or self.state.selected_thread_id or '-'}  streaming: no"
                    )
                except Exception:
                    pass

        return _generator()

    async def action_submit_message(self) -> None:
        composer = self.query_one("#composer", TextArea)
        self.state.set_draft(composer.text)
        for _ in self._stream_current_draft():
            pass

    async def on_text_area_changed(self, event: TextArea.Changed) -> None:
        self.state.set_draft(event.text_area.text)
        draft = event.text_area.text
        if draft.startswith("/"):
            self.get_command_suggestions(draft.strip())
        else:
            self.state.set_command_suggestions([])
            self.get_reference_suggestions(draft)
        self._refresh_suggestion_panels()
