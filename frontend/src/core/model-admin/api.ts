import { getBackendBaseURL } from "../config/index.ts";

import type {
  AddProviderModelsRequest,
  CreateProviderInstancePayload,
  LoadProviderTemplatesOptions,
  ModelBindingRecord,
  ProviderConnectionTestResult,
  ProviderDiscoveryResult,
  ProviderInstanceRecord,
  ProviderModelRecord,
  ProviderTemplate,
  ProviderExecutionPayload,
  UpdateBindingPayload,
  UpdateProviderInstancePayload,
  UpdateProviderModelPayload,
} from "./types";

async function parseError(response: Response, fallback: string): Promise<string> {
  const statusLabel = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const detail = await response.text();
  if (!detail) {
    return `${fallback}: ${statusLabel}`;
  }

  try {
    const parsed = JSON.parse(detail) as { detail?: unknown };
    if (parsed && typeof parsed === "object" && parsed.detail !== undefined) {
      if (typeof parsed.detail === "string") {
        return `${statusLabel}: ${parsed.detail}`;
      }
      return `${statusLabel}: ${JSON.stringify(parsed.detail)}`;
    }
  } catch {
    // ignore non-json payloads
  }

  return `${statusLabel}: ${detail}`;
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback = "Request failed",
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await parseError(response, fallback));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function loadProviderTemplates(
  options: LoadProviderTemplatesOptions = {},
): Promise<ProviderTemplate[]> {
  const search = new URLSearchParams();
  if (options.category) {
    search.set("category", options.category);
  }
  const query = search.toString();
  const response = await requestJson<{ templates: ProviderTemplate[] }>(
    `${getBackendBaseURL()}/api/model-admin/templates${query ? `?${query}` : ""}`,
    undefined,
    "Failed to load provider templates",
  );
  return response.templates;
}

export async function loadProviderInstances(): Promise<ProviderInstanceRecord[]> {
  const response = await requestJson<{ providers: ProviderInstanceRecord[] }>(
    `${getBackendBaseURL()}/api/model-admin/providers`,
    undefined,
    "Failed to load provider instances",
  );
  return response.providers;
}

export function createProviderInstance(payload: CreateProviderInstancePayload) {
  return requestJson<{ provider: ProviderInstanceRecord }>(
    `${getBackendBaseURL()}/api/model-admin/providers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to create provider instance",
  );
}

export function updateProviderInstance(
  providerId: string,
  payload: UpdateProviderInstancePayload,
) {
  return requestJson<{ provider: ProviderInstanceRecord }>(
    `${getBackendBaseURL()}/api/model-admin/providers/${providerId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to update provider instance",
  );
}

export function deleteProviderInstance(providerId: string) {
  return requestJson<void>(
    `${getBackendBaseURL()}/api/model-admin/providers/${providerId}`,
    {
      method: "DELETE",
    },
    "Failed to delete provider instance",
  );
}

export function testProviderInstance(
  providerId: string,
  payload: ProviderExecutionPayload = {},
) {
  return requestJson<{
    provider: ProviderInstanceRecord;
    result: ProviderConnectionTestResult;
  }>(
    `${getBackendBaseURL()}/api/model-admin/providers/${providerId}/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to test provider instance",
  );
}

export function discoverProviderModels(
  providerId: string,
  payload: ProviderExecutionPayload = {},
) {
  return requestJson<{
    provider: ProviderInstanceRecord;
    result: ProviderDiscoveryResult;
  }>(
    `${getBackendBaseURL()}/api/model-admin/providers/${providerId}/discover-models`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to discover provider models",
  );
}

export function addProviderModels(
  providerId: string,
  payload: AddProviderModelsRequest,
) {
  return requestJson<{
    provider: ProviderInstanceRecord;
    models: ProviderModelRecord[];
  }>(
    `${getBackendBaseURL()}/api/model-admin/providers/${providerId}/models`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to add provider models",
  );
}

export function updateProviderModel(
  modelId: string,
  payload: UpdateProviderModelPayload,
) {
  return requestJson<{ model: ProviderModelRecord }>(
    `${getBackendBaseURL()}/api/model-admin/models/${modelId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to update provider model",
  );
}

export function deleteProviderModel(modelId: string) {
  return requestJson<void>(
    `${getBackendBaseURL()}/api/model-admin/models/${modelId}`,
    {
      method: "DELETE",
    },
    "Failed to delete provider model",
  );
}

export function testProviderModel(
  modelId: string,
  payload: ProviderExecutionPayload = {},
) {
  return requestJson<{
    provider: ProviderInstanceRecord;
    model: ProviderModelRecord;
    result: ProviderConnectionTestResult;
  }>(
    `${getBackendBaseURL()}/api/model-admin/models/${modelId}/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to test provider model",
  );
}

export async function loadProviderBindings(): Promise<ModelBindingRecord[]> {
  const response = await requestJson<{ bindings: ModelBindingRecord[] }>(
    `${getBackendBaseURL()}/api/model-admin/bindings`,
    undefined,
    "Failed to load provider bindings",
  );
  return response.bindings;
}

export function updateBinding(bindingKey: string, payload: UpdateBindingPayload) {
  return requestJson<{ binding: ModelBindingRecord }>(
    `${getBackendBaseURL()}/api/model-admin/bindings/${bindingKey}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Failed to update provider binding",
  );
}
