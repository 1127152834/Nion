from __future__ import annotations

from pydantic import BaseModel, Field


class DreamEntry(BaseModel):
    dream_id: str
    started_at: str
    ended_at: str
    time_window_start: str
    time_window_end: str
    summary: str
    what_i_did: list[str] = Field(default_factory=list)
    what_i_learned: list[str] = Field(default_factory=list)
    what_changed: list[str] = Field(default_factory=list)
    what_i_plan_to_change: list[str] = Field(default_factory=list)
    what_i_changed: list[str] = Field(default_factory=list)
    stale_items: list[str] = Field(default_factory=list)
    agent_memory_updates: list[str] = Field(default_factory=list)
    user_memory_candidates: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class AutoDreamRunState(BaseModel):
    last_run_at: str | None = None
    session_count_since_last_run: int = 0
    running: bool = False
    last_run_status: str | None = None
    last_run_summary: str | None = None
    last_query: str | None = None
