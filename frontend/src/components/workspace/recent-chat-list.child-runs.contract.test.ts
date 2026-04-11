import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread hooks and recent chat list wire child-run state into the sidebar", async () => {
  const hooksSource = await readFile(
    new URL("../../core/threads/hooks.ts", import.meta.url),
    "utf8",
  );
  const listSource = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(hooksSource, /child_run_created/);
  assert.match(hooksSource, /child_run_completed/);
  assert.match(hooksSource, /reduceChildRunEvent/);
  assert.match(listSource, /childRuns/);
  assert.match(listSource, /ChildRunList/);
});
