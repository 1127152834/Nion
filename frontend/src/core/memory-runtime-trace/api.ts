import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryRuntimeTraceEvent,
  MemoryRuntimeTraceQuery,
  MemoryRuntimeTraceResponse,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemoryRuntimeTraceEvent(value: unknown): value is MemoryRuntimeTraceEvent {
  return (
    isObjectRecord(value) &&
    typeof value.event_id === "string" &&
    typeof value.event_type === "string" &&
    (typeof value.memory_id === "string" || value.memory_id === null) &&
    (typeof value.thread_id === "string" || value.thread_id === null) &&
    typeof value.created_at === "string" &&
    isObjectRecord(value.metadata)
  );
}

function isMemoryRuntimeTraceResponse(value: unknown): value is MemoryRuntimeTraceResponse {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isMemoryRuntimeTraceEvent)
  );
}

function buildMemoryRuntimeTraceSearch(query: MemoryRuntimeTraceQuery) {
  const search = new URLSearchParams();

  if (query.thread_id) {
    search.set("thread_id", query.thread_id);
  }
  if (query.event_type) {
    search.set("event_type", query.event_type);
  }
  if (typeof query.limit === "number") {
    search.set("limit", String(query.limit));
  }

  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export async function loadMemoryRuntimeTrace(
  query: MemoryRuntimeTraceQuery = {},
): Promise<MemoryRuntimeTraceResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/runtime-trace${buildMemoryRuntimeTraceSearch(query)}`,
  );
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load memory runtime trace (${response.status})`);
  }

  if (!isMemoryRuntimeTraceResponse(payload)) {
    throw new Error(
      "Invalid memory runtime trace payload returned from loadMemoryRuntimeTrace",
    );
  }

  return payload;
}
