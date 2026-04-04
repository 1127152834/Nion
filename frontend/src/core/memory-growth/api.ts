import { getBackendBaseURL } from "../config/index.ts";

import type { MemoryGrowthResponse, MemoryGrowthItem, UserModelItemsResponse } from "./types";

export async function loadMemoryGrowth(): Promise<MemoryGrowthResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/growth`);
  if (!response.ok) {
    throw new Error(`Failed to load memory growth (${response.status})`);
  }
  return (await response.json()) as MemoryGrowthResponse;
}

export async function freezeMemoryGrowthItem(memoryId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/growth/${encodeURIComponent(memoryId)}/freeze`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to freeze memory growth item (${response.status})`);
  }
  return (await response.json()) as { memory_id: string; action: string };
}

export async function rejectMemoryGrowthItem(memoryId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/growth/${encodeURIComponent(memoryId)}/reject`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to reject memory growth item (${response.status})`);
  }
  return (await response.json()) as { memory_id: string; action: string };
}

export async function freezeUserModelItem(memoryId: string) {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/growth/user-model/${encodeURIComponent(memoryId)}/freeze`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to freeze user model item (${response.status})`);
  }
  return (await response.json()) as { memory_id: string; action: string };
}

export async function loadUserModelItems(): Promise<MemoryGrowthItem[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/growth/user-model`);
  if (!response.ok) {
    throw new Error(`Failed to load user model items (${response.status})`);
  }
  const json = (await response.json()) as UserModelItemsResponse;
  return json.items;
}
