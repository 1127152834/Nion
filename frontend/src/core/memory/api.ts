import { getBackendBaseURL } from "../config/index.ts";

import type { MemoryUserFacing } from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemoryUserFacingItem(value: unknown): boolean {
  return (
    isObjectRecord(value) &&
    typeof value.id === "string" &&
    typeof value.content === "string" &&
    typeof value.source_label === "string" &&
    typeof value.updated_at === "string" &&
    typeof value.reason === "string" &&
    Array.isArray(value.related_refs) &&
    value.related_refs.every((item) => typeof item === "string")
  );
}

function isMemoryUserFacing(value: unknown): value is MemoryUserFacing {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.user_profile) &&
    value.user_profile.every(isMemoryUserFacingItem) &&
    Array.isArray(value.long_term_background) &&
    value.long_term_background.every(isMemoryUserFacingItem) &&
    Array.isArray(value.fact_memories) &&
    value.fact_memories.every(isMemoryUserFacingItem)
  );
}

function getErrorMessage(status: number, payload: unknown): string {
  if (isObjectRecord(payload) && typeof payload.detail === "string") {
    return `Memory request failed (${status}): ${payload.detail}`;
  }

  return `Memory request failed (${status})`;
}

async function readMemoryUserFacingResponse(
  response: Response,
  actionLabel: string,
): Promise<MemoryUserFacing> {
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, payload));
  }

  if (!isMemoryUserFacing(payload)) {
    throw new Error(`Invalid memory user-facing payload returned from ${actionLabel}`);
  }

  return payload;
}

export async function loadMemory() {
  const response = await fetch(`${getBackendBaseURL()}/api/memory`);
  return readMemoryUserFacingResponse(response, "loadMemory");
}
