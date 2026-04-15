import { getBackendBaseURL } from "@/core/config";

import type { LocalActionsHistoryResponse } from "./types";

export async function loadLocalActionsHistory(): Promise<LocalActionsHistoryResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/local-actions/history`);
  const payload = (await response.json().catch(() => null)) as
    | LocalActionsHistoryResponse
    | { detail?: string }
    | null;

  if (!response.ok || !payload || !("items" in payload) || !Array.isArray(payload.items)) {
    throw new Error(
      typeof payload === "object" && payload && "detail" in payload && typeof payload.detail === "string"
        ? payload.detail
        : "Failed to load local actions history",
    );
  }

  return payload;
}
