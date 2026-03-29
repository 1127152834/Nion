export interface AutoDreamEntry {
  dream_id?: string;
  summary?: string;
  what_i_did?: string[];
  what_i_learned?: string[];
  what_changed?: string[];
  what_i_plan_to_change?: string[];
  what_i_changed?: string[];
  stale_items?: string[];
  agent_memory_updates?: string[];
  user_memory_candidates?: string[];
  action_proposals?: string[];
  sources?: string[];
}

export interface AutoDreamRunInput {
  query: string;
}

export interface AutoDreamRunResponse {
  entry: AutoDreamEntry;
  entry_path: string;
  agent_memory_updates: string[];
  user_memory_candidates: string[];
  action_proposals: string[];
}
