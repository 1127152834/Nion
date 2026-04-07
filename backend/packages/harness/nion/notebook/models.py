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


class NotebookAsset(BaseModel):
    asset_id: str
    title: str
    relative_path: str
    absolute_path: str
    source_kind: str
    mime_type: str | None = None
    created_at: str
    updated_at: str
    file_size: int | None = None
    provenance: dict[str, str] | None = None
    tags: list[str] = Field(default_factory=list)


class NotebookInboxItem(BaseModel):
    inbox_id: str
    entry_type: str
    title: str
    relative_path: str
    created_at: str
    updated_at: str
    note_id: str | None = None
    asset_id: str | None = None
    summary: str | None = None
    mime_type: str | None = None
    tags: list[str] = Field(default_factory=list)


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
