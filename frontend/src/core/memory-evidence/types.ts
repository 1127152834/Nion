export interface MemoryEvidenceItem {
  evidence_id: string;
  thread_id: string | null;
  turn_id: string | null;
  source_type: string;
  actor: string;
  durability_scope: string;
  created_at: string;
  artifact_uri: string | null;
  content_preview: string;
}

export interface MemoryEvidencePaging {
  limit: number;
  offset: number;
  total: number;
}

export interface MemoryEvidenceResponse {
  items: MemoryEvidenceItem[];
  paging: MemoryEvidencePaging;
}

export interface MemoryEvidenceQuery {
  thread_id?: string;
  source_type?: string;
  limit?: number;
  offset?: number;
}
