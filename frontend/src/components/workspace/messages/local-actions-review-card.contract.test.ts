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

void test("local-actions review card exposes details and irreversible actions", async () => {
  const source = await readFile(
    new URL("./local-actions-review-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /showDetails/);
  assert.match(source, /View details/);
  assert.match(source, /permissionRequest\.localActionPlan/);
  assert.match(source, /irreversible/);
  assert.match(source, /action_type/);
});

void test("permission request normalization preserves local-actions review metadata", async () => {
  const source = await readFile(
    new URL("../../../core/threads/permission-request.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /approval_kind/);
  assert.match(source, /reviewTitle/);
  assert.match(source, /reviewSummary/);
});

void test("local-actions review no longer depends on tool_name fallback", async () => {
  const source = await readFile(
    new URL("../../../core/threads/permission-request.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /toolName === "local_actions_review"/);
});
