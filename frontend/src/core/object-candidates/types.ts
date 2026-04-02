export type ObjectCandidateSummary = {
  id: string;
  candidate_type: string;
  status: string;
  title: string;
  summary: string;
  risk_level: string;
  available_actions: string[];
  deferred_until: string | null;
  created_at: string;
};

export type ObjectCandidateDetail = {
  candidate: Record<string, unknown>;
  provenance: Record<string, unknown>[];
  action_history: Record<string, unknown>[];
  guard_state: {
    is_applicable: boolean;
    reasons: string[];
    checked_at: string;
  };
  source_summary: Record<string, unknown>;
  target_summary: Record<string, unknown>;
};

export type ObjectCandidateListResponse = {
  items: ObjectCandidateSummary[];
  next_cursor: string | null;
};

export type ObjectCandidateApplyResponse = {
  candidate: Record<string, unknown>;
  applied_target: Record<string, unknown>;
  applied_at: string;
};

export type ObjectCandidateActionResponse = {
  candidate: Record<string, unknown>;
};

export type ObjectCandidateDismissRequest = {
  reason: string;
};

export type ObjectCandidateDeferRequest = {
  deferred_until: string;
  reason: string;
};
