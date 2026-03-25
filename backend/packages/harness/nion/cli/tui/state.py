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
    selected_thread_label: str | None = None
    draft_text: str = ""
    palette_query: str = ""
    streaming: bool = False
    thread_ids: list[str] = field(default_factory=list)
    thread_items: list[dict[str, str]] = field(default_factory=list)
    palette_items: list[dict[str, str]] = field(default_factory=list)
    palette_index: int = 0
    palette_visible: bool = False
    reference_suggestions: list[str] = field(default_factory=list)
    references: list[DraftReference] = field(default_factory=list)

    def set_selected_thread(self, thread_id: str | None) -> None:
        self.selected_thread_id = thread_id

    def set_selected_thread_label(self, label: str | None) -> None:
        self.selected_thread_label = label

    def set_draft(self, text: str) -> None:
        self.draft_text = text

    def set_palette_items(self, items: list[dict[str, str]]) -> None:
        self.palette_items = items
        self.palette_visible = bool(items)
        self.palette_index = 0

    def set_reference_suggestions(self, suggestions: list[str]) -> None:
        self.reference_suggestions = suggestions

    def add_reference(self, kind: str, value: str, display: str) -> None:
        self.references.append(DraftReference(kind=kind, value=value, display=display))
