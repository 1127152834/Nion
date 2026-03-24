from typing import Any, Literal

from pydantic import BaseModel, Field

AutomationScheduleKind = Literal["once", "interval", "cron"]
AutomationJobState = Literal["scheduled", "paused", "running", "error"]
AutomationDeliveryMode = Literal["local", "thread", "channel", "multi"]
AutomationRunStatus = Literal["running", "succeeded", "failed", "skipped"]


class AutomationJob(BaseModel):
    id: str
    name: str
    prompt: str
    schedule_kind: AutomationScheduleKind
    schedule_value: str
    enabled: bool = True
    state: AutomationJobState = "scheduled"
    delivery_mode: AutomationDeliveryMode = "local"
    delivery_targets: list[dict[str, Any]] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    session_policy: dict[str, Any] = Field(default_factory=dict)
    toolset_profile: str = "automation"
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
    result_summary: str = ""
    output_artifacts: list[str] = Field(default_factory=list)
    delivery_results: list[dict[str, Any]] = Field(default_factory=list)


class AutomationExecutionOutput(BaseModel):
    response_text: str = ""
    artifacts: list[str] = Field(default_factory=list)
    isolated_thread_id: str | None = None
