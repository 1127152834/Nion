from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ProjectLifecycleStatus = Literal["active", "completed", "archived", "abandoned"]
ProjectPhase = Literal["头脑风暴", "设计", "计划", "实施", "完成"]
ExecutionMode = Literal["manual", "auto"]
PlanType = Literal["normal", "rework", "review", "completion"]
PlanLifecycleStatus = Literal[
    "draft",
    "ready",
    "running",
    "completed",
    "failed",
    "canceled",
    "archived",
]
PlanQueueStatus = Literal["not_queued", "queued", "dispatched"]
PlanHoldStatus = Literal[
    "none",
    "paused",
    "blocked",
    "waiting_confirmation",
    "review_pending",
    "waiting_manual_start",
]
PlanHoldReason = Literal[
    "rate_limited",
    "dependency",
    "manual",
    "missing_input",
    "tool_error",
    "human_decision",
]
PlanOutcomeStatus = Literal["done", "done_with_followups", "needs_revision", "blocked", "canceled"]
DecisionType = Literal[
    "confirm_plan_outcome",
    "create_rework_plan",
    "extract_long_term_memory",
    "extract_skill",
    "complete_project",
    "archive_project",
    "abandon_project",
    "confirm_route_change",
]
DecisionStatus = Literal["pending", "resolved"]
ProjectThreadRole = Literal["primary", "exploration", "implementation", "review", "temporary"]
TimelineVisibility = Literal["user_visible", "summary_only", "internal_only"]
ArtifactType = Literal["document", "code", "config", "table", "report", "automation", "other"]
ProjectMemoryCategory = Literal["brief", "decisions", "constraints", "learnings", "handoff"]


class ProjectPhaseSnapshot(BaseModel):
    id: str
    project_id: str
    phase: ProjectPhase
    entered_at: str
    exited_at: str | None = None
    entered_by: Literal["agent", "user", "system"] = "system"
    transition_reason: str = ""
    trigger_plan_id: str | None = None
    summary: str = ""
    next_action: str = ""
    status_at_time: ProjectLifecycleStatus = "active"


class ExecutionPlanStatus(BaseModel):
    lifecycle_status: PlanLifecycleStatus = "draft"
    queue_status: PlanQueueStatus = "not_queued"
    hold_status: PlanHoldStatus = "none"
    hold_reason: PlanHoldReason | None = None


class ExecutionPlan(BaseModel):
    id: str
    project_id: str
    phase: ProjectPhase
    title: str
    description: str = ""
    plan_type: PlanType = "normal"
    execution_mode: ExecutionMode = "manual"
    is_gate_plan: bool = False
    is_primary: bool = False
    sort_order: int = 0
    status: ExecutionPlanStatus = Field(default_factory=ExecutionPlanStatus)
    outcome_status: PlanOutcomeStatus | None = None
    outcome_summary: str = ""
    depends_on_plan_ids: list[str] = Field(default_factory=list)
    branch_routes: dict[str, str] = Field(default_factory=dict)
    primary_thread_id: str | None = None
    primary_artifact_id: str | None = None
    rework_of_plan_id: str | None = None
    derived_from_outcome_id: str | None = None
    created_at: str
    updated_at: str
    started_at: str | None = None
    completed_at: str | None = None


class ProjectThreadLink(BaseModel):
    id: str
    project_id: str
    thread_id: str
    role: ProjectThreadRole = "temporary"
    linked_plan_ids: list[str] = Field(default_factory=list)
    is_primary_thread: bool = False
    created_at: str
    updated_at: str
    last_active_at: str | None = None


class ManagedArtifactVersion(BaseModel):
    id: str
    artifact_id: str
    version_number: int
    created_at: str
    created_by: str = "system"
    change_type: Literal["create", "update", "restore", "rework_output"] = "create"
    summary: str = ""
    content_ref: str | None = None
    diff_ref: str | None = None
    related_plan_id: str | None = None
    restored_from_version_id: str | None = None
    restore_reason: str | None = None


class ManagedArtifact(BaseModel):
    id: str
    project_id: str
    artifact_type: ArtifactType = "document"
    title: str
    path: str
    mime_type: str | None = None
    is_managed: bool = True
    primary_plan_id: str | None = None
    linked_plan_ids: list[str] = Field(default_factory=list)
    current_version_id: str | None = None
    created_by: str = "system"
    created_at: str
    updated_at: str
    archived_at: str | None = None


class ProjectMemoryEntry(BaseModel):
    id: str
    project_id: str
    category: ProjectMemoryCategory
    title: str
    content: str
    confidence: float = 1.0
    source_event_type: str = ""
    source_plan_id: str | None = None
    source_phase_snapshot_id: str | None = None
    supersedes_entry_id: str | None = None
    created_at: str
    updated_at: str


class ProjectTimelineEvent(BaseModel):
    id: str
    project_id: str
    event_type: str
    title: str
    summary: str = ""
    phase: ProjectPhase | None = None
    related_plan_id: str | None = None
    related_thread_id: str | None = None
    related_artifact_id: str | None = None
    related_memory_entry_id: str | None = None
    visibility: TimelineVisibility = "user_visible"
    created_by: str = "system"
    created_at: str
    payload: dict[str, Any] = Field(default_factory=dict)


class ProjectDecisionAction(BaseModel):
    id: str
    label: str


class ProjectDecisionRequest(BaseModel):
    id: str
    project_id: str
    type: DecisionType
    status: DecisionStatus = "pending"
    title: str
    summary: str = ""
    related_plan_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    actions: list[ProjectDecisionAction] = Field(default_factory=list)
    created_at: str
    resolved_at: str | None = None
    resolution: dict[str, Any] | None = None


class ProjectMemorySummary(BaseModel):
    brief: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    learnings: list[str] = Field(default_factory=list)
    handoff: list[str] = Field(default_factory=list)


class ProjectStats(BaseModel):
    plan_total: int = 0
    plan_active: int = 0
    thread_total: int = 0
    managed_artifact_total: int = 0


class ProjectProgressPhaseItem(BaseModel):
    phase: ProjectPhase
    status: Literal["completed", "current", "pending"]


class ProjectProgress(BaseModel):
    phase_index: int = 1
    phase_count: int = 5
    percent: int = 0
    phase_track: list[ProjectProgressPhaseItem] = Field(default_factory=list)


class Project(BaseModel):
    id: str
    name: str
    description: str = ""
    goal: str = ""
    lifecycle_status: ProjectLifecycleStatus = "active"
    current_phase: ProjectPhase = "头脑风暴"
    current_primary_plan_id: str | None = None
    current_primary_thread_id: str | None = None
    active_phase_snapshot_id: str | None = None
    project_memory_summary: ProjectMemorySummary = Field(default_factory=ProjectMemorySummary)
    created_by: str = "system"
    created_at: str
    updated_at: str
    completed_at: str | None = None
    archived_at: str | None = None


class ProjectDashboard(BaseModel):
    project: Project
    progress: ProjectProgress
    current_primary_plan: ExecutionPlan | None = None
    next_action: dict[str, str] | None = None
    blockers: list[dict[str, str]] = Field(default_factory=list)
    pending_confirmations: list[ProjectDecisionRequest] = Field(default_factory=list)
    recent_threads: list[ProjectThreadLink] = Field(default_factory=list)
    recent_timeline: list[ProjectTimelineEvent] = Field(default_factory=list)

