import { getBackendBaseURL } from "../config/index.ts";

import type { MemoryGrowthResponse } from "./types";

export async function loadMemoryGrowth(): Promise<MemoryGrowthResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/growth`);
  if (!response.ok) {
    throw new Error(`Failed to load memory growth (${response.status})`);
  }
  return (await response.json()) as MemoryGrowthResponse;
}
