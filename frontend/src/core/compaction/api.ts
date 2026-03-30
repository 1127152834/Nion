import { getBackendBaseURL } from "@/core/config";

import type {
  CompactionLogsResponse,
  CompactionResult,
  MemoryUsageResponse,
} from "./types";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function runMemoryCompaction(
  ratio: number,
  decay_days = 0,
): Promise<CompactionResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/compact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ratio, decay_days }),
  });
  if (!response.ok) {
    throw new Error(`Failed to run memory compaction (${response.status})`);
  }
  return readJson<CompactionResult>(response);
}

export async function loadCompactionLogs(): Promise<CompactionLogsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/compact/logs`);
  if (!response.ok) {
    throw new Error(`Failed to load compaction logs (${response.status})`);
  }
  return readJson<CompactionLogsResponse>(response);
}

export async function clearCompactionLogs(): Promise<{ ok: boolean }> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/compact/logs`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear compaction logs (${response.status})`);
  }
  return readJson<{ ok: boolean }>(response);
}

export async function loadMemoryUsage(): Promise<MemoryUsageResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/usage`);
  if (!response.ok) {
    throw new Error(`Failed to load memory usage (${response.status})`);
  }
  return readJson<MemoryUsageResponse>(response);
}
