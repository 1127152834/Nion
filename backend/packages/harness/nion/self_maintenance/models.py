from __future__ import annotations

from pydantic import BaseModel, Field


class ReflectiveEntry(BaseModel):
    run_id: str
    trigger: str
    started_at: str
    ended_at: str
    summary: str
    what_i_did: list[str] = Field(default_factory=list)
    what_i_learned: list[str] = Field(default_factory=list)
    stale_items: list[str] = Field(default_factory=list)
    memory_update_proposals: list[str] = Field(default_factory=list)
    prune_proposals: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    self_upgrade_proposals: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class ReflectiveRunState(BaseModel):
    last_run_at: str | None = None
    session_count_since_last_run: int = 0
    running: bool = False
    last_run_status: str | None = None
    last_run_summary: str | None = None
    last_query: str | None = None


class ReflectiveLog(BaseModel):
    trigger: str
    status: str
    summary: str
    started_at: str = ""
    completed_at: str | None = None
    memory_update_proposals: list[str] = Field(default_factory=list)
    prune_proposals: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    self_upgrade_proposals: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    entry_path: str | None = None


class SelfMaintenanceResult(BaseModel):
    entry: ReflectiveEntry
    entry_path: str
    memory_update_proposals: list[str] = Field(default_factory=list)
    prune_proposals: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    self_upgrade_proposals: list[str] = Field(default_factory=list)


class SelfMaintenanceTickResult(BaseModel):
    ran: bool
    status: str
    summary: str
    result: object | None = None
