import assert from "node:assert/strict";
import test from "node:test";

import { buildQuickCaptureDraft } from "./notebook-compose.ts";

void test("buildQuickCaptureDraft uses the first non-empty line as title and defaults to inbox", () => {
  const draft = buildQuickCaptureDraft("Idea title\n\nSecond line");

  assert.equal(draft.title, "Idea title");
  assert.equal(draft.directory, "inbox");
  assert.match(draft.body, /Second line/);
});
