from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ChildRunStatus = Literal["created", "running", "completed", "failed", "closed"]


class ChildRunMessage(BaseModel):
    role: Literal["human", "ai", "tool"]
    content: str
    created_at: str


class ChildRunRecord(BaseModel):
    child_run_id: str
    parent_thread_id: str
    agent_name: str
    title: str
    status: ChildRunStatus = "created"
    description: str = ""
    result: str | None = None
    error: str | None = None
    started_at: str = ""
    finished_at: str | None = None
    messages: list[ChildRunMessage] = Field(default_factory=list)
    tool_activity_timeline: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
