import assert from "node:assert/strict";
import test from "node:test";

import { getTaskToolCallIds } from "./tool-calls.ts";

void test("returns only task tool call ids", () => {
  const ids = getTaskToolCallIds([
    { name: "bash", id: "bash-1" },
    { name: "task", id: "task-1" },
    { name: "task", id: "task-2" },
  ]);

  assert.deepEqual(ids, ["task-1", "task-2"]);
});
