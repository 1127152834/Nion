import assert from "node:assert/strict";
import test from "node:test";

import { buildNotebookAssistPrompt } from "./prompt.ts";

void test("buildNotebookAssistPrompt creates a rewrite prompt with title and body", () => {
  const prompt = buildNotebookAssistPrompt(
    {
      title: "Roadmap",
      body: "Ship notebook v1.",
    },
    "rewrite",
  );

  assert.match(prompt, /Rewrite the following notebook note/);
  assert.match(prompt, /Title: Roadmap/);
  assert.match(prompt, /Ship notebook v1\./);
});

void test("buildNotebookAssistPrompt can prioritize the current selection for rewrite", () => {
  const prompt = buildNotebookAssistPrompt(
    {
      title: "Roadmap",
      body: "Ship notebook v1.\nThen polish the release notes.",
    },
    "rewrite",
    {
      selection: {
        start: 0,
        end: 17,
        text: "Ship notebook v1.",
      },
    },
  );

  assert.match(prompt, /Use the selected excerpt as the primary scope/);
  assert.match(prompt, /Selected excerpt:\nShip notebook v1\./);
  assert.match(prompt, /Full note for reference/);
});
