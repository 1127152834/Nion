import { getBackendBaseURL } from "../config/index.ts";

import type { RetrievalModelsStatusResponse } from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRetrievalEmbeddingProfile(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    value.mode === "remote_managed" &&
    typeof value.endpoint === "string" &&
    typeof value.model_name === "string" &&
    typeof value.dimensions === "number"
  );
}

function isRetrievalRerankerProfile(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    (value.mode === "local_managed" || value.mode === "remote_managed") &&
    typeof value.model_name === "string"
  );
}

function isRetrievalModelsConsumerStatus(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    typeof value.consumer_id === "string" &&
    typeof value.label === "string" &&
    typeof value.index_state === "string" &&
    typeof value.rebuild_required === "boolean"
  );
}

function isRetrievalModelsStatusResponse(
  value: unknown,
): value is RetrievalModelsStatusResponse {
  return (
    isObjectRecord(value) &&
    isObjectRecord(value.active_profile) &&
    isRetrievalEmbeddingProfile(value.active_profile.embedding) &&
    isRetrievalRerankerProfile(value.active_profile.reranker) &&
    Array.isArray(value.consumers) &&
    value.consumers.every(isRetrievalModelsConsumerStatus)
  );
}

export async function loadRetrievalModelsStatus(): Promise<RetrievalModelsStatusResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/retrieval-models/status`);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load retrieval models status (${response.status})`);
  }

  if (!isRetrievalModelsStatusResponse(payload)) {
    throw new Error(
      "Invalid retrieval models payload returned from loadRetrievalModelsStatus",
    );
  }

  return payload;
}
