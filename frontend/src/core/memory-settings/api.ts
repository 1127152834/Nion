import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemorySettingsActionResult,
  MemorySettingsPatchRequest,
  MemorySettingsResponse,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemorySettingsResponse(value: unknown): value is MemorySettingsResponse {
  return (
    isObjectRecord(value) &&
    isObjectRecord(value.provider_mode) &&
    typeof value.provider_mode.id === "string" &&
    typeof value.provider_mode.label === "string" &&
    typeof value.provider_mode.description === "string" &&
    isObjectRecord(value.download_status) &&
    typeof value.download_status.state === "string" &&
    typeof value.download_status.detail === "string" &&
    isObjectRecord(value.download_status.progress) &&
    typeof value.download_status.progress.percent === "number" &&
    typeof value.download_status.progress.downloaded_bytes === "number" &&
    typeof value.download_status.progress.total_bytes === "number" &&
    isObjectRecord(value.active_fingerprint) &&
    typeof value.active_fingerprint.provider_key === "string" &&
    typeof value.active_fingerprint.model_key === "string" &&
    typeof value.active_fingerprint.fingerprint === "string" &&
    typeof value.active_fingerprint.dimensions === "number" &&
    typeof value.active_fingerprint.distance_metric === "string" &&
    (typeof value.active_fingerprint.revision === "string" ||
      value.active_fingerprint.revision === null) &&
    isObjectRecord(value.index_health) &&
    typeof value.index_health.state === "string" &&
    typeof value.index_health.detail === "string" &&
    typeof value.index_health.record_count === "number" &&
    (typeof value.index_health.last_rebuild_at === "string" ||
      value.index_health.last_rebuild_at === null) &&
    isObjectRecord(value.local_config) &&
    typeof value.local_config.model_id === "string" &&
    typeof value.local_config.model_key === "string" &&
    isObjectRecord(value.remote_config) &&
    typeof value.remote_config.endpoint === "string" &&
    typeof value.remote_config.api_key_configured === "boolean" &&
    typeof value.remote_config.model_name === "string" &&
    typeof value.remote_config.dimensions === "number"
  );
}

function isMemorySettingsActionResult(value: unknown): value is MemorySettingsActionResult {
  return (
    isObjectRecord(value) &&
    (value.action === "download" || value.action === "rebuild")
  );
}

export async function loadMemorySettings(): Promise<MemorySettingsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/settings`);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load memory settings (${response.status})`);
  }

  if (!isMemorySettingsResponse(payload)) {
    throw new Error("Invalid memory settings payload returned from loadMemorySettings");
  }

  return payload;
}

export async function patchMemorySettings(
  request: MemorySettingsPatchRequest,
): Promise<MemorySettingsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/settings`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to update memory settings (${response.status})`);
  }
  if (!isMemorySettingsResponse(payload)) {
    throw new Error("Invalid memory settings payload returned from patchMemorySettings");
  }
  return payload;
}

export async function downloadMemoryEmbeddingAssets(): Promise<MemorySettingsActionResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/settings/download`, {
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to download memory embedding assets (${response.status})`);
  }
  if (!isMemorySettingsActionResult(payload)) {
    throw new Error("Invalid action payload returned from downloadMemoryEmbeddingAssets");
  }
  return payload;
}

export async function rebuildMemoryVectorIndex(): Promise<MemorySettingsActionResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/settings/rebuild`, {
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to rebuild memory vector index (${response.status})`);
  }
  if (!isMemorySettingsActionResult(payload)) {
    throw new Error("Invalid action payload returned from rebuildMemoryVectorIndex");
  }
  return payload;
}
