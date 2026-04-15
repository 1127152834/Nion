import { getBackendBaseURL } from "../config/index.ts";

import type {
  RebuildRetrievalConsumersResult,
  RetrievalModelsConsumerStatus,
  RetrievalModelsStatusResponse,
  SaveRetrievalModelsProfileRequest,
  TestRetrievalEmbeddingRequest,
  TestRetrievalEmbeddingResult,
  TestRetrievalRerankerRequest,
  TestRetrievalRerankerResult,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRetrievalConsumerStatus(value: unknown): value is RetrievalModelsConsumerStatus {
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
    isObjectRecord(value.active_profile.embedding) &&
    value.active_profile.embedding.mode === "remote_managed" &&
    typeof value.active_profile.embedding.endpoint === "string" &&
    typeof value.active_profile.embedding.model_name === "string" &&
    typeof value.active_profile.embedding.dimensions === "number" &&
    typeof value.active_profile.embedding.api_key_configured === "boolean" &&
    isObjectRecord(value.active_profile.reranker) &&
    value.active_profile.reranker.mode === "remote_managed" &&
    typeof value.active_profile.reranker.endpoint === "string" &&
    typeof value.active_profile.reranker.model_name === "string" &&
    typeof value.active_profile.reranker.api_key_configured === "boolean" &&
    Array.isArray(value.consumers) &&
    value.consumers.every(isRetrievalConsumerStatus) &&
    isObjectRecord(value.capability) &&
    typeof value.capability.local_prepare_enabled === "boolean" &&
    typeof value.capability.remote_config_enabled === "boolean" &&
    typeof value.capability.test_enabled === "boolean" &&
    typeof value.capability.rebuild_enabled === "boolean" &&
    typeof value.capability.status_only === "boolean"
  );
}

function isEmbeddingTestResult(value: unknown): value is TestRetrievalEmbeddingResult {
  return (
    isObjectRecord(value) &&
    typeof value.ok === "boolean" &&
    typeof value.vector_size === "number" &&
    typeof value.message === "string"
  );
}

function isRerankerTestResult(value: unknown): value is TestRetrievalRerankerResult {
  return (
    isObjectRecord(value) &&
    typeof value.ok === "boolean" &&
    typeof value.top_document_index === "number" &&
    typeof value.top_score === "number" &&
    typeof value.message === "string"
  );
}

function isRebuildConsumersResult(value: unknown): value is RebuildRetrievalConsumersResult {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.accepted) &&
    value.accepted.every((item) => typeof item === "string") &&
    Array.isArray(value.results) &&
    value.results.every(
      (item) =>
        isObjectRecord(item) &&
        typeof item.consumer_id === "string" &&
        typeof item.status === "string" &&
        (item.detail === undefined || typeof item.detail === "string") &&
        (item.record_count === undefined || typeof item.record_count === "number"),
    ) &&
    typeof value.message === "string"
  );
}

async function parseJson(response: Response): Promise<unknown> {
  return (await response.json().catch(() => null)) as unknown;
}

function buildError(response: Response, payload: unknown, fallback: string): Error {
  if (isObjectRecord(payload) && typeof payload.detail === "string" && payload.detail.trim()) {
    return new Error(payload.detail);
  }
  return new Error(`${fallback} (${response.status})`);
}

export async function loadRetrievalModelsStatus(): Promise<RetrievalModelsStatusResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/retrieval-models/status`);
  const payload = await parseJson(response);

  if (!response.ok) {
    throw buildError(response, payload, "Failed to load retrieval models status");
  }
  if (!isRetrievalModelsStatusResponse(payload)) {
    throw new Error(
      "Invalid retrieval models payload returned from loadRetrievalModelsStatus",
    );
  }
  return payload;
}

export async function saveRetrievalModelsProfile(
  request: SaveRetrievalModelsProfileRequest,
): Promise<RetrievalModelsStatusResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/retrieval-models/active`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embedding: {
        mode: "remote_managed",
        endpoint: request.embedding.endpoint,
        api_key: request.embedding.api_key ?? "",
        model_name: request.embedding.model_name,
        dimensions: request.embedding.dimensions,
      },
      reranker: {
        mode: "remote_managed",
        endpoint: request.reranker.endpoint,
        api_key: request.reranker.api_key ?? "",
        model_name: request.reranker.model_name,
      },
    }),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw buildError(response, payload, "Failed to save retrieval models profile");
  }
  if (!isRetrievalModelsStatusResponse(payload)) {
    throw new Error(
      "Invalid retrieval models payload returned from saveRetrievalModelsProfile",
    );
  }
  return payload;
}

export async function testRetrievalEmbeddingProfile(
  request: TestRetrievalEmbeddingRequest,
): Promise<TestRetrievalEmbeddingResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/retrieval-models/test/embedding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "remote_managed",
      endpoint: request.endpoint,
      api_key: request.api_key,
      model_name: request.model_name,
      dimensions: 1,
      probe_text: request.probe_text ?? "hello retrieval",
    }),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw buildError(response, payload, "Failed to test retrieval embedding profile");
  }
  if (!isEmbeddingTestResult(payload)) {
    throw new Error(
      "Invalid payload returned from testRetrievalEmbeddingProfile",
    );
  }
  return payload;
}

export async function testRetrievalRerankerProfile(
  request: TestRetrievalRerankerRequest,
): Promise<TestRetrievalRerankerResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/retrieval-models/test/reranker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "remote_managed",
      endpoint: request.endpoint,
      api_key: request.api_key,
      model_name: request.model_name,
      query: request.query ?? "budget policy",
      documents: request.documents ?? ["finance", "policy"],
    }),
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw buildError(response, payload, "Failed to test retrieval reranker profile");
  }
  if (!isRerankerTestResult(payload)) {
    throw new Error(
      "Invalid payload returned from testRetrievalRerankerProfile",
    );
  }
  return payload;
}

export async function rebuildRetrievalConsumerIndexes(
  consumerIds: string[],
): Promise<RebuildRetrievalConsumersResult> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/retrieval-models/rebuild-consumer-indexes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ consumer_ids: consumerIds }),
    },
  );
  const payload = await parseJson(response);

  if (!response.ok) {
    throw buildError(response, payload, "Failed to rebuild retrieval consumer indexes");
  }
  if (!isRebuildConsumersResult(payload)) {
    throw new Error(
      "Invalid payload returned from rebuildRetrievalConsumerIndexes",
    );
  }
  return payload;
}
