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

  assert.match(source, /type PendingQueuedMessage = \{/);
  assert.match(source, /pendingQueuedMessageRef/);
  assert.match(source, /if \(sendInFlightRef\.current\) \{/);
  assert.match(source, /pendingQueuedMessageRef\.current = \{/);
  assert.match(source, /await stop\(\)/);
  assert.match(source, /const pending = pendingQueuedMessageRef\.current;/);
  assert.match(source, /void sendMessage\(\s*pending\.threadId,\s*pending\.message,\s*pending\.extraContext,/s);
});
