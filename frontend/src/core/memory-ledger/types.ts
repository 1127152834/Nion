export interface MemoryLedgerNode {
  memory_id: string;
  canonical_key: string;
  summary: string;
  status: string;
  updated_at: string;
}

export interface MemoryLedgerRevision {
  memory_id: string;
  revision_id: string;
  revision_number: number;
  summary: string;
  evidence_ref: string | null;
  created_at: string;
}

export interface MemoryLedgerResponse {
  nodes: MemoryLedgerNode[];
  current_revisions: MemoryLedgerRevision[];
}
