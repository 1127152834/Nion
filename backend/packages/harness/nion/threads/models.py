from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ThreadCliManagementState(BaseModel):
    active: bool = False
    phase: Literal["inactive", "managing", "awaiting_permission"] = "inactive"
    last_trigger: str | None = None
    last_intent: str | None = None
    pending_permission_request_id: str | None = None
    followup_turns_remaining: int = 0
    updated_at: str | None = None


class ThreadValues(BaseModel):
    title: str = "Untitled"
    messages: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
    todos: list[dict[str, Any]] | None = None
    bridge: dict[str, Any] | None = None
    cli_management: ThreadCliManagementState = Field(default_factory=ThreadCliManagementState)
    resolved_permission_request_ids: list[str] = Field(default_factory=list)


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
