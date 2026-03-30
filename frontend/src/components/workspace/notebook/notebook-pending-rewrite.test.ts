import assert from "node:assert/strict";
import test from "node:test";

import type { NotebookPendingRewrite } from "../../../core/notebook/types.ts";

import {
  applyNotebookPendingRewrite,
  cancelNotebookPendingRewrite,
  confirmNotebookPendingRewrite,
} from "./notebook-pending-rewrite.ts";

void test("applyNotebookPendingRewrite overwrites an existing pending rewrite from the original snapshot", () => {
  const first = applyNotebookPendingRewrite({
    currentBody: "line one\nline two",
    nextContent: "first rewrite",
    selectionStart: 0,
    selectionEnd: 8,
  });

  const overwritten = applyNotebookPendingRewrite({
    currentBody: "line one\nline two",
    nextContent: "second rewrite",
    selectionStart: 9,
    selectionEnd: 17,
    existingPendingRewrite: first,
  });

  assert.deepEqual(overwritten, {
    original_content: "line one\nline two",
    applied_content: "line one\nsecond rewrite",
    selection_start: 9,
    selection_end: 17,
  } satisfies NotebookPendingRewrite);
});

void test("cancelNotebookPendingRewrite restores the original snapshot", () => {
  const pendingRewrite: NotebookPendingRewrite = {
    original_content: "draft body",
    applied_content: "clean body",
    selection_start: null,
    selection_end: null,
  };

  assert.equal(cancelNotebookPendingRewrite(pendingRewrite), "draft body");
});

void test("confirmNotebookPendingRewrite returns the applied content", () => {
  const pendingRewrite: NotebookPendingRewrite = {
    original_content: "draft body",
    applied_content: "clean body",
    selection_start: null,
    selection_end: null,
  };

  assert.equal(confirmNotebookPendingRewrite(pendingRewrite), "clean body");
});
