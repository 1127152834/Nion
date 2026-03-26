from __future__ import annotations

from pydantic import BaseModel, Field


class NotebookNote(BaseModel):
    note_id: str
    title: str
    relative_path: str
    absolute_path: str
    created_at: str
    updated_at: str
    content_hash: str
    body: str
    tags: list[str] = Field(default_factory=list)
    is_pinned: bool = False


class NotebookNoteSummary(BaseModel):
    note_id: str
    title: str
    relative_path: str
    created_at: str
    updated_at: str
    summary: str
    tags: list[str] = Field(default_factory=list)
    is_pinned: bool = False


class NotebookHistoryEntry(BaseModel):
    version_id: str
    note_id: str
    parent_version_id: str | None = None
    operation: str
    actor_type: str
    timestamp: str
    path_at_time: str
    content_hash_after: str | None = None
    diff_text: str | None = None
    restored_from_version_id: str | None = None
    trash_path: str | None = None


class NotebookDeletedNote(BaseModel):
    note_id: str
    trash_path: str


class NotebookDeletedNotePreview(BaseModel):
    note_id: str
    title: str
    relative_path: str
    summary: str
    deleted_at: str | None = None
