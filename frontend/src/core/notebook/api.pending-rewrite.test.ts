import assert from "node:assert/strict";
import test from "node:test";

const { loadNotebookNote } = await import(new URL("./api.ts", import.meta.url).href);

function createJsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

void test("loadNotebookNote returns note-scoped pending rewrite state", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    createJsonResponse({
      note: {
        note_id: "note_1",
        title: "Roadmap",
        relative_path: "projects/roadmap.md",
        absolute_path: "/tmp/notebook/projects/roadmap.md",
        created_at: "2026-03-26T00:00:00Z",
        updated_at: "2026-03-26T00:00:00Z",
        content_hash: "hash",
        body: "rewritten body",
        tags: [],
        is_pinned: false,
      },
      pending_rewrite: {
        note_id: "note_1",
        original_content: "draft body",
        original_content_hash: "hash-0",
        applied_content: "rewritten body",
        selection_start: null,
        selection_end: null,
        updated_at: "2026-03-26T00:01:00Z",
      },
    });

  try {
    const result = await loadNotebookNote("note_1");

    assert.equal(result.note.note_id, "note_1");
    assert.deepEqual(result.pending_rewrite, {
      note_id: "note_1",
      original_content: "draft body",
      original_content_hash: "hash-0",
      applied_content: "rewritten body",
      selection_start: null,
      selection_end: null,
      updated_at: "2026-03-26T00:01:00Z",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
