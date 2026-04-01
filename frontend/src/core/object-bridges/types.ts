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

export type ProjectToNotebookDraftRequest = {
  kind: "summary" | "retro" | "decision_log";
  scope: "current_phase" | "whole_project";
  target_directory: string;
};

export type ProjectToMemoryCandidateRequest = {
  kind: "long_term_memory" | "promote_constraint";
  scope?: "current_phase" | "whole_project";
  project_memory_entry_id?: string;
};

export type ProjectToSkillCandidateRequest = {
  scope: "current_phase" | "whole_project";
};

export type ProjectNotebookReferenceRequest = {
  note_id: string;
  fragment_id: string | null;
  relation: string;
};
