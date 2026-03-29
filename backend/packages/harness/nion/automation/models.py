from typing import Any, Literal

from pydantic import BaseModel, Field

AutomationScheduleKind = Literal["once", "interval", "cron", "event"]
AutomationSchedulePreset = Literal["once", "daily", "weekdays", "weekly", "interval", "cron", "event"]
AutomationJobKind = Literal["reminder", "scheduled_task", "event_task", "workflow"]
AutomationJobState = Literal["scheduled", "paused", "running", "error"]
AutomationDeliveryMode = Literal["local", "thread", "channel", "multi"]
AutomationRunStatus = Literal["running", "succeeded", "failed", "skipped", "paused"]
AutomationTriggerKind = Literal["schedule", "event", "manual", "webhook"]
AutomationActionKind = Literal["agent_prompt", "script", "notify", "play_sound", "notebook_write", "plugin_action"]
AutomationTemplateScope = Literal["official", "personal"]
AutomationVisibility = Literal["private", "shared", "team"]
AutomationApprovalStatus = Literal["pending", "approved", "denied"]


class AutomationJob(BaseModel):
    id: str
    name: str
    prompt: str
    job_kind: AutomationJobKind = "scheduled_task"
    schedule_kind: AutomationScheduleKind
    schedule_value: str
    schedule_preset: AutomationSchedulePreset = "interval"
    trigger_kind: AutomationTriggerKind = "schedule"
    trigger_spec: dict[str, Any] = Field(default_factory=dict)
    action_kind: AutomationActionKind = "agent_prompt"
    action_spec: dict[str, Any] = Field(default_factory=dict)
    schedule_timezone: str = "UTC"
    schedule_metadata: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    state: AutomationJobState = "scheduled"
    delivery_mode: AutomationDeliveryMode = "local"
    delivery_targets: list[dict[str, Any]] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    session_policy: dict[str, Any] = Field(default_factory=dict)
    toolset_profile: str = "automation"
    owner_id: str | None = None
    visibility: AutomationVisibility = "private"
    approval_policy: dict[str, Any] = Field(default_factory=dict)
    package_dir: str | None = None
    package_manifest: dict[str, Any] = Field(default_factory=dict)
    workflow_steps: list[dict[str, Any]] = Field(default_factory=list)
    next_run_at: str | None = None
    last_run_at: str | None = None
    last_status: str | None = None
    last_result_summary: str | None = None
    created_at: str
    updated_at: str


class AutomationRun(BaseModel):
    id: str
    job_id: str
    started_at: str
    finished_at: str | None = None
    status: AutomationRunStatus
    trigger_event_name: str | None = None
    result_summary: str = ""
    current_step_id: str | None = None
    failed_step_id: str | None = None
    step_results: list[dict[str, Any]] = Field(default_factory=list)
    output_artifacts: list[str] = Field(default_factory=list)
    delivery_results: list[dict[str, Any]] = Field(default_factory=list)


class AutomationExecutionOutput(BaseModel):
    response_text: str = ""
    artifacts: list[str] = Field(default_factory=list)
    isolated_thread_id: str | None = None


class AutomationTemplate(BaseModel):
    id: str
    name: str
    scope: AutomationTemplateScope
    manifest: dict[str, Any] = Field(default_factory=dict)
    files: dict[str, Any] = Field(default_factory=dict)


class AutomationApproval(BaseModel):
    id: str
    job_id: str
    status: AutomationApprovalStatus = "pending"
    requested_by: str
    reason: str = ""
    requested_at: str
    decided_by: str | None = None
    decided_at: str | None = None


class AutomationAuditEvent(BaseModel):
    id: str
    job_id: str
    action: str
    actor_id: str
    created_at: str
    details: dict[str, Any] = Field(default_factory=dict)
