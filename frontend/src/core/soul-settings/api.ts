import { getBackendBaseURL } from "@/core/config";

import type {
  SoulSettingsPatchRequest,
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

export async function patchSoulSetting(
  request: SoulSettingsPatchRequest,
): Promise<SoulSettingsMutationResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/soul`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to update soul settings (${response.status})`);
  }

  if (
    !isObjectRecord(payload) ||
    typeof payload.action !== "string" ||
    typeof payload.field !== "string" ||
    typeof payload.value !== "string"
  ) {
    throw new Error(
      "Invalid soul settings mutation payload returned from patchSoulSetting",
    );
  }

  return {
    action: payload.action,
    field: payload.field as SoulSettingsMutationResult["field"],
    value: payload.value,
  };
}
