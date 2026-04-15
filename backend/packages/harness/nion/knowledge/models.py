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
    status: Literal["queued", "running", "compiled", "failed", "stale", "ignored", "source_missing"]
    enqueued_at: str | None = None
    last_job_id: str | None = None
    last_compiled_at: str | None = None
    missing_detected_at: str | None = None
    compile_error: str | None = None
    created_at: str
    updated_at: str


class KnowledgeActivityEvent(BaseModel):
    event_id: str
    event_type: Literal[
        "candidate_enqueued",
        "job_started",
        "snapshot_completed",
        "page_created",
        "page_updated",
        "page_archived",
        "graph_rebuilt",
        "job_failed",
        "job_succeeded",
        "candidate_became_stale",
        "source_missing_detected",
        "source_restored",
    ]
    source_id: str | None = None
    page_id: str | None = None
    job_id: str | None = None
    detail: str
    created_at: str


class KnowledgeSourceReconciliationResult(BaseModel):
    checked_source_ids: list[str] = Field(default_factory=list)
    source_missing_ids: list[str] = Field(default_factory=list)
    restored_source_ids: list[str] = Field(default_factory=list)
    archived_page_ids: list[str] = Field(default_factory=list)
    reactivated_page_ids: list[str] = Field(default_factory=list)
    detected_at: str


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
