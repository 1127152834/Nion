from typing import Any, Literal

from pydantic import BaseModel, Field

LocalActionPermissionMode = Literal["disabled", "review_required", "allow_all"]
LocalActionGoalStatus = Literal[
    "planned",
    "awaiting_review",
    "executing",
    "completed",
    "failed",
    "blocked",
]
LocalActionRiskLevel = Literal["low", "medium", "high", "critical"]
LocalActionApprovalStatus = Literal["not_required", "pending", "approved", "rejected"]
LocalActionItemStatus = Literal["pending", "running", "succeeded", "failed", "skipped"]


class LocalActionItem(BaseModel):
    action_id: str
    action_type: str
    target: str = ""
    parameters: dict[str, Any] = Field(default_factory=dict)
    reversible: bool = True
    risk_level: LocalActionRiskLevel = "low"
    status: LocalActionItemStatus = "pending"
    result_summary: str = ""
    error_reason: str | None = None


class LocalActionGoal(BaseModel):
    goal_id: str
    source_surface: str
    source_channel: str | None = None
    user_input: str
    status: LocalActionGoalStatus
    created_at: str


class LocalActionPlan(BaseModel):
    plan_id: str
    goal_id: str
    summary: str
    risk_level: LocalActionRiskLevel
    requires_review: bool
    actions: list[LocalActionItem] = Field(default_factory=list)
    created_at: str


class LocalActionExecutionRecord(BaseModel):
    execution_id: str
    goal_id: str
    plan_id: str
    permission_mode: LocalActionPermissionMode
    approval_status: LocalActionApprovalStatus
    executed_actions: list[LocalActionItem] = Field(default_factory=list)
    has_irreversible_action: bool = False
    audit_summary: str = ""
    started_at: str
    finished_at: str | None = None
