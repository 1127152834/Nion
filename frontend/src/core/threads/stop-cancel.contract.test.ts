import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread stop aborts the local stream and requests server-side run cancellation", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /abortControllerRef\.current\?\.abort\(\)/);
  assert.match(source, /await apiClient\.cancelRun\(activeThreadId\)/);
});

void test("thread hooks also cancel active runs during cleanup and thread switches", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /return \(\) => \{\s*if \(abortControllerRef\.current && threadIdRef\.current\)/s);
  assert.match(source, /activeThreadIdAtEffectStart/);
  assert.match(source, /apiClient\.cancelRun\(activeThreadIdAtEffectStart\)/);
});

void test("thread send queues the latest follow-up message instead of dropping it while a stream is active", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /type PendingQueuedThreadMessage = \{/);
  assert.match(source, /const \[queuedMessages, setQueuedMessages] = useState<PendingQueuedThreadMessage\[]>\(\[\]\)/);
  assert.match(source, /if \(sendInFlightRef\.current\) \{/);
  assert.match(source, /await applyQueuedMessages\(threadId,\s*\[\.\.\.queuedMessagesRef\.current,\s*queuedMessage\]\)/s);
  assert.match(source, /const nextQueuedMessage = queuedMessagesRef\.current\[0] ?? null;/);
  assert.match(source, /removeQueuedMessage,\s*promoteQueuedMessage,\s*flushNextQueuedMessage/s);
  assert.match(source, /while \(nextQueuedMessage\)/);
});

void test("thread queue persists into thread state and exposes queue controls on the stream object", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /apiClient\.updateState\(threadId,\s*\{\s*values:\s*\{\s*queued_messages:/s);
  assert.match(source, /queuedMessages:\s*queuedMessages\.map\(serializeQueuedMessage\)/);
  assert.match(source, /removeQueuedMessage:\s*\(messageId: string\) => Promise<void>/);
  assert.match(source, /promoteQueuedMessage:\s*\(messageId: string\) => Promise<void>/);
  assert.match(source, /queuedMessagesRef\.current = hydratedQueuedMessages;/);
});

void test("thread queue uploads attachments before enqueue so refreshed queues remain sendable", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /const \{ queuedFiles, filesForSubmit } = await prepareFilesForMessage\(/);
  assert.match(source, /artifactUrl: info\.artifact_url/);
  assert.match(source, /mediaType: sourceFiles\[index]\?\.mediaType/);
  assert.match(source, /message:\s*\{\s*\.\.\.message,\s*text,\s*files: \[\],/s);
});
