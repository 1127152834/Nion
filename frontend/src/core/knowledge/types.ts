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
  status:
    | "queued"
    | "running"
    | "compiled"
    | "failed"
    | "stale"
    | "ignored"
    | "source_missing";
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
  stage:
    | "queued"
    | "snapshotting"
    | "extracting"
    | "writing_pages"
    | "rebuilding_graph"
    | "finalizing";
  status: "pending" | "running" | "succeeded" | "failed" | "partially_succeeded";
  started_at?: string;
  finished_at?: string;
  created_page_ids: string[];
  outputs: {
    created_pages: string[];
    created_page_ids: string[];
    updated_pages: string[];
    stale_pages: string[];
    archived_pages: string[];
  };
  error_summary?: string;
}

export interface KnowledgeCompileJobListResponse {
  jobs: KnowledgeCompileJob[];
}

export interface KnowledgeActivityEvent {
  event_id: string;
  event_type:
    | "candidate_enqueued"
    | "job_started"
    | "snapshot_completed"
    | "page_created"
    | "page_updated"
    | "page_archived"
    | "graph_rebuilt"
    | "job_failed"
    | "job_succeeded"
    | "candidate_became_stale"
    | "source_missing_detected"
    | "source_restored";
  source_id?: string;
  page_id?: string;
  job_id?: string;
  detail: string;
  created_at: string;
}

export interface KnowledgeActivityListResponse {
  events: KnowledgeActivityEvent[];
}

export interface NotebookKnowledgeStatus {
  has_knowledge: boolean;
  tag_label: "知识库";
  status: "queued" | "running" | "compiled" | "failed" | "stale" | "source_missing";
  enqueue_state: "not_enqueued" | "enqueued";
  compile_state: "idle" | "pending" | "running" | "succeeded" | "failed";
  last_job_id?: string;
  created_page_ids: string[];
  error_summary?: string;
}

export interface KnowledgeQueryResult {
  answer_markdown: string;
  page_ids: string[];
}

export interface KnowledgeGraphPayload {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}

export interface KnowledgeRevisionRequest {
  request_id: string;
  page_id: string;
  request_type: string;
  instruction: string;
  optional_source_refs: string[];
  status: "open" | "previewed" | "applied" | "closed";
  created_at: string;
}

export interface KnowledgeRevisionPreview extends KnowledgeRevisionRequest {}

export interface KnowledgeLintReport {
  orphan_pages: Array<Record<string, unknown>>;
  broken_links: Array<Record<string, unknown>>;
  stale_pages: Array<Record<string, unknown>>;
  contradictions: Array<Record<string, unknown>>;
  data_gaps: Array<Record<string, unknown>>;
}
