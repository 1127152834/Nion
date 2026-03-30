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
  const { readFile } = await import("node:fs/promises");
  const apiSource = await readFile(new URL("./api.ts", import.meta.url), "utf8");
  const desktopClientSource = await readFile(
    new URL("../api/desktop-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(apiSource, /createThreadClient/);
  assert.match(
    apiSource,
    /client\.createOrResumeNotebookAssistantSession\(\{\s*note_id: input\.noteId,\s*session_id: input\.sessionId,\s*\}\)/s,
  );
  assert.doesNotMatch(apiSource, /getBackendBaseURL/);
  assert.doesNotMatch(apiSource, /fetch\(/);
  assert.match(desktopClientSource, /async createOrResumeNotebookAssistantSession/);
  assert.match(desktopClientSource, /resolveThreadsBaseURL\(false, options\?\.getBaseURL\)/);
  assert.match(desktopClientSource, /requestJSON<Record<string, unknown>>\(/);
  assert.match(desktopClientSource, /\$\{baseUrl\}\/notebook-assistant\/session/);
});

void test("notebook assistant rewrite contract stays note-scoped while session bootstrap remains isolated", async () => {
  const { readFile } = await import("node:fs/promises");
  const typesSource = await readFile(new URL("./types.ts", import.meta.url), "utf8");
  const apiSource = await readFile(new URL("./api.ts", import.meta.url), "utf8");
  const hooksSource = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(typesSource, /noteId: string/);
  assert.doesNotMatch(typesSource, /NotebookAssistantRewriteInput[\s\S]*sessionId: string/);
  assert.match(apiSource, /export function buildNotebookRewriteRequest/);
  assert.doesNotMatch(
    apiSource,
    /buildNotebookRewriteRequest[\s\S]*session_id: input\.sessionId/,
  );
  assert.match(hooksSource, /rewrite: \(noteId: string \| null\)/);
});
