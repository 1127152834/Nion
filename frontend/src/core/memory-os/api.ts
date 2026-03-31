import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryProviderFamiliesResponse,
  MemoryProviderState,
} from "./types.ts";

function getMemoryOSBaseURL() {
  return `${getBackendBaseURL()}/api/memory-os`;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function fetchMemoryOSJson<T>(
  path: string,
  errorMessage: string,
): Promise<T> {
  const response = await fetch(`${getMemoryOSBaseURL()}${path}`);
  if (!response.ok) {
    throw new Error(`${errorMessage} (${response.status})`);
  }
  return readJson<T>(response);
}

export async function listMemoryProviderFamilies(): Promise<MemoryProviderFamiliesResponse> {
  return fetchMemoryOSJson<MemoryProviderFamiliesResponse>(
    "/providers/families",
    "Failed to load memory provider families",
  );
}

export async function getMemoryProviderState(): Promise<MemoryProviderState> {
  return fetchMemoryOSJson<MemoryProviderState>(
    "/providers/state",
    "Failed to load memory provider state",
  );
}
