export interface RebuildResult {
  status: string;
  summary: string;
  source_count: number;
  restored_count: number;
  skipped_count: number;
  provider?: string;
}

export interface RebuildLog {
  status: string;
  summary: string;
  source_count: number;
  restored_count: number;
  skipped_count: number;
  started_at: string;
  completed_at?: string | null;
  details?: Record<string, unknown>;
}

export interface RebuildLogsResponse {
  items: RebuildLog[];
  total_count: number;
}
