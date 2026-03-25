from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DraftReference:
    kind: str
    value: str
    display: str


@dataclass
class TuiState:
    selected_thread_id: str | None = None
    draft_text: str = ""
    command_query: str = ""
    mention_query: str = ""
    streaming: bool = False
    thread_ids: list[str] = field(default_factory=list)
    command_suggestions: list[str] = field(default_factory=list)
    reference_suggestions: list[str] = field(default_factory=list)
    references: list[DraftReference] = field(default_factory=list)

    def set_selected_thread(self, thread_id: str | None) -> None:
        self.selected_thread_id = thread_id

    def set_draft(self, text: str) -> None:
        self.draft_text = text

    def set_command_suggestions(self, suggestions: list[str]) -> None:
        self.command_suggestions = suggestions

    def set_reference_suggestions(self, suggestions: list[str]) -> None:
        self.reference_suggestions = suggestions

    def add_reference(self, kind: str, value: str, display: str) -> None:
        self.references.append(DraftReference(kind=kind, value=value, display=display))
