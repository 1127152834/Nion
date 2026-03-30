import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("recent chat list derives pending clarification badges and prioritizes them", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /derivePendingClarification/);
  assert.match(source, /data-pending-reply-label/);
  assert.match(source, /t\.sidebar\.pendingReply/);
  assert.match(source, /const pending = enriched\.filter/);
  assert.match(source, /return \[\.\.\.pending, \.\.\.regular\]/);
});

void test("recent chat list marks bridge conversations with a platform badge", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /bridgeInfoOfThread/);
  assert.match(source, /bridge\.bridgeChatBadge/);
  assert.match(source, /bridgeLabel/);
});

void test("recent chat list exposes a lightweight multi-select delete mode", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /selectionMode/);
  assert.match(source, /selectedThreadIds/);
  assert.match(source, /toggleThreadSelection/);
  assert.match(source, /handleDeleteSelected/);
  assert.match(source, /t\.common\.select/);
  assert.match(source, /t\.common\.cancel/);
  assert.match(source, /t\.common\.delete/);
});

void test("recent chat list resolves the next thread after batch delete when the active thread is removed", async () => {
  const source = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolveNextThreadId/);
  assert.match(source, /router\.push\(pathOfThread\(nextThreadId\)\)/);
});
