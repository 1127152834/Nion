import { getBackendBaseURL } from "@/core/config";

import type { HeartbeatLogsResponse, HeartbeatStatusResponse } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function loadHeartbeatStatus(): Promise<HeartbeatStatusResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/heartbeat/status`);
  if (!response.ok) {
    throw new Error(`Failed to load heartbeat status (${response.status})`);
  }
  return readJson<HeartbeatStatusResponse>(response);
}

export async function loadHeartbeatLogs(): Promise<HeartbeatLogsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/heartbeat/logs`);
  if (!response.ok) {
    throw new Error(`Failed to load heartbeat logs (${response.status})`);
  }
  return readJson<HeartbeatLogsResponse>(response);
}

export async function clearHeartbeatLogs(): Promise<{ ok: boolean }> {
  const response = await fetch(`${getBackendBaseURL()}/api/heartbeat/logs`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear heartbeat logs (${response.status})`);
  }
  return readJson<{ ok: boolean }>(response);
}
