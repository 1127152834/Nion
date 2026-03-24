import { getBackendBaseURL } from "@/core/config";

export interface FilesDirectoryEntry {
  path: string;
  name: string;
  depth: number;
  child_count: number;
  mtime: number | null;
}

export interface FilesFileEntry {
  path: string;
  name: string;
  depth: number;
  size: number;
  mtime: number | null;
}

export interface FilesTreeResponse {
  root: string;
  generated_at: string;
  depth: number;
  truncated: boolean;
  directories: FilesDirectoryEntry[];
  files: FilesFileEntry[];
}

export interface FilesMetaResponse {
  thread_id: string;
  root: string;
  actual_root: string;
  execution_mode: "sandbox" | "host" | string;
  host_workdir: string | null;
  tree_backend?: "host" | "sandbox" | string;
  watch_supported?: boolean;
  generated_at: string;
}

function buildQueryString(opts?: {
  root?: string;
  depth?: number;
  includeHidden?: boolean;
  maxNodes?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.root) {
    params.set("root", opts.root);
  }
  if (typeof opts?.depth === "number") {
    params.set("depth", String(opts.depth));
  }
  if (typeof opts?.includeHidden === "boolean") {
    params.set("include_hidden", String(opts.includeHidden));
  }
  if (typeof opts?.maxNodes === "number") {
    params.set("max_nodes", String(opts.maxNodes));
  }
  return params;
}

export async function loadThreadFilesMeta(
  threadId: string,
  opts?: { root?: string },
): Promise<FilesMetaResponse> {
  const params = buildQueryString(opts);
  const response = await fetch(
    `${getBackendBaseURL()}/api/threads/${threadId}/files/meta${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load files meta (${response.status})`);
  }
  return (await response.json()) as FilesMetaResponse;
}

export async function loadThreadFilesTree(
  threadId: string,
  opts?: {
    root?: string;
    depth?: number;
    includeHidden?: boolean;
    maxNodes?: number;
  },
): Promise<FilesTreeResponse> {
  const params = buildQueryString(opts);
  const response = await fetch(
    `${getBackendBaseURL()}/api/threads/${threadId}/files/tree${
      params.size > 0 ? `?${params.toString()}` : ""
    }`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load files tree (${response.status})`);
  }
  return (await response.json()) as FilesTreeResponse;
}

