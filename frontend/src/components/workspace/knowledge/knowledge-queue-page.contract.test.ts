import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge queue page renders candidate state and approval affordance", async () => {
  const source = await readFile(
    new URL("./knowledge-queue-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /queue/i);
  assert.match(source, /useKnowledgeQueue/);
  assert.match(source, /useApproveKnowledgeQueue/);
  assert.match(source, /approve|批准/);
  assert.match(source, /编译|compile/i);
  assert.match(source, /last_compiled_at|compile_error/);
  assert.match(source, /stale|queued|compiled/);
  assert.match(source, /activity/i);
  assert.match(source, /stage|running|failed/);
});
