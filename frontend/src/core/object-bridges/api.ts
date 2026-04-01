import type {
  BridgeCandidateResponse,
  NotebookToMemoryCandidateRequest,
  NotebookToProjectConstraintRequest,
  NotebookToProjectDraftRequest,
  NotebookToProjectPlanDraftRequest,
  ProjectNotebookReferenceRequest,
  ProjectToMemoryCandidateRequest,
  ProjectToNotebookDraftRequest,
  ProjectToSkillCandidateRequest,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function createProjectDraftFromNotebook(
  input: NotebookToProjectDraftRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch("/api/notebook/bridge/project-drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function createProjectPlanDraftFromNotebook(
  input: NotebookToProjectPlanDraftRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch("/api/notebook/bridge/project-plan-drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function createProjectConstraintCandidatesFromNotebook(
  input: NotebookToProjectConstraintRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch("/api/notebook/bridge/project-constraint-candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function createMemoryCandidatesFromNotebook(
  input: NotebookToMemoryCandidateRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch("/api/notebook/bridge/memory-candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function createNotebookDraftFromProject(
  projectId: string,
  input: ProjectToNotebookDraftRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch(`/api/projects/${projectId}/bridge/notebook-drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function createMemoryCandidatesFromProject(
  projectId: string,
  input: ProjectToMemoryCandidateRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch(`/api/projects/${projectId}/bridge/memory-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function createSkillCandidatesFromProject(
  projectId: string,
  input: ProjectToSkillCandidateRequest,
): Promise<BridgeCandidateResponse> {
  const response = await fetch(`/api/projects/${projectId}/bridge/skill-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<BridgeCandidateResponse>(response);
}

export async function attachNotebookNoteToProject(
  projectId: string,
  input: ProjectNotebookReferenceRequest,
): Promise<{ link: Record<string, unknown> }> {
  const response = await fetch(`/api/projects/${projectId}/references/notebook-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<{ link: Record<string, unknown> }>(response);
}
