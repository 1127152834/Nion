import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  extractContentFromMessage,
  groupMessages,
  hasContent,
  isInternalSummaryMessage,
} from "./utils.ts";

void test("recognizes internal summarization messages", () => {
  const message = {
    type: "human",
    content:
      "Here is a summary of the conversation to date:\n\n- User greeted the assistant.",
  } as const;

  assert.equal(isInternalSummaryMessage(message), true);
});

void test("summary messages are hidden from content helpers", () => {
  const message = {
    type: "human",
    content:
      "Here is a summary of the conversation to date:\n\n- User greeted the assistant.",
  } as const;

  assert.equal(extractContentFromMessage(message), "");
  assert.equal(hasContent(message), false);
});

void test("groupMessages skips internal summary messages", () => {
  const groups = groupMessages(
    [
      {
        type: "human",
        id: "summary-1",
        content:
          "Here is a summary of the conversation to date:\n\n- User greeted the assistant.",
      },
      {
        type: "human",
        id: "human-1",
        content: "1",
      },
    ],
    (group) => ({ type: group.type, count: group.messages.length }),
  );

  assert.deepEqual(groups, [{ type: "human", count: 1 }]);
});

void test("thread text helper also ignores internal summary messages", async () => {
  const source = await readFile(new URL("../threads/utils.ts", import.meta.url), "utf8");

  assert.match(source, /isInternalSummaryMessage/);
  assert.match(source, /return null/);
});
