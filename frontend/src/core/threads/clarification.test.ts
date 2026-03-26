import assert from "node:assert/strict";
import test from "node:test";

import type { Message } from "./types.ts";
import { derivePendingClarification } from "./clarification.ts";

void test("returns the latest unresolved clarification with options", () => {
  const messages: Message[] = [
    { type: "human", id: "h-1", content: "hello" },
    {
      type: "tool",
      id: "tool-1",
      name: "ask_clarification",
      tool_call_id: "tc-1",
      content: "Which one?",
      additional_kwargs: {
        clarification: {
          question: "Which one?",
          clarification_type: "approach_choice",
          context: "Need a choice before proceeding",
          options: ["A", "B"],
        },
      },
    },
  ];

  assert.deepEqual(derivePendingClarification(messages), {
    toolMessageId: "tool-1",
    toolCallId: "tc-1",
    question: "Which one?",
    context: "Need a choice before proceeding",
    clarificationType: "approach_choice",
    options: ["A", "B"],
  });
});

void test("returns null once a later human message exists", () => {
  const messages: Message[] = [
    {
      type: "tool",
      id: "tool-1",
      name: "ask_clarification",
      tool_call_id: "tc-1",
      content: "Which one?",
      additional_kwargs: {
        clarification: {
          question: "Which one?",
          clarification_type: "approach_choice",
          options: ["A", "B"],
        },
      },
    },
    { type: "human", id: "h-2", content: "A" },
  ];

  assert.equal(derivePendingClarification(messages), null);
});

void test("prefers the newest unresolved clarification", () => {
  const messages: Message[] = [
    {
      type: "tool",
      id: "tool-1",
      name: "ask_clarification",
      tool_call_id: "tc-1",
      content: "First?",
      additional_kwargs: {
        clarification: {
          question: "First?",
          clarification_type: "approach_choice",
          options: ["A", "B"],
        },
      },
    },
    { type: "human", id: "h-1", content: "A" },
    {
      type: "tool",
      id: "tool-2",
      name: "ask_clarification",
      tool_call_id: "tc-2",
      content: "Second?",
      additional_kwargs: {
        clarification: {
          question: "Second?",
          clarification_type: "suggestion",
          options: ["X", "Y"],
        },
      },
    },
  ];

  assert.deepEqual(derivePendingClarification(messages), {
    toolMessageId: "tool-2",
    toolCallId: "tc-2",
    question: "Second?",
    clarificationType: "suggestion",
    options: ["X", "Y"],
  });
});

void test("ignores clarification messages without options", () => {
  const messages: Message[] = [
    {
      type: "tool",
      id: "tool-1",
      name: "ask_clarification",
      tool_call_id: "tc-1",
      content: "Tell me more",
      additional_kwargs: {
        clarification: {
          question: "Tell me more",
          clarification_type: "missing_info",
        },
      },
    },
  ];

  assert.equal(derivePendingClarification(messages), null);
});
