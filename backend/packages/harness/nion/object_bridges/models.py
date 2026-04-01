from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass(slots=True)
class ObjectProvenance:
    source_object_type: Literal[
        "memory",
        "notebook",
        "project",
        "project_memory",
        "thread",
        "artifact",
    ]
    source_object_id: str
    source_fragment_id: str | None = None
    source_action: str = ""
    created_at: str = ""
    created_by: Literal["user", "agent", "system"] = "system"


@dataclass(slots=True)
class BridgeActionProvenance:
    action_name: str
    source_objects: list[ObjectProvenance]
    initiated_by: Literal["user", "agent", "system"]
    approval_mode: Literal["required", "auto_allowed", "none"]
    created_at: str


@dataclass(slots=True)
class NotebookDraftCandidate:
    id: str
    source_project_id: str | None
    title: str
    body: str
    target_directory: str | None
    requires_confirmation: bool = True
    provenance: list[BridgeActionProvenance] = field(default_factory=list)


@dataclass(slots=True)
class ProjectDraftCandidate:
    id: str
    name: str
    goal: str
    description: str
    initial_constraints: list[str]
    provenance: list[BridgeActionProvenance] = field(default_factory=list)


@dataclass(slots=True)
class MemoryEntryCandidate:
    id: str
    category: str
    title: str
    content: str
    confidence: float
    provenance: list[BridgeActionProvenance] = field(default_factory=list)


@dataclass(slots=True)
class SkillCandidateDraft:
    id: str
    title: str
    summary: str
    suggested_scope: str
    provenance: list[BridgeActionProvenance] = field(default_factory=list)


@dataclass(slots=True)
class ProjectConstraintCandidate:
    id: str
    project_id: str
    title: str
    content: str
    severity: Literal["low", "medium", "high"] = "medium"
    provenance: list[BridgeActionProvenance] = field(default_factory=list)


@dataclass(slots=True)
class ProjectReferenceLink:
    id: str
    project_id: str
    note_id: str
    fragment_id: str | None
    relation: str
    created_at: str


@dataclass(slots=True)
class NotebookReferenceLink:
    id: str
    note_id: str
    relation: str
    created_at: str
    project_id: str | None = None
    artifact_id: str | None = None


BridgeCandidateType = Literal[
    "notebook_draft",
    "project_draft",
    "memory_entry",
    "skill_candidate",
    "project_constraint",
]
BridgeCandidateStatus = Literal["draft", "ready", "applied", "dismissed", "expired"]


@dataclass(slots=True)
class BridgeCandidateRecord:
    id: str
    candidate_type: BridgeCandidateType
    status: BridgeCandidateStatus
    title: str
    summary: str
    requires_confirmation: bool
    payload: dict[str, Any]
    provenance: list[BridgeActionProvenance] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""
