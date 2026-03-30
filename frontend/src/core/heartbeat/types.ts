export interface HeartbeatStatusResponse {
  running: boolean;
  last_tick_at?: string | null;
  last_tick_status?: string | null;
  last_tick_summary?: string | null;
  session_count_since_last_tick: number;
}

export interface HeartbeatLog {
  bot_id: string;
  status: string;
  summary: string;
  started_at: string;
  finished_at?: string | null;
  details?: Record<string, unknown>;
}

export interface HeartbeatLogsResponse {
  items: HeartbeatLog[];
}
