import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge queue page renders candidate state and approval affordance", async () => {
  const source = await readFile(
    new URL("./knowledge-queue-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /queue/i);
  assert.match(source, /Queue|Activity|activity/i);
  assert.match(source, /useKnowledgeQueue/);
  assert.match(source, /useApproveKnowledgeQueue/);
  assert.match(source, /approve|批准/);
  assert.match(source, /queue activity|activity feed|running/i);
  assert.match(source, /last_compiled_at|compile_error/);
  assert.match(source, /stale|queued|compiled/);
  assert.match(source, /activity/i);
  assert.match(source, /stage|running|failed/);
  assert.match(source, /approve\.isPending/);
  assert.match(source, /activeJob/);
  assert.match(source, /stage=\{activeJob\.stage\}/);
  assert.match(source, /polling|refreshing/i);
});

void test("knowledge queue hooks enable polling while approval or compile work is active", async () => {
  const source = await readFile(new URL("../../../core/knowledge/hooks.ts", import.meta.url), "utf8");

  assert.match(source, /KNOWLEDGE_PROGRESS_REFETCH_INTERVAL_MS\s*=\s*1[0-5]00/);
  assert.match(source, /refetchInterval:\s*\(query\)\s*=>/);
  assert.match(source, /hasActiveKnowledgeJob/);
  assert.match(source, /useIsMutating/);
  assert.match(source, /mutationKey:\s*\["knowledge",\s*"approve"\]/);
});
