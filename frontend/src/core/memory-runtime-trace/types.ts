export interface MemoryRuntimeTraceEvent {
  event_id: string;
  event_type: string;
  memory_id: string | null;
  thread_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface MemoryRuntimeTraceResponse {
  items: MemoryRuntimeTraceEvent[];
}

export interface MemoryRuntimeTraceQuery {
  thread_id?: string;
  event_type?: string;
  limit?: number;
}
