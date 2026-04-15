import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("message list can render a dedicated local-actions review card", async () => {
  const source = await readFile(
    new URL("./message-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /LocalActionsReviewCard/);
});

void test("permission request normalization preserves local-actions review metadata", async () => {
  const source = await readFile(
    new URL("../../../core/threads/permission-request.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /local_actions_review/);
  assert.match(source, /reviewTitle/);
  assert.match(source, /reviewSummary/);
});
