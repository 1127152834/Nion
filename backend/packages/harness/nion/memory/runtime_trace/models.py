from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RuntimeTraceEvent(BaseModel):
    event_id: str
    event_type: str
    memory_id: str | None = None
    thread_id: str | None = None
    created_at: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class RuntimeTraceListResponse(BaseModel):
    items: list[RuntimeTraceEvent] = Field(default_factory=list)
