import assert from "node:assert/strict";
import test from "node:test";

import { removeThreadFromSearchCache } from "./cache.ts";
import type { AgentThread } from "./types.ts";

void test("removeThreadFromSearchCache tolerates undefined cache", () => {
  assert.equal(removeThreadFromSearchCache(undefined, "t-1"), undefined);
});

void test("removeThreadFromSearchCache removes the matching thread id", () => {
  const data: AgentThread[] = [
    {
      thread_id: "t-1",
      values: { title: "One", messages: [], artifacts: [] },
    },
    {
      thread_id: "t-2",
      values: { title: "Two", messages: [], artifacts: [] },
    },
  ];

  assert.deepEqual(removeThreadFromSearchCache(data, "t-1"), [data[1]]);
});
