from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from .contracts import (
    MemoryDomain,
    MemoryOwnerType,
    MemoryScope,
    MemoryStatus,
    MemoryType,
)


class MemoryRecord(BaseModel):
    memory_id: str
    domain: MemoryDomain
    subtype: str
    owner_type: MemoryOwnerType
    scope: MemoryScope
    memory_type: MemoryType
    subject_id: str
    status: MemoryStatus
    summary: str
    confidence: float
    source_refs: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str
    provenance: dict[str, Any] = Field(default_factory=dict)
    target_id: str | None = None
    title: str | None = None
    language: str | None = None
    salience: float | None = None
    freshness_score: float | None = None
    source_count: int | None = None
    artifact_uri: str | None = None
    structured_payload: dict[str, Any] = Field(default_factory=dict)
    last_used_at: str | None = None
    valid_from: str | None = None
    invalid_at: str | None = None
    archived_at: str | None = None
    purged_at: str | None = None
    supersedes: list[str] = Field(default_factory=list)
    superseded_by: str | None = None


class MemoryNode(BaseModel):
    memory_id: str
    canonical_key: str
    owner_type: MemoryOwnerType
    scope: MemoryScope
    node_type: str
    status: MemoryStatus
    summary: str
    created_at: str
    updated_at: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemoryRevision(BaseModel):
    revision_id: str
    memory_id: str
    revision_number: int
    summary: str
    evidence_ref: str | None = None
    created_at: str
    payload: dict[str, Any] = Field(default_factory=dict)


class MemoryDecision(BaseModel):
    decision_id: str
    memory_id: str
    revision_id: str | None = None
    decision_type: str
    rationale: str
    created_at: str
    decided_by: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class MemoryLinkRecord(BaseModel):
    link_id: str
    source_memory_id: str
    target_memory_id: str
    relation: str
    created_at: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class UserOverrideRecord(BaseModel):
    override_id: str
    memory_id: str
    field_name: str
    value: dict[str, Any] = Field(default_factory=dict)
    reason: str | None = None
    created_at: str
    updated_at: str


class CandidateRecord(BaseModel):
    candidate_id: str
    proposed_domain: MemoryDomain
    proposed_subtype: str
    owner_type: MemoryOwnerType
    scope: MemoryScope
    memory_type: MemoryType
    summary: str
    raw_evidence_refs: list[str] = Field(default_factory=list)
    confidence: float
    status: MemoryStatus = "candidate"
    created_at: str
    expires_at: str
    producer: str


class MemoryArtifact(BaseModel):
    artifact_id: str
    artifact_uri: str
    domain: MemoryDomain
    artifact_kind: str
    owner_type: MemoryOwnerType
    scope: MemoryScope
    title: str | None = None
    format: str = "markdown"
    relative_path: str | None = None
    linked_memory_ids: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str
    checksum: str | None = None


class EvidenceLink(BaseModel):
    link_id: str
    source_ref: str
    target_kind: str
    target_id: str
    relation: str
    created_at: str


class AccessLogEntry(BaseModel):
    access_id: str
    actor_type: str
    actor_id: str
    action: str
    target_kind: str
    target_id: str
    thread_id: str | None = None
    session_id: str | None = None
    reason: str | None = None
    created_at: str


class ConsolidationEvent(BaseModel):
    event_id: str
    input_candidate_ids: list[str] = Field(default_factory=list)
    affected_memory_ids: list[str] = Field(default_factory=list)
    action: str
    notes: str = ""
    created_at: str
    executor: str


class LearningTopic(BaseModel):
    topic_id: str
    title: str
    summary: str
    status: MemoryStatus
    score: float
    signals: dict[str, Any] = Field(default_factory=dict)
    evidence_refs: list[str] = Field(default_factory=list)
    backlog_position: int | None = None
    created_at: str
    updated_at: str


class ProcedureRecord(BaseModel):
    procedure_id: str
    title: str
    status: MemoryStatus
    artifact_uri: str
    evidence_refs: list[str] = Field(default_factory=list)
    usage_count: int = 0
    validation_count: int = 0
    created_at: str
    updated_at: str


class AutomationProjection(BaseModel):
    job_id: str
    owner_type: Literal["user", "agent"]
    owner_id: str
    mutability: Literal["editable", "pause_only"]
    provenance_memory_id: str | None = None
    provenance_learning_id: str | None = None
    retention_policy: dict[str, Any] = Field(default_factory=dict)
    visible_in_ui: bool = True
    policy_flags: dict[str, Any] = Field(default_factory=dict)


class SoulEventRecord(BaseModel):
    event_id: str
    event_type: str
    memory_id: str
    related_memory_id: str | None = None
    summary: str
    created_at: str
    actor: str | None = None
    source: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
