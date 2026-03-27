from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ThreadValues(BaseModel):
    title: str = "Untitled"
    messages: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
    todos: list[dict[str, Any]] | None = None


class ThreadRecord(BaseModel):
    thread_id: str
    agent_name: str = "lead_agent"
    created_at: str
    updated_at: str
    values: ThreadValues = Field(default_factory=ThreadValues)
    deleted: bool = False


class ThreadSearchParams(BaseModel):
    thread_id: str | None = None
    limit: int = 50
    offset: int = 0
    sort_by: Literal["updated_at", "created_at"] = "updated_at"
    sort_order: Literal["asc", "desc"] = "desc"
    select: list[str] | None = None


class ThreadStreamRequest(BaseModel):
    messages: list[dict[str, Any]] = Field(default_factory=list)
    context: dict[str, Any] = Field(default_factory=dict)
    config: dict[str, Any] = Field(default_factory=dict)
    assistant_id: str | None = None
