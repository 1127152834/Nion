import { getBackendBaseURL } from "@/core/config";

import type { ChildRunRecord } from "./types";

export async function listChildRuns(threadId: string): Promise<ChildRunRecord[]> {
  const res = await fetch(`${getBackendBaseURL()}/api/threads/${threadId}/child-runs`);
  if (!res.ok) throw new Error(`Failed to load child runs: ${res.statusText}`);
  const data = (await res.json()) as { items: ChildRunRecord[] };
  return data.items;
}

export async function getChildRun(
  threadId: string,
  childRunId: string,
): Promise<ChildRunRecord> {
  const res = await fetch(`${getBackendBaseURL()}/api/threads/${threadId}/child-runs/${childRunId}`);
  if (!res.ok) throw new Error(`Failed to load child run: ${res.statusText}`);
  return res.json() as Promise<ChildRunRecord>;
}
