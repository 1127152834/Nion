import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveInlineMentionBackspaceDelete,
  resolveInlineMentionState,
} from "./inline-mentions.ts";

void test("resolveInlineMentionState tracks slash mentions at the caret", () => {
  const value = "请用 /claude-to-nion 分析这个问题";
  const caret = value.indexOf(" 分析");

  const result = resolveInlineMentionState(value, caret);

  assert.deepEqual(result, {
    trigger: "/",
    query: "claude-to-nion",
    start: 3,
    end: caret,
  });
});

void test("resolveInlineMentionBackspaceDelete removes a full skill token after its trailing space", () => {
  const value = "请用 /claude-to-nion 处理这个问题";
  const caret = value.indexOf("处理");

  const result = resolveInlineMentionBackspaceDelete(value, caret);

  assert.deepEqual(result, {
    trigger: "/",
    value: "claude-to-nion",
    nextValue: "请用 处理这个问题",
    nextCaret: 3,
  });
});

void test("resolveInlineMentionBackspaceDelete removes a full resource token at the end", () => {
  const value = "保存到 @AI学习";
  const caret = value.length;

  const result = resolveInlineMentionBackspaceDelete(value, caret);

  assert.deepEqual(result, {
    trigger: "@",
    value: "AI学习",
    nextValue: "保存到 ",
    nextCaret: 4,
  });
});

void test("resolveInlineMentionBackspaceDelete ignores inline punctuation that is not a mention", () => {
  const value = "联系我 someone@example.com";

  assert.equal(resolveInlineMentionBackspaceDelete(value, value.length), null);
});
