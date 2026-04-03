import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation workspace uses multi-page IA instead of a single console shell", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /AutomationHomePage/);
  assert.doesNotMatch(pageSource, /AutomationConsole/);
  assert.doesNotMatch(pageSource, /AutomationListPanel/);
  assert.doesNotMatch(pageSource, /AutomationResultsPanel/);
});

void test("automation routes expose dedicated reminders and scheduled task pages", async () => {
  const routesSource = await readFile(
    new URL("../../../core/navigation/desktop-routes.ts", import.meta.url),
    "utf8",
  );

  assert.match(routesSource, /pathOfAutomationReminders/);
  assert.match(routesSource, /pathOfAutomationReminderDetail/);
  assert.match(routesSource, /pathOfAutomationTasks/);
  assert.match(routesSource, /pathOfAutomationTaskDetail/);
  assert.ok(routesSource.includes('"/workspace/automation/reminders"'));
  assert.ok(routesSource.includes('"/workspace/automation/tasks"'));
});

void test("automation home page links to reminder and scheduled task modules", async () => {
  const homeSource = await readFile(
    new URL("./automation-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(homeSource, /pathOfAutomationReminders/);
  assert.match(homeSource, /pathOfAutomationTasks/);
  assert.match(homeSource, /提醒事项/);
  assert.match(homeSource, /定时任务/);
});

void test("list page includes add dialog trigger and navigable job items", async () => {
  const source = await readFile(
    new URL("./automation-job-list-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationReminderDialog|AutomationTaskDialog/);
  assert.match(source, /pathOfAutomationReminderDetail|pathOfAutomationTaskDetail/);
  assert.match(source, /添加/);
  assert.match(source, /进入详情/);
});

void test("scheduled task detail shows history and linked thread preview entry", async () => {
  const source = await readFile(
    new URL("./automation-job-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationHistorySection/);
  assert.match(source, /AutomationRunPreview/);
  assert.match(source, /打开完整线程/);
  assert.match(source, /job\.job_kind === "scheduled_task"/);
});
