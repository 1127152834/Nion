from __future__ import annotations

from pydantic import BaseModel, Field


class CompactionLog(BaseModel):
    status: str
    summary: str
    message_count: int = 0
    error_message: str = ""
    usage: dict[str, int] | None = None
    model_id: str | None = None
    started_at: str = ""
    completed_at: str | None = None


class CompactionListLogsResponse(BaseModel):
    items: list[CompactionLog] = Field(default_factory=list)
    total_count: int = 0


class CompactionResult(BaseModel):
    status: str
    summary: str
    compacted_fact_count: int = 0


class MemoryUsageResponse(BaseModel):
    count: int = 0
    total_text_bytes: int = 0
    estimated_storage_bytes: int = 0
    avg_text_bytes: int = 0
