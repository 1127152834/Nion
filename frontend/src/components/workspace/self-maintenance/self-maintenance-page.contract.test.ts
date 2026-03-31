import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("self-maintenance page owns heartbeat and proposal surfaces", async () => {
  const source = await readFile(
    new URL("./self-maintenance-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Self-Maintenance/);
  assert.match(source, /Heartbeat|heartbeat/);
  assert.match(source, /proposal|memory update proposals|prune proposals/i);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|OpenViking Notebook Resources/);
});
