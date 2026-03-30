export type AutomationScheduleKind = "once" | "interval" | "cron" | "event";
export type AutomationSchedulePreset = "once" | "daily" | "weekdays" | "weekly" | "interval" | "cron" | "event";
export type AutomationJobKind = "reminder" | "scheduled_task" | "event_task";
export type AutomationJobState = "scheduled" | "paused" | "running" | "error";
export type AutomationDeliveryMode = "local" | "thread" | "channel" | "multi";
export type AutomationRunStatus = "running" | "succeeded" | "failed" | "skipped";
export type AutomationTriggerKind = "schedule" | "event" | "manual";
export type AutomationActionKind =
  | "agent_prompt"
  | "script"
  | "notify"
  | "play_sound"
  | "notebook_write";

export interface AutomationJob {
  id: string;
  name: string;
  prompt: string;
  job_kind: AutomationJobKind;
  schedule_kind: AutomationScheduleKind;
  schedule_value: string;
  schedule_preset: AutomationSchedulePreset;
  trigger_kind: AutomationTriggerKind;
  trigger_spec: Record<string, unknown>;
  action_kind: AutomationActionKind;
  action_spec: Record<string, unknown>;
  schedule_timezone: string;
  schedule_metadata: Record<string, unknown>;
  enabled: boolean;
  state: AutomationJobState;
  delivery_mode: AutomationDeliveryMode;
  delivery_targets: Array<Record<string, unknown>>;
  skills: string[];
  session_policy: Record<string, unknown>;
  toolset_profile: string;
  package_dir?: string | null;
  package_manifest: Record<string, unknown>;
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

export interface AutomationEvent {
  event_id: string;
  timestamp?: string | null;
  category: string;
  level: string;
  event_type: string;
  thread_id?: string | null;
  run_id?: string | null;
  actor: string;
  message: string;
  details: Record<string, unknown>;
}

export interface AutomationJobCreateInput {
  name: string;
  prompt: string;
  job_kind?: AutomationJobKind;
  schedule_kind?: AutomationScheduleKind;
  schedule_value?: string;
  schedule_preset?: AutomationSchedulePreset;
  trigger_kind?: AutomationTriggerKind;
  trigger_spec?: Record<string, unknown>;
  action_kind?: AutomationActionKind;
  action_spec?: Record<string, unknown>;
  schedule_timezone?: string;
  schedule_metadata?: Record<string, unknown>;
  enabled?: boolean;
  delivery_mode: AutomationDeliveryMode;
  delivery_targets: Array<Record<string, unknown>>;
  skills: string[];
  package_dir?: string | null;
  package_manifest?: Record<string, unknown>;
  session_policy?: Record<string, unknown>;
  toolset_profile?: string;
}
