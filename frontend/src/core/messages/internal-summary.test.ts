import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  extractContentFromMessage,
  groupMessages,
  hasContent,
  isInternalSummaryMessage,
  stripInternalSelectedCliToolsTag,
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

void test("selected CLI tools tag is hidden from rendered human content", () => {
  const message = {
    type: "human",
    content:
      "看看我们现在 docker 的状态\n\n<selected_cli_tools>\nPrefer using these CLI tools when they are relevant to the task: docker.\n</selected_cli_tools>",
  } as const;

  assert.equal(extractContentFromMessage(message), "看看我们现在 docker 的状态");
  assert.equal(
    stripInternalSelectedCliToolsTag(
      "foo\n<selected_cli_tools>\nPrefer using docker.\n</selected_cli_tools>\nbar",
    ),
    "foo\n\nbar",
  );
});
