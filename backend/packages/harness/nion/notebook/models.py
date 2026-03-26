from __future__ import annotations

from pydantic import BaseModel


class NotebookNote(BaseModel):
    note_id: str
    title: str
    relative_path: str
    absolute_path: str
    created_at: str
    updated_at: str
    content_hash: str
    body: str


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
