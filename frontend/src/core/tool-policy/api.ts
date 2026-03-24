import { getBackendBaseURL } from "@/core/config";

import type { ToolPolicyResponse } from "./types";

function resolveErrorMessage(rawText: string, fallback: string): string {
  const text = rawText.trim();
  if (!text) {
    return fallback;
  }
  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // keep raw text
  }
  return text;
}

export async function loadToolPolicy() {
  const response = await fetch(`${getBackendBaseURL()}/api/tool-policy`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load tool policy (${response.status})`,
      ),
    );
  }
  return (await response.json()) as ToolPolicyResponse;
}
