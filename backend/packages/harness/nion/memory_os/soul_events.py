from __future__ import annotations

from pydantic import BaseModel


class SoulEventRecord(BaseModel):
    event_id: str
    event_type: str
    memory_id: str
    summary: str
    created_at: str
