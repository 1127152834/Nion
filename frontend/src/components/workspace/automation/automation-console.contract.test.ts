import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { AutomationRun } from "@/core/automation/types";

const { pickDefaultAutomationRunId } = await import(
  new URL("./automation-console-state.ts", import.meta.url).href
);

void test("automation page renders a single console shell instead of tab layout", async () => {
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /AutomationConsole/);
  assert.doesNotMatch(pageSource, /AutomationKindTabs/);
  assert.doesNotMatch(pageSource, /TabsContent/);
});

void test("automation console composes create list and results panels", async () => {
  const source = await readFile(
    new URL("./automation-console.tsx", import.meta.url),
    "utf8",
  );
  const createPanelSource = await readFile(
    new URL("./automation-create-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationCreatePanel[\s\S]*AutomationListPanel[\s\S]*AutomationResultsPanel[\s\S]*AutomationOverviewCards/);
  assert.match(source, /AutomationCreatePanel/);
  assert.match(source, /AutomationOverviewCards/);
  assert.match(source, /AutomationListPanel/);
  assert.match(source, /AutomationResultsPanel/);
  assert.doesNotMatch(createPanelSource, /AutomationOverviewCards/);
});

void test("results panel switches scheduled task runs into thread preview mode", async () => {
  const source = await readFile(
    new URL("./automation-results-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /selectedJob\.job_kind === "scheduled_task"/);
  assert.match(source, /AutomationRunPreview/);
  assert.match(source, /isolated_thread_id/);
});

void test("legacy reminder and scheduled task forms are removed from automation workspace", async () => {
  await assert.rejects(() => readFile(new URL("./reminder-form.tsx", import.meta.url), "utf8"));
  await assert.rejects(() => readFile(new URL("./scheduled-task-form.tsx", import.meta.url), "utf8"));
});

void test("defaults to latest succeeded run before falling back to latest run", () => {
  const runs: AutomationRun[] = [
    {
      id: "run-latest-failed",
      job_id: "job-1",
      started_at: "2026-04-02T12:00:00Z",
      finished_at: "2026-04-02T12:01:00Z",
      status: "failed",
      result_summary: "failed",
      output_artifacts: [],
      delivery_results: [],
      isolated_thread_id: null,
    },
    {
      id: "run-latest-succeeded",
      job_id: "job-1",
      started_at: "2026-04-02T13:00:00Z",
      finished_at: "2026-04-02T13:01:00Z",
      status: "succeeded",
      result_summary: "ok",
      output_artifacts: [],
      delivery_results: [],
      isolated_thread_id: null,
    },
    {
      id: "run-older-succeeded",
      job_id: "job-1",
      started_at: "2026-04-02T10:00:00Z",
      finished_at: "2026-04-02T10:01:00Z",
      status: "succeeded",
      result_summary: "older ok",
      output_artifacts: [],
      delivery_results: [],
      isolated_thread_id: null,
    },
  ];

  assert.equal(
    pickDefaultAutomationRunId([runs[0]!, runs[2]!, runs[1]!]),
    "run-latest-succeeded",
  );
  assert.equal(pickDefaultAutomationRunId([runs[0]!]), "run-latest-failed");
  assert.equal(pickDefaultAutomationRunId([]), null);
});
