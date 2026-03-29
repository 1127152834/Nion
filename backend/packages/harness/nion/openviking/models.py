from __future__ import annotations

from pydantic import BaseModel


class NotebookResourceRecord(BaseModel):
    resource_uri: str
    note_id: str
    title: str
    source_relative_path: str
    content_hash: str
    updated_at: str
    indexed_at: str
