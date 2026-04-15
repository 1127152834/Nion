import { getBackendBaseURL } from "../config/index.ts";

import type { MemorySettingsResponse } from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemorySettingsResponse(value: unknown): value is MemorySettingsResponse {
  return (
    isObjectRecord(value) &&
    isObjectRecord(value.retrieval_status) &&
    typeof value.retrieval_status.vector_enabled === "boolean" &&
    typeof value.retrieval_status.reranker_enabled === "boolean" &&
    typeof value.retrieval_status.detail === "string" &&
    isObjectRecord(value.index_health) &&
    typeof value.index_health.state === "string" &&
    typeof value.index_health.detail === "string" &&
    typeof value.index_health.record_count === "number" &&
    (typeof value.index_health.last_rebuild_at === "string" ||
      value.index_health.last_rebuild_at === null) &&
    isObjectRecord(value.jump_target) &&
    typeof value.jump_target.section === "string"
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
