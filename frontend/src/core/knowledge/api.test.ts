import assert from "node:assert/strict";
import test from "node:test";

import { loadKnowledgeQueue } from "./api.ts";

void test("loadKnowledgeQueue calls the knowledge queue endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify([
        {
          source_id: "source:notebook_note:note_1",
          source_kind: "notebook_note",
          notebook_ref: {
            note_id: "note_1",
            relative_path: "收件箱/roadmap.md",
          },
          title: "Roadmap",
          summary: "body",
          content_hash: "abc123",
          status: "queued",
          created_at: "2026-04-13T00:00:00Z",
          updated_at: "2026-04-13T00:00:00Z",
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await loadKnowledgeQueue();

  assert.match(seenUrl, /\/api\/knowledge\/queue$/);
  assert.equal(payload[0]?.source_kind, "notebook_note");
});
