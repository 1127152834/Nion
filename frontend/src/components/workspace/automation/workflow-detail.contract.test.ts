import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation workspace exposes workflow surfaces", async () => {
  const tabsSource = await readFile(
    new URL("./automation-kind-tabs.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(tabsSource, /workflow/);
  assert.match(pageSource, /Workflow/);
  assert.match(pageSource, /value="workflow"/);
});

void test("workflow detail page shows steps pause state and resume action", async () => {
  const pageSource = await readFile(
    new URL("../app/workspace/automation/workflows/[job_id]/page.tsx", import.meta.url),
    "utf8",
  ).catch(async () =>
    readFile(
      new URL("../../../app/workspace/automation/workflows/[job_id]/page.tsx", import.meta.url),
      "utf8",
    ),
  );
  const detailSource = await readFile(
    new URL("./workflow-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /WorkflowDetailPage/);
  assert.match(detailSource, /Workflow steps/);
  assert.match(detailSource, /Resume workflow/);
  assert.match(detailSource, /resumePayload/);
  assert.match(detailSource, /Resume payload/);
  assert.match(detailSource, /Paused at step/);
  assert.match(detailSource, /Failed at step/);
  assert.match(detailSource, /attempts/);
  assert.match(detailSource, /step_results/);
  assert.match(detailSource, /failed_step_id/);
  assert.match(detailSource, /current_step_id/);
  assert.match(detailSource, /Export template/);
  assert.match(detailSource, /Save as template/);
  assert.match(detailSource, /router\.push/);
  assert.match(detailSource, /\/workspace\/automation\/templates\//);
  assert.match(detailSource, /exportTemplate\.mutateAsync/);
});
