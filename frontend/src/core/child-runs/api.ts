import { getBackendBaseURL } from "../config";

import type { ChildRunRecord } from "./types";

function isChildRunRecord(value: unknown): value is ChildRunRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "child_run_id" in value &&
    typeof value.child_run_id === "string" &&
    "agent_name" in value &&
    typeof value.agent_name === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    "description" in value &&
    typeof value.description === "string"
  );
}

function isChildRunListResponse(
  value: unknown,
): value is { items: ChildRunRecord[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every(isChildRunRecord)
  );
}

export async function loadChildRuns(threadId: string): Promise<ChildRunRecord[]> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/threads/${threadId}/child-runs`,
  );
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load child runs (${response.status})`);
  }
  if (!isChildRunListResponse(payload)) {
    throw new Error("Invalid child run list payload");
  }
  return payload.items;
}

export async function loadChildRun(
  threadId: string,
  childRunId: string,
): Promise<ChildRunRecord> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/threads/${threadId}/child-runs/${childRunId}`,
  );
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load child run (${response.status})`);
  }
  if (!isChildRunRecord(payload)) {
    throw new Error("Invalid child run payload");
  }
  return payload;
}
