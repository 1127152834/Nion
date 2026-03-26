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
