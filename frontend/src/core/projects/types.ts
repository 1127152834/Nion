export type ProjectLifecycleStatus =
  | "active"
  | "completed"
  | "archived"
  | "abandoned";

export type ProjectPhase = "头脑风暴" | "设计" | "计划" | "实施" | "完成";

export type ProjectProgressPhaseItem = {
  phase: ProjectPhase;
  status: "completed" | "current" | "pending";
};

export type ProjectProgress = {
  phase_index: number;
  phase_count: number;
  percent: number;
  phase_track: ProjectProgressPhaseItem[];
};

export type ExecutionPlanStatus = {
  lifecycle_status:
    | "draft"
    | "ready"
    | "running"
    | "completed"
    | "failed"
    | "canceled"
    | "archived";
  queue_status: "not_queued" | "queued" | "dispatched";
  hold_status:
    | "none"
    | "paused"
    | "blocked"
    | "waiting_confirmation"
    | "review_pending"
    | "waiting_manual_start";
  hold_reason:
    | "rate_limited"
    | "dependency"
    | "manual"
    | "missing_input"
    | "tool_error"
    | "human_decision"
    | null;
};

export type ExecutionPlan = {
  id: string;
  project_id: string;
  phase: ProjectPhase;
  title: string;
  description: string;
  plan_type: "normal" | "rework" | "review" | "completion";
  execution_mode: "manual" | "auto";
  is_gate_plan: boolean;
  is_primary: boolean;
  sort_order: number;
  status: ExecutionPlanStatus;
  outcome_status?:
    | "done"
    | "done_with_followups"
    | "needs_revision"
    | "blocked"
    | "canceled"
    | null;
  outcome_summary: string;
  depends_on_plan_ids: string[];
  branch_routes: Record<string, string>;
  primary_thread_id?: string | null;
  primary_artifact_id?: string | null;
  rework_of_plan_id?: string | null;
  derived_from_outcome_id?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
};

export type ProjectThreadLink = {
  id: string;
  project_id: string;
  thread_id: string;
  role: "primary" | "exploration" | "implementation" | "review" | "temporary";
  linked_plan_ids: string[];
  is_primary_thread: boolean;
  created_at: string;
  updated_at: string;
  last_active_at?: string | null;
};

export type ProjectDecisionAction = {
  id: string;
  label: string;
};

export type ProjectDecisionRequest = {
  id: string;
  project_id: string;
  type:
    | "confirm_plan_outcome"
    | "create_rework_plan"
    | "extract_long_term_memory"
    | "extract_skill"
    | "complete_project"
    | "archive_project"
    | "abandon_project"
    | "confirm_route_change";
  status: "pending" | "resolved";
  title: string;
  summary: string;
  related_plan_id?: string | null;
  payload: Record<string, unknown>;
  actions: ProjectDecisionAction[];
  created_at: string;
  resolved_at?: string | null;
};

export type ProjectTimelineEvent = {
  id: string;
  project_id: string;
  event_type: string;
  title: string;
  summary: string;
  phase?: ProjectPhase | null;
  related_plan_id?: string | null;
  related_thread_id?: string | null;
  related_artifact_id?: string | null;
  created_at: string;
  payload?: Record<string, unknown>;
};

export type ProjectMemorySummary = {
  brief: string[];
  decisions: string[];
  constraints: string[];
  learnings: string[];
  handoff: string[];
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  goal: string;
  lifecycle_status: ProjectLifecycleStatus;
  current_phase: ProjectPhase;
  current_primary_plan_id?: string | null;
  current_primary_thread_id?: string | null;
  active_phase_snapshot_id?: string | null;
  project_memory_summary: ProjectMemorySummary;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  archived_at?: string | null;
};

export type ProjectListItem = {
  id: string;
  name: string;
  goal: string;
  lifecycle_status: ProjectLifecycleStatus;
  current_phase: ProjectPhase;
  progress: ProjectProgress;
  current_primary_plan?: Pick<ExecutionPlan, "id" | "title"> | null;
  stats: {
    plan_total: number;
    plan_active: number;
    thread_total: number;
    managed_artifact_total: number;
  };
  last_active_at: string;
};

export type ProjectDashboard = {
  project: ProjectRecord;
  progress: ProjectProgress;
  current_primary_plan?: ExecutionPlan | null;
  next_action?: {
    type: string;
    label: string;
  } | null;
  blockers: Array<{
    plan_id: string;
    title: string;
    reason: string;
  }>;
  pending_confirmations: ProjectDecisionRequest[];
  recent_threads: ProjectThreadLink[];
  recent_timeline: ProjectTimelineEvent[];
  stats: {
    plan_total: number;
    plan_active: number;
    thread_total: number;
    managed_artifact_total: number;
  };
};

export type ProjectListResponse = {
  items: ProjectListItem[];
  next_cursor: string | null;
};

