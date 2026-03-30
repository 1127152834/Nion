import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryProviderFamiliesResponse,
  MemoryProviderState,
} from "./types.ts";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function listMemoryProviderFamilies(): Promise<MemoryProviderFamiliesResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory-os/providers/families`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to load memory provider families (${response.status})`,
    );
  }
  return readJson<MemoryProviderFamiliesResponse>(response);
}

export async function getMemoryProviderState(): Promise<MemoryProviderState> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory-os/providers/state`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load memory provider state (${response.status})`);
  }
  return readJson<MemoryProviderState>(response);
}
