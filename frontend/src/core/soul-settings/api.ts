import { getBackendBaseURL } from "@/core/config";

import type {
  SoulSettingsDraft,
  SoulSettingsMutationResult,
  SoulSettingsResponse,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSoulSettingsResponse(value: unknown): value is SoulSettingsResponse {
  return (
    isObjectRecord(value) &&
    typeof value.core_identity === "string" &&
    typeof value.speech_style === "string" &&
    typeof value.values_and_boundaries === "string" &&
    typeof value.relationship_stance === "string" &&
    typeof value.has_active_overlay === "boolean" &&
    (typeof value.adaptive_overlay_summary === "string" ||
      value.adaptive_overlay_summary === null)
  );
}

export async function loadSoulSettings(): Promise<SoulSettingsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/soul`);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load soul settings (${response.status})`);
  }

  if (!isSoulSettingsResponse(payload)) {
    throw new Error(
      "Invalid soul settings payload returned from loadSoulSettings",
    );
  }

  return payload;
}

export async function applySoulSettings(
  draft: SoulSettingsDraft,
): Promise<SoulSettingsMutationResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/soul/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(draft),
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to apply soul settings (${response.status})`);
  }

  if (!isObjectRecord(payload) || typeof payload.action !== "string") {
    throw new Error(
      "Invalid soul settings mutation payload returned from applySoulSettings",
    );
  }

  return {
    action: payload.action,
    core_identity:
      typeof payload.core_identity === "string"
        ? payload.core_identity
        : undefined,
    speech_style:
      typeof payload.speech_style === "string"
        ? payload.speech_style
        : undefined,
    values_and_boundaries:
      typeof payload.values_and_boundaries === "string"
        ? payload.values_and_boundaries
        : undefined,
    relationship_stance:
      typeof payload.relationship_stance === "string"
        ? payload.relationship_stance
        : undefined,
  };
}
