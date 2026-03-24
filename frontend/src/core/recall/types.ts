export interface RecallSearchResult {
  thread_id: string;
  agent_name: string;
  role: string;
  snippet: string;
  created_at: string;
}

export interface RecallSearchResponse {
  scope: "global" | "thread";
  results: RecallSearchResult[];
}
