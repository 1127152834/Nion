import { getBackendBaseURL } from "@/core/config";

import type { RebuildLogsResponse, RebuildResult } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function runMemoryRebuild(): Promise<RebuildResult> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/rebuild`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to run memory rebuild (${response.status})`);
  }
  return readJson<RebuildResult>(response);
}

export async function loadRebuildLogs(): Promise<RebuildLogsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/rebuild/logs`);
  if (!response.ok) {
    throw new Error(`Failed to load rebuild logs (${response.status})`);
  }
  return readJson<RebuildLogsResponse>(response);
}

export async function clearRebuildLogs(): Promise<{ ok: boolean }> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/rebuild/logs`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear rebuild logs (${response.status})`);
  }
  return readJson<{ ok: boolean }>(response);
}
