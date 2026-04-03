import assert from "node:assert/strict";
import test from "node:test";

import { removeThreadFromSearchCache } from "./cache.ts";
import {
  isPlaceholderThreadTitle,
  resolvePreferredThreadTitle,
} from "./title.ts";
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

void test("resolvePreferredThreadTitle keeps a manual title when the incoming title is Untitled", () => {
  assert.equal(
    resolvePreferredThreadTitle({
      currentTitle: "手动重命名标题",
      incomingTitle: "Untitled",
    }),
    "手动重命名标题",
  );
});

void test("resolvePreferredThreadTitle accepts a generated title over a placeholder", () => {
  assert.equal(
    resolvePreferredThreadTitle({
      currentTitle: "Untitled",
      incomingTitle: "代码总结",
    }),
    "代码总结",
  );
});

void test("isPlaceholderThreadTitle treats blanks and Untitled as placeholders", () => {
  assert.equal(isPlaceholderThreadTitle(""), true);
  assert.equal(isPlaceholderThreadTitle("   "), true);
  assert.equal(isPlaceholderThreadTitle("Untitled"), true);
  assert.equal(isPlaceholderThreadTitle("手动重命名标题"), false);
});
