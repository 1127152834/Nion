import { getBackendBaseURL } from "../config";

import type {
  Model,
  ModelConnectionTestRequest,
  ModelConnectionTestResponse,
  ModelMetadataRequest,
  ModelMetadataResponse,
  ProviderModelsRequest,
  ProviderModelsResponse,
} from "./types";

async function parseOrThrow<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = (
      isJson ? (payload as { detail?: { message?: string } | string }).detail : payload
    ) ?? null;
    const detailMessage =
      typeof detail === "string"
        ? detail
        : detail?.message ?? `Request failed with status ${response.status}`;
    throw new Error(detailMessage);
  }

  return payload as T;
}

export async function loadModels() {
  const response = await fetch(`${getBackendBaseURL()}/api/models`);
  const { models } = await parseOrThrow<{ models: Model[] }>(response);
  return models;
}

export async function testModelConnection(
  payload: ModelConnectionTestRequest,
): Promise<ModelConnectionTestResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/models/test-connection`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return parseOrThrow<ModelConnectionTestResponse>(response);
}

export async function loadProviderModels(
  payload: ProviderModelsRequest,
): Promise<ProviderModelsResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/models/provider-models`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return parseOrThrow<ProviderModelsResponse>(response);
}

export async function loadModelMetadata(
  payload: ModelMetadataRequest,
): Promise<ModelMetadataResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/models/model-metadata`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return parseOrThrow<ModelMetadataResponse>(response);
}
