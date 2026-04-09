from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

EvidenceDurabilityScope = Literal["session_ephemeral", "durable_user_memory"]


@dataclass(slots=True)
class EvidenceDocument:
    evidence_id: str
    source_type: str
    thread_id: str
    turn_id: str
    actor: str
    created_at: str
    content_raw: str
    content_normalized: str
    artifact_uri: str | None
    sensitivity: str = "default"
    retention_class: str = "default"
    durability_scope: EvidenceDurabilityScope = "durable_user_memory"
    checksum: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class EvidenceChunk:
    chunk_id: str
    evidence_id: str
    chunk_index: int
    chunk_text: str
    chunk_summary: str = ""
    tokens: int = 0
    time_anchor: str | None = None
    topic_tags: list[str] = field(default_factory=list)
    wing: str | None = None
    room: str | None = None
    importance_score: float = 0.0
    embedding_ref: str | None = None


@dataclass(slots=True)
class EvidenceTombstone:
    evidence_id: str
    deleted_at: str
    deleted_by: str
    checksum: str


@dataclass(slots=True)
class EvidenceWriteResult:
    document: EvidenceDocument
    chunks: list[EvidenceChunk]
    document_path: object


@dataclass(slots=True)
class EvidenceSearchHit:
    evidence_id: str
    chunk_id: str
    chunk_text: str
    snippet: str
    score: float = 0.0
