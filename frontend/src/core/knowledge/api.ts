import { getBackendBaseURL } from "../config/index.ts";

import type {
  KnowledgeGraphPayload,
  KnowledgePage,
  KnowledgeQueryResult,
  KnowledgeRevisionRequest,
  KnowledgeSourceCandidate,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveErrorMessage(rawText: string, fallback: string): string {
  const text = rawText.trim();
  if (!text) {
    return fallback;
  }
  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
  } catch {
    // keep raw text
  }
  return text;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function isKnowledgeSourceCandidate(value: unknown): value is KnowledgeSourceCandidate {
  return (
    isObjectRecord(value) &&
    typeof value.source_id === "string" &&
    (value.source_kind === "notebook_note" || value.source_kind === "notebook_asset") &&
    isObjectRecord(value.notebook_ref) &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    typeof value.content_hash === "string" &&
    typeof value.status === "string" &&
    typeof value.created_at === "string" &&
    typeof value.updated_at === "string"
  );
}

function isKnowledgePage(value: unknown): value is KnowledgePage {
  return (
    isObjectRecord(value) &&
    typeof value.page_id === "string" &&
    typeof value.page_type === "string" &&
    typeof value.title === "string" &&
    typeof value.relative_path === "string" &&
    typeof value.absolute_path === "string" &&
    typeof value.body === "string" &&
    Array.isArray(value.sources) &&
    Array.isArray(value.compiled_from) &&
    typeof value.last_compiled_at === "string" &&
    typeof value.agent_owned === "boolean" &&
    typeof value.human_editable === "boolean"
  );
}

function isKnowledgeQueryResult(value: unknown): value is KnowledgeQueryResult {
  return (
    isObjectRecord(value) &&
    typeof value.answer_markdown === "string" &&
    Array.isArray(value.page_ids) &&
    value.page_ids.every((item) => typeof item === "string")
  );
}

function isKnowledgeGraphPayload(value: unknown): value is KnowledgeGraphPayload {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

function isKnowledgeRevisionRequest(value: unknown): value is KnowledgeRevisionRequest {
  return (
    isObjectRecord(value) &&
    typeof value.request_id === "string" &&
    typeof value.page_id === "string" &&
    typeof value.request_type === "string" &&
    typeof value.instruction === "string" &&
    Array.isArray(value.optional_source_refs) &&
    typeof value.status === "string" &&
    typeof value.created_at === "string"
  );
}

export async function loadKnowledgeQueue(): Promise<KnowledgeSourceCandidate[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/queue`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge queue (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!Array.isArray(payload) || !payload.every(isKnowledgeSourceCandidate)) {
    throw new Error("Invalid knowledge queue payload returned from loadKnowledgeQueue");
  }
  return payload;
}

export async function loadKnowledgePage(pageId: string): Promise<KnowledgePage> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/pages/${pageId}`);
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to load knowledge page (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgePage(payload)) {
    throw new Error("Invalid knowledge page payload returned from loadKnowledgePage");
  }
  return payload;
}

export async function queryKnowledge(question: string): Promise<KnowledgeQueryResult> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/query?question=${encodeURIComponent(question)}`,
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to query knowledge (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeQueryResult(payload)) {
    throw new Error("Invalid knowledge query payload returned from queryKnowledge");
  }
  return payload;
}

export async function rebuildKnowledgeGraph(): Promise<KnowledgeGraphPayload> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/graph/rebuild`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to rebuild knowledge graph (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeGraphPayload(payload)) {
    throw new Error("Invalid knowledge graph payload returned from rebuildKnowledgeGraph");
  }
  return payload;
}

export async function createKnowledgeRevision(input: {
  page_id: string;
  request_type: string;
  instruction: string;
  optional_source_refs: string[];
}): Promise<KnowledgeRevisionRequest> {
  const response = await fetch(`${getBackendBaseURL()}/api/knowledge/revisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to create knowledge revision (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeRevisionRequest(payload)) {
    throw new Error("Invalid knowledge revision payload returned from createKnowledgeRevision");
  }
  return payload;
}

export async function closeKnowledgeRevision(
  requestId: string,
): Promise<KnowledgeRevisionRequest> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/knowledge/revisions/${requestId}/close`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(
      resolveErrorMessage(
        await response.text(),
        `Failed to close knowledge revision (${response.status})`,
      ),
    );
  }
  const payload = (await readJson<unknown>(response)) as unknown;
  if (!isKnowledgeRevisionRequest(payload)) {
    throw new Error("Invalid knowledge revision payload returned from closeKnowledgeRevision");
  }
  return payload;
}
