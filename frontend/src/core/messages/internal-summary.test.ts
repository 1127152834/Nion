import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  extractContentFromMessage,
  extractInternalSummaryContent,
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

void test("recognizes structured conversation compression summaries", () => {
  const message = {
    type: "human",
    content: `Conversation Summary

## Goal
User wants the thread summary to be hidden behind a small UI tag.

## Confirmed decisions
- Keep the actual summary in the background context.
- Only show a lightweight compressed marker in the chat history.

## Constraints
- Do not expand the summary body in the message list.`,
  } as const;

  assert.equal(isInternalSummaryMessage(message), true);
});

void test("recognizes structured internal summary messages from additional_kwargs metadata", () => {
  const message = {
    type: "human",
    content: "压缩后的上下文正文",
    additional_kwargs: {
      internal_summary: true,
      summary_locale: "zh-CN",
      summary_format_version: 1,
    },
  } as const;

  assert.equal(isInternalSummaryMessage(message), true);
});

void test("keeps metadata-tagged summaries internal even when summary_locale is missing", () => {
  const message = {
    type: "human",
    content: "Stored summary without locale metadata",
    additional_kwargs: {
      internal_summary: true,
    },
  } as const;

  assert.equal(isInternalSummaryMessage(message), true);
});

void test("extractInternalSummaryContent returns metadata-tagged summary text", () => {
  const message = {
    type: "human",
    content: "  压缩后的上下文正文  ",
    additional_kwargs: {
      internal_summary: true,
    },
  } as const;

  assert.equal(extractInternalSummaryContent(message), "压缩后的上下文正文");
});

void test("extractInternalSummaryContent keeps legacy structured summaries compatible", () => {
  const message = {
    type: "human",
    content:
      "  Here is a summary of the conversation to date:\n\n- User greeted the assistant.  ",
  } as const;

  assert.equal(
    extractInternalSummaryContent(message),
    "Here is a summary of the conversation to date:\n\n- User greeted the assistant.",
  );
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

void test("groupMessages converts internal summary messages into a lightweight system item", () => {
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

  assert.deepEqual(groups, [
    { type: "system:internal-summary", count: 1 },
    { type: "human", count: 1 },
  ]);
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
