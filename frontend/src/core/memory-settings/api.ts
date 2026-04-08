import { getBackendBaseURL } from "../config/index.ts";

import type { MemorySettingsResponse } from "./types";

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
    typeof value.index_health.vector_path === "string" &&
    typeof value.index_health.artifact_count === "number"
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
