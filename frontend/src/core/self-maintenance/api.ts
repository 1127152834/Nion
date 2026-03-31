import { getBackendBaseURL } from "../config/index.ts";

import type {
  SelfMaintenanceLogsResponse,
  SelfMaintenanceRunInput,
  SelfMaintenanceRunResponse,
  SelfMaintenanceStatusResponse,
} from "./types.ts";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function runSelfMaintenance(
  input: SelfMaintenanceRunInput,
): Promise<SelfMaintenanceRunResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/self-maintenance/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to run self-maintenance (${response.status})`);
  }
  return readJson<SelfMaintenanceRunResponse>(response);
}

export async function loadSelfMaintenanceStatus(): Promise<SelfMaintenanceStatusResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/self-maintenance/status`);
  if (!response.ok) {
    throw new Error(`Failed to load self-maintenance status (${response.status})`);
  }
  return readJson<SelfMaintenanceStatusResponse>(response);
}

export async function loadSelfMaintenanceLogs(): Promise<SelfMaintenanceLogsResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/self-maintenance/logs`);
  if (!response.ok) {
    throw new Error(`Failed to load self-maintenance logs (${response.status})`);
  }
  return readJson<SelfMaintenanceLogsResponse>(response);
}

export async function clearSelfMaintenanceLogs(): Promise<{ ok: boolean }> {
  const response = await fetch(`${getBackendBaseURL()}/api/self-maintenance/logs`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to clear self-maintenance logs (${response.status})`);
  }
  return readJson<{ ok: boolean }>(response);
}
