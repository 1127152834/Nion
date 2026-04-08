import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryEvidenceItem,
  MemoryEvidencePaging,
  MemoryEvidenceQuery,
  MemoryEvidenceResponse,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemoryEvidenceItem(value: unknown): value is MemoryEvidenceItem {
  return (
    isObjectRecord(value) &&
    typeof value.evidence_id === "string" &&
    (typeof value.thread_id === "string" || value.thread_id === null) &&
    (typeof value.turn_id === "string" || value.turn_id === null) &&
    typeof value.source_type === "string" &&
    typeof value.actor === "string" &&
    typeof value.durability_scope === "string" &&
    typeof value.created_at === "string" &&
    (typeof value.artifact_uri === "string" || value.artifact_uri === null) &&
    typeof value.content_preview === "string"
  );
}

function isMemoryEvidencePaging(value: unknown): value is MemoryEvidencePaging {
  return (
    isObjectRecord(value) &&
    typeof value.limit === "number" &&
    typeof value.offset === "number" &&
    typeof value.total === "number"
  );
}

function isMemoryEvidenceResponse(value: unknown): value is MemoryEvidenceResponse {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isMemoryEvidenceItem) &&
    isMemoryEvidencePaging(value.paging)
  );
}

function buildMemoryEvidenceSearch(query: MemoryEvidenceQuery) {
  const search = new URLSearchParams();

  if (query.thread_id) {
    search.set("thread_id", query.thread_id);
  }
  if (query.source_type) {
    search.set("source_type", query.source_type);
  }
  if (typeof query.limit === "number") {
    search.set("limit", String(query.limit));
  }
  if (typeof query.offset === "number") {
    search.set("offset", String(query.offset));
  }

  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export async function loadMemoryEvidence(
  query: MemoryEvidenceQuery = {},
): Promise<MemoryEvidenceResponse> {
  const response = await fetch(
    `${getBackendBaseURL()}/api/memory/evidence${buildMemoryEvidenceSearch(query)}`,
  );
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load memory evidence (${response.status})`);
  }

  if (!isMemoryEvidenceResponse(payload)) {
    throw new Error("Invalid memory evidence payload returned from loadMemoryEvidence");
  }

  return payload;
}
