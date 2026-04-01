import assert from "node:assert/strict";
import test from "node:test";

import {
  applyObjectCandidate,
  deferObjectCandidate,
  dismissObjectCandidate,
  getObjectCandidate,
  listObjectCandidates,
} from "./api.ts";

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("object candidate APIs hit expected endpoints", async () => {
  const requests: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(`${init?.method ?? "GET"} ${String(input)}`);
    return createJsonResponse({
      items: [],
      next_cursor: null,
      candidate: {},
      provenance: [],
      action_history: [],
      guard_state: { is_applicable: true, reasons: [], checked_at: "2026-04-02T00:00:00Z" },
      source_summary: {},
      target_summary: {},
      applied_target: {},
      applied_at: "2026-04-02T00:00:00Z",
    });
  };

  try {
    await listObjectCandidates();
    await getObjectCandidate("cand_1");
    await applyObjectCandidate("cand_1");
    await dismissObjectCandidate("cand_1", { reason: "no" });
    await deferObjectCandidate("cand_1", {
      deferred_until: "2026-04-03T09:00:00Z",
      reason: "later",
    });

    assert.deepEqual(requests, [
      "GET /api/object-candidates",
      "GET /api/object-candidates/cand_1",
      "POST /api/object-candidates/cand_1/apply",
      "POST /api/object-candidates/cand_1/dismiss",
      "POST /api/object-candidates/cand_1/defer",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
