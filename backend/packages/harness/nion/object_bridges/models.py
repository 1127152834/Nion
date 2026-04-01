from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


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
    project_id: str
    artifact_id: str
    relation: str
    created_at: str
