import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("desktop local-actions IPC exposes execute and history entrypoints", async () => {
  const source = await readFile(
    new URL("../src/shared/ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /localActionsExecute/);
  assert.match(source, /localActionsListHistory/);
});

void test("desktop main wires local-actions history IPC to the executor", async () => {
  const source = await readFile(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /localActionsExecutor\.executePlan/);
  assert.match(source, /localActionsExecutor\.listHistory/);
});
