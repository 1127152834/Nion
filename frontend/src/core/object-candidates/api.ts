import type {
  ObjectCandidateActionResponse,
  ObjectCandidateApplyResponse,
  ObjectCandidateDeferRequest,
  ObjectCandidateDetail,
  ObjectCandidateDismissRequest,
  ObjectCandidateListResponse,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listObjectCandidates(): Promise<ObjectCandidateListResponse> {
  const response = await fetch("/api/object-candidates");
  return parseJson<ObjectCandidateListResponse>(response);
}

export async function getObjectCandidate(candidateId: string): Promise<ObjectCandidateDetail> {
  const response = await fetch(`/api/object-candidates/${candidateId}`);
  return parseJson<ObjectCandidateDetail>(response);
}

export async function applyObjectCandidate(candidateId: string): Promise<ObjectCandidateApplyResponse> {
  const response = await fetch(`/api/object-candidates/${candidateId}/apply`, {
    method: "POST",
  });
  return parseJson<ObjectCandidateApplyResponse>(response);
}

export async function dismissObjectCandidate(
  candidateId: string,
  input: ObjectCandidateDismissRequest,
): Promise<ObjectCandidateActionResponse> {
  const response = await fetch(`/api/object-candidates/${candidateId}/dismiss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<ObjectCandidateActionResponse>(response);
}

export async function deferObjectCandidate(
  candidateId: string,
  input: ObjectCandidateDeferRequest,
): Promise<ObjectCandidateActionResponse> {
  const response = await fetch(`/api/object-candidates/${candidateId}/defer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<ObjectCandidateActionResponse>(response);
}
