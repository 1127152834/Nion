import { getBackendBaseURL } from "../config/index.ts";

import type { AutoDreamRunInput, AutoDreamRunResponse } from "./types.ts";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function runAutoDream(
  input: AutoDreamRunInput,
): Promise<AutoDreamRunResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/autodream/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`Failed to run AutoDream (${response.status})`);
  }
  return readJson<AutoDreamRunResponse>(response);
}
