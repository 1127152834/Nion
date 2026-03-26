import assert from "node:assert/strict";
import test from "node:test";

import { formatTimeAgo } from "./datetime.ts";

void test("formatTimeAgo returns an empty string for invalid timestamps", () => {
  assert.equal(formatTimeAgo("", "en-US"), "");
  assert.equal(formatTimeAgo("not-a-date", "en-US"), "");
});

void test("formatTimeAgo still formats valid timestamps", () => {
  assert.notEqual(formatTimeAgo("2026-03-25T00:00:00Z", "en-US"), "");
});
