export type AutomationScheduleKind = "once" | "interval" | "cron";
export type AutomationSchedulePreset = "once" | "daily" | "weekdays" | "weekly" | "interval" | "cron";
export type AutomationJobKind = "reminder" | "scheduled_task";
export type AutomationJobState = "scheduled" | "paused" | "running" | "error";
export type AutomationDeliveryMode = "local" | "thread" | "channel" | "multi";
export type AutomationRunStatus = "running" | "succeeded" | "failed" | "skipped";
export type AutomationTriggerKind = "schedule" | "manual";
export type AutomationActionKind = "agent_prompt";

export interface AutomationJob {
  id: string;
  name: string;
  prompt: string;
  job_kind: AutomationJobKind;
  schedule_kind: AutomationScheduleKind;
  schedule_value: string;
  schedule_preset: AutomationSchedulePreset;
  schedule_timezone: string;
  schedule_metadata: Record<string, unknown>;
  enabled: boolean;
  state: AutomationJobState;
  delivery_mode: AutomationDeliveryMode;
  delivery_targets: Array<Record<string, unknown>>;
  skills: string[];
  session_policy: Record<string, unknown>;
  toolset_profile: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  last_status?: string | null;
  last_result_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRun {
  id: string;
  job_id: string;
  started_at: string;
  finished_at?: string | null;
  status: AutomationRunStatus;
  trigger_event_name?: string | null;
  result_summary: string;
  output_artifacts: string[];
  delivery_results: Array<Record<string, unknown>>;
}

export interface AutomationStatus {
  scheduler_running: boolean;
  total_jobs_count: number;
  active_jobs_count: number;
  paused_jobs_count: number;
  error_jobs_count: number;
  run_count: number;
  failed_runs_count: number;
  last_tick_at?: string | null;
  last_success_at?: string | null;
}

export interface AutomationJobCreateInput {
  name: string;
  prompt: string;
  job_kind?: AutomationJobKind;
  schedule_kind?: AutomationScheduleKind;
  schedule_value?: string;
  schedule_preset?: AutomationSchedulePreset;
  schedule_timezone?: string;
  schedule_metadata?: Record<string, unknown>;
  enabled?: boolean;
  delivery_mode: AutomationDeliveryMode;
  delivery_targets: Array<Record<string, unknown>>;
  skills: string[];
  session_policy?: Record<string, unknown>;
  toolset_profile?: string;
}
