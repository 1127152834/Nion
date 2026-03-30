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

void test("shared automation creator composes schedule builder and preview card", async () => {
  const creatorSource = await readFile(
    new URL("./automation-creator.tsx", import.meta.url),
    "utf8",
  );
  const scheduleBuilderSource = await readFile(
    new URL("./schedule-builder.tsx", import.meta.url),
    "utf8",
  );

  assert.match(creatorSource, /ScheduleBuilder/);
  assert.match(creatorSource, /AutomationPreviewCard/);
  assert.match(scheduleBuilderSource, /cadenceOptions\.interval/);
  assert.match(scheduleBuilderSource, /cadenceOptions\.custom/);
});
