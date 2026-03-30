import assert from "node:assert/strict";
import test from "node:test";

import { mergePendingRewriteWithInitial } from "./pending-rewrite.util.ts";
import type { NotebookPendingRewrite } from "./types.ts";

const baseRewrite: NotebookPendingRewrite = {
  note_id: "note-1",
  original_content: "draft",
  original_content_hash: "hash-0",
  applied_content: "final",
  selection_start: null,
  selection_end: null,
  updated_at: "2026-03-26T00:01:00Z",
};

void test("mergePendingRewriteWithInitial respects initial rewrites when updated", () => {
  const current: NotebookPendingRewrite = {
    ...baseRewrite,
    applied_content: "stale",
  };

  const result = mergePendingRewriteWithInitial(baseRewrite, current);

  assert.strictEqual(result, baseRewrite);
});

void test("mergePendingRewriteWithInitial retains current when references match", () => {
  const result = mergePendingRewriteWithInitial(baseRewrite, baseRewrite);

  assert.strictEqual(result, baseRewrite);
});

void test("mergePendingRewriteWithInitial clears stale rewrite when initial null", () => {
  const result = mergePendingRewriteWithInitial(null, baseRewrite);

  assert.strictEqual(result, null);
});

void test("mergePendingRewriteWithInitial returns null when both null", () => {
  assert.strictEqual(mergePendingRewriteWithInitial(null, null), null);
});
