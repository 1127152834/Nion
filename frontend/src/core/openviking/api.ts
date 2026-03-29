import { getBackendBaseURL } from "../config/index.ts";

import type {
  OpenVikingNotebookReindexResponse,
  OpenVikingNotebookSearchResponse,
} from "./types.ts";

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function reindexNotebookResources(): Promise<OpenVikingNotebookReindexResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/openviking/notebook/reindex`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to reindex notebook resources (${response.status})`);
  }
  return readJson<OpenVikingNotebookReindexResponse>(response);
}

export async function searchNotebookResources(
  query: string,
  limit = 5,
): Promise<OpenVikingNotebookSearchResponse> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
  });
  const response = await fetch(`${getBackendBaseURL()}/api/openviking/notebook/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to search notebook resources (${response.status})`);
  }
  return readJson<OpenVikingNotebookSearchResponse>(response);
}
