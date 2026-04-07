import assert from "node:assert/strict";
import test from "node:test";

import { extractNotebookNoteToMemory } from "./api.ts";

test("extractNotebookNoteToMemory posts bridge action payload with optional instruction", async () => {
  let seenUrl = "";
  let seenBody = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({
        ok: true,
        bridge_action: "bridge:notebook-to-memory",
        note_id: "note_1",
        instruction: "将这篇财务规范提炼成记忆",
        memory: { id: "fact_1", content: "..." },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const payload = await extractNotebookNoteToMemory({
    noteId: "note_1",
    instruction: "将这篇财务规范提炼成记忆",
  });

  assert.match(seenUrl, /\/api\/capabilities\/actions\/execute$/);
  assert.match(seenBody, /bridge:notebook-to-memory/);
  assert.match(seenBody, /note_1/);
  assert.equal(payload.bridge_action, "bridge:notebook-to-memory");
});
