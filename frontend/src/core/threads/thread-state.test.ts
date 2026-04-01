import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeThreadMessages,
  reconcileLoadedThreadMessages,
} from "./thread-state.ts";
import type { Message } from "./types.ts";

const oldThreadMessages: Message[] = [
  {
    id: "old-human",
    type: "human",
    content: [{ type: "text", text: "旧线程消息" }],
  },
  {
    id: "old-ai",
    type: "ai",
    content: [{ type: "text", text: "旧线程回复" }],
  },
];

void test("reconcileLoadedThreadMessages replaces old messages when hydrating a different thread", () => {
  const nextMessages: Message[] = [
    {
      id: "new-human",
      type: "human",
      content: [{ type: "text", text: "新线程消息" }],
    },
  ];

  assert.deepEqual(
    reconcileLoadedThreadMessages({
      currentStateThreadId: "thread-old",
      loadedThreadId: "thread-new",
      existingMessages: oldThreadMessages,
      incomingMessages: nextMessages,
    }),
    nextMessages,
  );
});

void test("reconcileLoadedThreadMessages still merges incremental snapshots for the same thread", () => {
  const nextMessages: Message[] = [
    {
      id: "old-human",
      type: "human",
      content: [{ type: "text", text: "旧线程消息（已刷新）" }],
    },
    {
      id: "new-ai",
      type: "ai",
      content: [{ type: "text", text: "新增回复" }],
    },
  ];

  assert.deepEqual(
    reconcileLoadedThreadMessages({
      currentStateThreadId: "thread-old",
      loadedThreadId: "thread-old",
      existingMessages: oldThreadMessages,
      incomingMessages: nextMessages,
    }),
    [
      {
        id: "old-human",
        type: "human",
        content: [{ type: "text", text: "旧线程消息（已刷新）" }],
      },
      oldThreadMessages[1]!,
      nextMessages[1]!,
    ],
  );
});

void test("mergeThreadMessages replaces matching ids and appends new messages", () => {
  const incomingMessages: Message[] = [
    {
      id: "old-ai",
      type: "ai",
      content: [{ type: "text", text: "旧线程回复（已刷新）" }],
    },
    {
      id: "new-tool",
      type: "tool",
      name: "search",
      content: [{ type: "text", text: "工具输出" }],
    },
  ];

  assert.deepEqual(mergeThreadMessages(oldThreadMessages, incomingMessages), [
    oldThreadMessages[0]!,
    {
      id: "old-ai",
      type: "ai",
      content: [{ type: "text", text: "旧线程回复（已刷新）" }],
    },
    incomingMessages[1]!,
  ]);
});
