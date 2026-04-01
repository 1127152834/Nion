export type BridgeCandidateResponse = {
  candidate: {
    id: string;
    type: string;
    title: string;
    summary: string;
    payload: Record<string, unknown>;
    requires_confirmation: boolean;
    provenance: unknown[];
    created_at: string;
  };
};

export type NotebookToProjectDraftRequest = {
  note_ids: string[];
  fragment_ids: string[];
  mode: "project_draft";
};

export type NotebookToProjectPlanDraftRequest = {
  project_id: string;
  note_ids: string[];
  fragment_ids: string[];
};

export type NotebookToProjectConstraintRequest = {
  project_id: string;
  note_ids: string[];
  fragment_ids: string[];
};

export type NotebookToMemoryCandidateRequest = {
  note_ids: string[];
  fragment_ids: string[];
};
