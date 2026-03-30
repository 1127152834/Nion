import assert from "node:assert/strict";
import test from "node:test";

const { buildAutomationDraftRequest } = await import(
  new URL("./draft-builder.ts", import.meta.url).href
);

void test("builds a one-time reminder request from schedule definition", () => {
  const draft = buildAutomationDraftRequest({
    kind: "reminder",
    name: "报销截止提醒",
    prompt: "提醒我今天下班前提交报销",
    schedule: {
      preset: "once",
      timezone: "Asia/Shanghai",
      runAt: "2026-04-03T12:00:00Z",
    },
  });

  assert.equal(draft.schedule_kind, "once");
  assert.equal(draft.schedule_value, "2026-04-03T12:00:00Z");
  assert.deepEqual(draft.schedule_metadata, {
    run_at: "2026-04-03T12:00:00Z",
  });
});

void test("builds a weekday reminder request from simple form inputs", () => {
  const draft = buildAutomationDraftRequest({
    kind: "reminder",
    name: "晚间复盘",
    prompt: "提醒我回顾今天最重要的三件事",
    schedule: {
      preset: "weekdays",
      timezone: "Asia/Shanghai",
      timeOfDay: "21:00",
    },
  });

  assert.equal(draft.job_kind, "reminder");
  assert.equal(draft.schedule_preset, "weekdays");
  assert.equal(draft.schedule_kind, "cron");
  assert.equal(draft.schedule_value, "0 21 * * 1-5");
  assert.equal(draft.schedule_timezone, "Asia/Shanghai");
});

void test("builds a weekly scheduled task request with advanced fields", () => {
  const draft = buildAutomationDraftRequest({
    kind: "scheduled_task",
    name: "Weekly review",
    prompt: "Summarize the week and prepare next actions",
    schedule: {
      preset: "weekly",
      timezone: "UTC",
      timeOfDay: "09:30",
      weekdays: [1],
    },
    deliveryMode: "thread",
    skills: ["memory", "calendar"],
  });

  assert.equal(draft.schedule_value, "30 9 * * 1");
  assert.equal(draft.delivery_mode, "thread");
  assert.deepEqual(draft.skills, ["memory", "calendar"]);
});
