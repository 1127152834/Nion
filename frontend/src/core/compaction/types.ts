export interface CompactionResult {
  status: string;
  summary: string;
  compacted_fact_count: number;
}

export interface CompactionLog {
  status: string;
  summary: string;
  message_count: number;
  error_message?: string;
  usage?: Record<string, unknown> | null;
  model_id?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface CompactionLogsResponse {
  items: CompactionLog[];
  total_count: number;
}

export interface MemoryUsageResponse {
  count: number;
  total_text_bytes: number;
  estimated_storage_bytes: number;
  avg_text_bytes: number;
  provider?: string;
}
