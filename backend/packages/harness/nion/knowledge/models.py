from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class KnowledgeSourceCandidate(BaseModel):
    source_id: str
    source_kind: Literal["notebook_note", "notebook_asset"]
    notebook_ref: dict[str, str] = Field(default_factory=dict)
    title: str
    summary: str
    content_hash: str
    status: Literal["queued", "approved", "compiled", "failed", "stale", "ignored"]
    created_at: str
    updated_at: str
    last_compiled_at: str | None = None
    compile_error: str | None = None


class KnowledgePage(BaseModel):
    page_id: str
    page_type: str
    title: str
    relative_path: str
    absolute_path: str
    body: str
    sources: list[str] = Field(default_factory=list)
    compiled_from: list[dict[str, Any]] = Field(default_factory=list)
    last_compiled_at: str
    agent_owned: bool = True
    human_editable: bool = False


class KnowledgeCompileJob(BaseModel):
    job_id: str
    source_ids: list[str] = Field(default_factory=list)
    trigger_mode: Literal["manual", "queue_approval"]
    status: Literal["pending", "running", "succeeded", "failed", "partially_succeeded"] = (
        "pending"
    )
    started_at: str | None = None
    finished_at: str | None = None
    outputs: dict[str, Any] = Field(default_factory=dict)
    error_summary: str | None = None
