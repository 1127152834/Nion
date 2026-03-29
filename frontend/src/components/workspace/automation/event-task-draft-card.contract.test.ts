import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("event-task draft card can save a draft from chat", async () => {
  const cardSource = await readFile(
    new URL("./event-task-draft-card.tsx", import.meta.url),
    "utf8",
  );
  const listSource = await readFile(
    new URL("../messages/message-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(cardSource, /Save event task/);
  assert.match(cardSource, /useCreateAutomationJob/);
  assert.match(cardSource, /draft\.trigger_spec/);
  assert.match(listSource, /EventTaskDraftCard/);
  assert.match(listSource, /assistant:automation-draft/);
});
