import assert from "node:assert/strict";
import test from "node:test";

const { buildScheduleRequestFields } = await import(
  new URL("./schedule-definition.ts", import.meta.url).href
);

void test("converts weekly schedule definition into cron request fields", () => {
  const result = buildScheduleRequestFields({
    preset: "weekly",
    timezone: "Asia/Shanghai",
    timeOfDay: "09:30",
    weekdays: [1, 3, 5],
  });

  assert.equal(result.schedule_kind, "cron");
  assert.equal(result.schedule_value, "30 9 * * 1,3,5");
  assert.equal(result.schedule_preset, "weekly");
  assert.equal(result.schedule_timezone, "Asia/Shanghai");
  assert.deepEqual(result.schedule_metadata, {
    time_of_day: "09:30",
    weekdays: [1, 3, 5],
  });
});

void test("converts one-time schedules into once request fields", () => {
  const result = buildScheduleRequestFields({
    preset: "once",
    timezone: "Asia/Shanghai",
    runAt: "2026-04-03T12:00:00Z",
  });

  assert.equal(result.schedule_kind, "once");
  assert.equal(result.schedule_value, "2026-04-03T12:00:00Z");
  assert.deepEqual(result.schedule_metadata, {
    run_at: "2026-04-03T12:00:00Z",
  });
});
