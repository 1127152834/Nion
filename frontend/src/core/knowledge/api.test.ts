import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKnowledgeRevision,
  approveKnowledgeQueue,
  closeKnowledgeRevision,
  createKnowledgeRevision,
  loadKnowledgeJobs,
  loadKnowledgeLint,
  loadKnowledgeQueue,
  queryKnowledge,
  rebuildKnowledgeGraph,
  saveKnowledgeSynthesis,
  previewKnowledgeRevision,
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

void test("approveKnowledgeQueue posts source ids to the queue approval endpoint", async () => {
  let seenBody = "";

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    seenBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        job_id: "job_1",
        source_ids: ["source:notebook_note:note_1"],
        trigger_mode: "queue_approval",
        stage: "queued",
        status: "pending",
        created_page_ids: [],
        outputs: {
          created_pages: [],
          created_page_ids: [],
          updated_pages: [],
          stale_pages: [],
          archived_pages: [],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await approveKnowledgeQueue(["source:notebook_note:note_1"]);

  assert.match(seenBody, /source:notebook_note:note_1/);
  assert.equal(payload.status, "pending");
});

void test("loadKnowledgeJobs calls the jobs endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        jobs: [
          {
            job_id: "job_1",
            source_ids: ["source:notebook_note:note_1"],
            trigger_mode: "queue_approval",
            stage: "finalizing",
            status: "succeeded",
            created_page_ids: ["sources:note_1"],
            outputs: {
              created_pages: ["wiki/sources/note_1.md"],
              created_page_ids: ["sources:note_1"],
              updated_pages: [],
              stale_pages: [],
              archived_pages: [],
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await loadKnowledgeJobs();

  assert.match(seenUrl, /\/api\/knowledge\/jobs$/);
  assert.equal(payload.jobs[0]?.job_id, "job_1");
});

void test("enqueueKnowledgeSource posts to the enqueue endpoint", async () => {
  let seenUrl = "";
  let seenBody = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        has_knowledge: true,
        tag_label: "知识库",
        status: "queued",
        enqueue_state: "enqueued",
        compile_state: "idle",
        created_page_ids: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const mod = await import("./api.ts");
  const payload = await mod.enqueueKnowledgeSource("source:notebook_note:note_1");

  assert.match(seenUrl, /\/api\/knowledge\/sources\/enqueue$/);
  assert.match(seenBody, /source:notebook_note:note_1/);
  assert.equal(payload.enqueue_state, "enqueued");
});

void test("loadNotebookKnowledgeStatus reads status-by-source", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        has_knowledge: true,
        tag_label: "知识库",
        status: "running",
        enqueue_state: "enqueued",
        compile_state: "running",
        created_page_ids: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const mod = await import("./api.ts");
  const payload = await mod.loadKnowledgeSourceStatus("source:notebook_note:note_1");

  assert.match(
    seenUrl,
    /\/api\/knowledge\/sources\/source%3Anotebook_note%3Anote_1\/status$/,
  );
  assert.equal(payload.compile_state, "running");
});

void test("loadNotebookKnowledgeStatus rejects invalid status payload", async () => {
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        has_knowledge: true,
        tag_label: "知识库",
        status: "bogus",
        enqueue_state: "enqueued",
        compile_state: "idle",
        created_page_ids: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const mod = await import("./api.ts");

  await assert.rejects(
    () => mod.loadKnowledgeSourceStatus("source:notebook_note:note_1"),
    /Invalid knowledge status payload returned from loadKnowledgeSourceStatus/,
  );
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

void test("previewKnowledgeRevision posts to the revision preview endpoint", async () => {
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
        status: "previewed",
        created_at: "2026-04-13T00:00:00Z",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await previewKnowledgeRevision("revision_1");

  assert.match(seenUrl, /\/api\/knowledge\/revisions\/revision_1\/preview$/);
  assert.equal(payload.status, "previewed");
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

void test("applyKnowledgeRevision posts to the revision apply endpoint", async () => {
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
        status: "applied",
        created_at: "2026-04-13T00:00:00Z",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await applyKnowledgeRevision("revision_1");

  assert.match(seenUrl, /\/api\/knowledge\/revisions\/revision_1\/apply$/);
  assert.equal(payload.status, "applied");
});

void test("saveKnowledgeSynthesis posts to the syntheses endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        page_id: "synthesis:roadmap",
        page_type: "synthesis",
        title: "What does the roadmap say?",
        relative_path: "wiki/syntheses/synthesis__roadmap.md",
        absolute_path: "/tmp/wiki/syntheses/synthesis__roadmap.md",
        body: "## Summary\nRoadmap summary",
        sources: [],
        compiled_from: [],
        last_compiled_at: "2026-04-13T00:00:00Z",
        agent_owned: true,
        human_editable: false,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await saveKnowledgeSynthesis({
    question: "What does the roadmap say?",
    answer_markdown: "## Summary\nRoadmap summary",
  });

  assert.match(seenUrl, /\/api\/knowledge\/syntheses$/);
  assert.equal(payload.page_type, "synthesis");
});

void test("loadKnowledgeLint calls the lint endpoint", async () => {
  let seenUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seenUrl = String(input);
    return new Response(
      JSON.stringify({
        orphan_pages: [],
        broken_links: [],
        stale_pages: [],
        contradictions: [],
        data_gaps: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await loadKnowledgeLint();

  assert.match(seenUrl, /\/api\/knowledge\/lint$/);
  assert.ok(Array.isArray(payload.broken_links));
});
