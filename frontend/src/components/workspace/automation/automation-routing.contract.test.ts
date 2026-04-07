import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation app route exposes reminders and tasks subpages", async () => {
  const remindersPage = await readFile(
    new URL("../../../app/workspace/automation/reminders/page.tsx", import.meta.url),
    "utf8",
  );
  const reminderDetailPage = await readFile(
    new URL("../../../app/workspace/automation/reminders/[jobId]/page.tsx", import.meta.url),
    "utf8",
  );
  const tasksPage = await readFile(
    new URL("../../../app/workspace/automation/tasks/page.tsx", import.meta.url),
    "utf8",
  );
  const taskDetailPage = await readFile(
    new URL("../../../app/workspace/automation/tasks/[jobId]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(remindersPage, /AutomationJobListPage/);
  assert.match(reminderDetailPage, /AutomationJobDetailPage/);
  assert.match(tasksPage, /AutomationJobListPage/);
  assert.match(taskDetailPage, /AutomationJobDetailPage/);
});

void test("home page routes to reminder and task modules instead of single-console shells", async () => {
  const pageSource = await readFile(new URL("./automation-page.tsx", import.meta.url), "utf8");
  const homeSource = await readFile(new URL("./automation-home-page.tsx", import.meta.url), "utf8");

  assert.match(pageSource, /AutomationHomePage/);
  assert.doesNotMatch(pageSource, /AutomationConsole/);
  assert.match(homeSource, /pathOfAutomationReminders/);
  assert.match(homeSource, /pathOfAutomationTasks/);
  assert.match(homeSource, /flex items-center justify-between border-b px-6 py-4/);
  assert.match(homeSource, /Button asChild/);
  assert.match(homeSource, /新建定时任务/);
  assert.match(homeSource, /Modules/);
  assert.match(homeSource, /space-y-4/);
  assert.match(homeSource, /rounded-\[2rem\]/);
  assert.match(homeSource, /text-\[1\.7rem\]/);
});

void test("list pages use modal creation flows and detail navigation", async () => {
  const source = await readFile(new URL("./automation-job-list-page.tsx", import.meta.url), "utf8");

  assert.match(source, /AutomationReminderDialog|AutomationTaskDialog/);
  assert.match(source, /pathOfAutomationReminderDetail|pathOfAutomationTaskDetail/);
  assert.match(source, /进入详情/);
});

void test("detail page separates reminder history from task thread preview", async () => {
  const source = await readFile(new URL("./automation-job-detail-page.tsx", import.meta.url), "utf8");

  assert.match(source, /job\.job_kind === "scheduled_task"/);
  assert.match(source, /AutomationHistorySection/);
  assert.match(source, /AutomationRunPreview/);
  assert.match(source, /打开完整线程/);
});
