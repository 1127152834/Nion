export interface SelfMaintenanceEntry {
  run_id?: string;
  trigger?: string;
  summary?: string;
  what_i_did?: string[];
  what_i_learned?: string[];
  stale_items?: string[];
  memory_update_proposals?: string[];
  prune_proposals?: string[];
  action_proposals?: string[];
  self_upgrade_proposals?: string[];
  sources?: string[];
}

export interface SelfMaintenanceRunInput {
  query: string;
}

export interface SelfMaintenanceRunResponse {
  entry: SelfMaintenanceEntry;
  entry_path: string;
  memory_update_proposals: string[];
  prune_proposals: string[];
  action_proposals: string[];
  self_upgrade_proposals: string[];
}

export interface SelfMaintenanceStatusResponse {
  running: boolean;
  last_run_at?: string | null;
  last_run_status?: string | null;
  last_run_summary?: string | null;
  session_count_since_last_run: number;
  next_eligibility_hint: string;
}

export interface SelfMaintenanceLog {
  trigger: string;
  status: string;
  summary: string;
  started_at: string;
  completed_at?: string | null;
  memory_update_proposals?: string[];
  prune_proposals?: string[];
  action_proposals?: string[];
  self_upgrade_proposals?: string[];
  sources?: string[];
  entry_path?: string | null;
}

export interface SelfMaintenanceLogsResponse {
  items: SelfMaintenanceLog[];
}
