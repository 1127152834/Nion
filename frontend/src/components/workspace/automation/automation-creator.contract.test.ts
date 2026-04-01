import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation console uses the shared automation creator", async () => {
  const consoleSource = await readFile(new URL("./automation-console.tsx", import.meta.url), "utf8");
  const createPanelSource = await readFile(
    new URL("./automation-create-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(consoleSource, /AutomationCreatePanel/);
  assert.match(createPanelSource, /AutomationCreator/);
});

void test("shared automation creator keeps schedule builder and drops advanced controls", async () => {
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
  assert.doesNotMatch(creatorSource, /advancedOptions/);
  assert.doesNotMatch(creatorSource, /deliveryMode/);
  assert.doesNotMatch(creatorSource, /skillsText/);
  assert.match(scheduleBuilderSource, /structured-config/);
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
