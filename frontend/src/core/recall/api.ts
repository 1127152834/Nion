import { getBackendBaseURL } from "@/core/config";

import type { RecallSearchResponse } from "./types";

export async function searchRecall(
  q: string,
  limit = 5,
  threadId?: string,
): Promise<RecallSearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (threadId) params.set("thread_id", threadId);

  const response = await fetch(
    `${getBackendBaseURL()}/api/recall/search?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("recall.load_failed");
  }

  return (await response.json()) as RecallSearchResponse;
}
