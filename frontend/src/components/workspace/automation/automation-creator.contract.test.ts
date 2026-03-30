import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation page uses the shared automation creator", async () => {
  const source = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationCreator/);
  assert.doesNotMatch(source, /<ReminderForm/);
  assert.doesNotMatch(source, /<ScheduledTaskForm/);
});
