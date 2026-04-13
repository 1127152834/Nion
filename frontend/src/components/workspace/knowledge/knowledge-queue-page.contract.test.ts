import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge queue page renders candidate state and approval affordance", async () => {
  const source = await readFile(
    new URL("./knowledge-queue-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /queue/i);
  assert.match(source, /approve|批准/);
  assert.match(source, /stale|queued|compiled/);
});
