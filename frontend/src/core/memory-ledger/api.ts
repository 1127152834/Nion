import { getBackendBaseURL } from "../config/index.ts";

import type {
  MemoryLedgerNode,
  MemoryLedgerResponse,
  MemoryLedgerRevision,
} from "./types";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMemoryLedgerNode(value: unknown): value is MemoryLedgerNode {
  return (
    isObjectRecord(value) &&
    typeof value.memory_id === "string" &&
    typeof value.canonical_key === "string" &&
    typeof value.summary === "string" &&
    typeof value.status === "string" &&
    typeof value.updated_at === "string"
  );
}

function isMemoryLedgerRevision(value: unknown): value is MemoryLedgerRevision {
  return (
    isObjectRecord(value) &&
    typeof value.memory_id === "string" &&
    typeof value.revision_id === "string" &&
    typeof value.revision_number === "number" &&
    typeof value.summary === "string" &&
    (typeof value.evidence_ref === "string" || value.evidence_ref === null) &&
    typeof value.created_at === "string"
  );
}

function isMemoryLedgerResponse(value: unknown): value is MemoryLedgerResponse {
  return (
    isObjectRecord(value) &&
    Array.isArray(value.nodes) &&
    value.nodes.every(isMemoryLedgerNode) &&
    Array.isArray(value.current_revisions) &&
    value.current_revisions.every(isMemoryLedgerRevision)
  );
}

export async function loadMemoryLedger(): Promise<MemoryLedgerResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory/ledger`);
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(`Failed to load memory ledger (${response.status})`);
  }

  if (!isMemoryLedgerResponse(payload)) {
    throw new Error("Invalid memory ledger payload returned from loadMemoryLedger");
  }

  return payload;
}
