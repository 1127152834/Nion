import assert from "node:assert/strict";
import test from "node:test";

import {
  closeKnowledgeRevision,
  createKnowledgeRevision,
  loadKnowledgeQueue,
  queryKnowledge,
  rebuildKnowledgeGraph,
} from "./api.ts";

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

void test("queryKnowledge calls the knowledge query endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        answer_markdown: "## Summary\nRoadmap summary",
        page_ids: ["concept:roadmap"],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await queryKnowledge("roadmap");

  assert.match(seenUrl, /\/api\/knowledge\/query\?question=roadmap$/);
  assert.equal(payload.page_ids[0], "concept:roadmap");
});

void test("rebuildKnowledgeGraph posts to the graph rebuild endpoint", async () => {
  let seenUrl = "";
  let seenMethod = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenMethod = String(init?.method ?? "GET");
    return new Response(
      JSON.stringify({
        nodes: [{ id: "concept:roadmap", label: "Roadmap" }],
        edges: [{ from: "concept:roadmap", to: "entity:alpha-team", edge_type: "EXTRACTED" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await rebuildKnowledgeGraph();

  assert.match(seenUrl, /\/api\/knowledge\/graph\/rebuild$/);
  assert.equal(seenMethod, "POST");
  assert.equal(payload.edges[0]?.edge_type, "EXTRACTED");
});

void test("createKnowledgeRevision posts revision request payload", async () => {
  let seenUrl = "";
  let seenBody = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        request_id: "revision_1",
        page_id: "concept:roadmap",
        request_type: "fix_fact",
        instruction: "Fix owner",
        optional_source_refs: [],
        status: "open",
        created_at: "2026-04-13T00:00:00Z",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await createKnowledgeRevision({
    page_id: "concept:roadmap",
    request_type: "fix_fact",
    instruction: "Fix owner",
    optional_source_refs: [],
  });

  assert.match(seenUrl, /\/api\/knowledge\/revisions$/);
  assert.match(seenBody, /fix_fact/);
  assert.equal(payload.status, "open");
});

void test("closeKnowledgeRevision posts to the revision close endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        request_id: "revision_1",
        page_id: "concept:roadmap",
        request_type: "fix_fact",
        instruction: "Fix owner",
        optional_source_refs: [],
        status: "closed",
        created_at: "2026-04-13T00:00:00Z",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await closeKnowledgeRevision("revision_1");

  assert.match(seenUrl, /\/api\/knowledge\/revisions\/revision_1\/close$/);
  assert.equal(payload.status, "closed");
});
