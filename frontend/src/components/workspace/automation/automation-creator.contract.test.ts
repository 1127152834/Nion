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

void test("schedule builder uses a custom date-time picker instead of native datetime-local", async () => {
  const source = await readFile(
    new URL("./schedule-builder.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationDateTimePicker/);
  assert.doesNotMatch(source, /type="datetime-local"/);
});

void test("automation date-time picker guards against choosing past times", async () => {
  const source = await readFile(
    new URL("./automation-date-time-picker.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /isPastDateTime/);
  assert.match(source, /disabled=\{isPast\}/);
  assert.match(source, /minDate/);
});
