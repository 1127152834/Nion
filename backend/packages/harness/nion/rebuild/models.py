from __future__ import annotations

from pydantic import BaseModel, Field


class RebuildLog(BaseModel):
    status: str
    summary: str
    source_count: int = 0
    restored_count: int = 0
    skipped_count: int = 0
    started_at: str = ""
    completed_at: str | None = None
    details: dict[str, object] = Field(default_factory=dict)


class RebuildListLogsResponse(BaseModel):
    items: list[RebuildLog] = Field(default_factory=list)
    total_count: int = 0


class RebuildResult(BaseModel):
    status: str
    summary: str
    source_count: int = 0
    restored_count: int = 0
    skipped_count: int = 0
