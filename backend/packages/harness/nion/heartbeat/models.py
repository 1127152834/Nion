from __future__ import annotations

from pydantic import BaseModel, Field


class HeartbeatLog(BaseModel):
    bot_id: str
    status: str
    summary: str
    started_at: str
    finished_at: str | None = None
    details: dict[str, object] = Field(default_factory=dict)


class HeartbeatStatus(BaseModel):
    running: bool = False
    last_tick_at: str | None = None
    last_tick_status: str | None = None
    last_tick_summary: str | None = None
    session_count_since_last_tick: int = 0
