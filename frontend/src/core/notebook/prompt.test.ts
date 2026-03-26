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
