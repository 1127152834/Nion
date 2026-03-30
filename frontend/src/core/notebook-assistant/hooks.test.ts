import assert from "node:assert/strict";
import test from "node:test";

import { notebookAssistantQueryKeys } from "./hooks.ts";

void test("notebook assistant query key includes note_id and session_id", () => {
  assert.deepEqual(
    notebookAssistantQueryKeys.session("note-1", "session-1"),
    ["notebook-assistant", "session", "note-1", "session-1"],
  );
});

void test("notebook assistant API uses the dedicated session bootstrap route", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      init,
    });
    return new Response(
      JSON.stringify({
        thread_id: "thread-1",
        created: true,
        values: {
          scope: "notebook_assistant",
          note_id: "note-1",
          notebook_session_id: "session-1",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }) as typeof fetch;

  try {
    const { createOrResumeNotebookAssistantSession } = await import("./api.ts");

    const result = await createOrResumeNotebookAssistantSession({
      noteId: "note-1",
      sessionId: "session-1",
    });

    assert.equal(requests.length, 1);
    assert.match(requests[0]!.url, /\/api\/threads\/notebook-assistant\/session$/);
    assert.equal(requests[0]!.init?.method, "POST");
    assert.equal(
      requests[0]!.init?.body,
      JSON.stringify({ note_id: "note-1", session_id: "session-1" }),
    );
    assert.equal(result.values.note_id, "note-1");
    assert.equal(result.values.notebook_session_id, "session-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
