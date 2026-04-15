export interface MemorySettingsIndexHealth {
  state: string;
  detail: string;
  record_count: number;
  last_rebuild_at: string | null;
}

export interface MemorySettingsRetrievalStatus {
  vector_enabled: boolean;
  reranker_enabled: boolean;
  detail: string;
}

export interface MemorySettingsJumpTarget {
  section: string;
}

export interface MemorySettingsResponse {
  retrieval_status: MemorySettingsRetrievalStatus;
  index_health: MemorySettingsIndexHealth;
  jump_target: MemorySettingsJumpTarget;
}
