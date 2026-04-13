export interface KnowledgeSourceCandidate {
  source_id: string;
  source_kind: "notebook_note" | "notebook_asset";
  notebook_ref: {
    note_id?: string;
    asset_id?: string;
    relative_path: string;
  };
  title: string;
  summary: string;
  content_hash: string;
  status: "queued" | "approved" | "compiled" | "failed" | "stale" | "ignored";
  created_at: string;
  updated_at: string;
  last_compiled_at?: string;
  compile_error?: string;
}

export interface KnowledgePage {
  page_id: string;
  page_type: string;
  title: string;
  relative_path: string;
  absolute_path: string;
  body: string;
  sources: string[];
  compiled_from: Array<Record<string, unknown>>;
  last_compiled_at: string;
  agent_owned: boolean;
  human_editable: boolean;
}

export interface KnowledgeCompileJob {
  job_id: string;
  source_ids: string[];
  trigger_mode: "manual" | "queue_approval";
  status: "pending" | "running" | "succeeded" | "failed" | "partially_succeeded";
  started_at?: string;
  finished_at?: string;
  outputs: {
    created_pages: string[];
    updated_pages: string[];
    contradiction_pages: string[];
    graph_rebuilt: boolean;
  };
  error_summary?: string;
}
